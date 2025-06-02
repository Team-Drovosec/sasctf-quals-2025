import asyncio
import os
import time
import shutil
from http.server import HTTPServer

from handlers.file_handler import FileUploadHandler

def run_server(port=4080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, FileUploadHandler)

    print(f"Storage server started on port {port}", flush=True)
    httpd.serve_forever()


async def hoover_job() -> None:
    print("[HOOVER] Starting hoover job", flush=True)
    while True:
        try:
            cutoff = time.time() - 900
            for filename in os.listdir('uploads'):
                file_path = os.path.join('uploads', filename)

                if not os.path.isdir(file_path):
                    continue

                file_mtime = os.path.getmtime(file_path)
                if file_mtime < cutoff:
                    shutil.rmtree(file_path, ignore_errors=True)
                    print(f"[HOOVER] Deleted: {file_path}", flush=True)
            await asyncio.sleep(30)
        except:
            pass

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(hoover_job())
    loop.run_in_executor(None, run_server)
    loop.run_forever()