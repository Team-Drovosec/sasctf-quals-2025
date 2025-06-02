import os
import time
import traceback
import json
from typing import Tuple
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


def run_chrome():
    chrome_options = Options()
    chrome_options.binary_location = "/usr/bin/chromium"
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-setuid-sandbox")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-gpu")
    chrome_options.add_argument("--disable-default-apps")
    chrome_options.add_argument("--disable-translate")
    chrome_options.add_argument("--disable-device-discovery-notifications")
    chrome_options.add_argument("--disable-software-rasterizer")
    chrome_options.add_argument("--disable-xss-auditor")
    chrome_options.add_argument("--user-data-dir=/home/bot/data/")
    chrome_options.set_capability("acceptInsecureCerts", True)

    return webdriver.Chrome(options=chrome_options)


def set_breakpoint(url: str, line: int):
    driver = run_chrome()
    driver.get('devtools://devtools')
    time.sleep(1)
    driver.execute_cdp_cmd("DOMStorage.enable", {})
    driver.execute_cdp_cmd("DOMStorage.setDOMStorageItem", {
      "storageId": {
        "securityOrigin": "devtools://devtools",
        "isLocalStorage": True
      },
      "key": "breakpoints",
      "value": json.dumps([{
          "url": url,
          "lineNumber": line,
          "columnNumber": 0,
          "condition": "",
          "enabled": True,
          "resourceTypeName": "script",
          "isLogpoint": False
        }])
    })
    time.sleep(1)
    driver.quit()



def init():
    import chromedriver_autoinstaller as ca
    ca.install()

    url = os.environ["SECRET_URL"]
    set_breakpoint(url, 10)


def visit(url: str) -> Tuple[bool, str]:
    if url.lower().startswith("file"):
        return False, "Nah, not visiting."
    
    driver = run_chrome()

    try:
        driver.get(url)
        time.sleep(5)
    except Exception:
        return False, f"Bot failed:\n{traceback.format_exc()}"
    finally:
        driver.quit()
    
    return True, "Bot job has finished successfully!"


if __name__ == "__main__":
    init()