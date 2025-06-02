import asyncio
import concurrent.futures
from aiohttp import web
from urllib.parse import urlparse

from bot import visit


executor = concurrent.futures.ProcessPoolExecutor(max_workers=1)

with open("static/index.html") as f:
    home_html = f.read()


def validate_url(url: str):
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except AttributeError:
        return False


async def home_handler(request: web.Request) -> web.Response:
    return web.Response(text=home_html, content_type="text/html")


async def bot_handler(request: web.Request) -> web.Response:
    try:
        data = await request.json()
        url = data.get("url", None)
    except Exception:
        return web.json_response({"error": "Malformed params"})
    
    if type(url) is not str or not validate_url(url):
        return web.json_response({"error": "URL is invalid"})
    
    print(f"[*] Running bot job for url {url}", flush=True)
    
    loop = asyncio.get_running_loop()
    result, message = await loop.run_in_executor(executor, visit, url)
    print("[*]", message, flush=True)

    return web.json_response({"result": "ok"} if result else {"error": "Failed to visit the given URL"})


if __name__ == "__main__":
    app = web.Application()
    app.router.add_get("/", home_handler)
    app.router.add_post("/review", bot_handler)
    web.run_app(app, host="0.0.0.0", port=80)