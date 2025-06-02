import os
import json
import time
import traceback
import random
import string
from typing import Tuple
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions

gigaupload_host = os.getenv('GIGAUPLOAD_HOST', '')
storage_host = os.getenv('STORAGE_HOST', '')

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


def load_credentials() -> dict:
    with open('credentials.json', 'r') as f:
        return json.load(f)
    
def save_credentials(credentials: dict) -> None:
    with open('credentials.json', 'w') as f:
        return json.dump(credentials, f)
    

def randstr(length: int) -> str:
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    

def register(driver, username = None, password = None) -> Tuple[str, str]:
    if username is None:
        username = randstr(10)
    if password is None:
        password = randstr(16)
    
    try:
        driver.get(f'{gigaupload_host}/register')

        form = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "registerForm"))
        )

        username_field = driver.find_element(By.ID, "username")
        password_field = driver.find_element(By.ID, "password")
        username_field.send_keys(username)
        password_field.send_keys(password)
        form.submit()
        
        WebDriverWait(driver, 10).until(
            lambda x: x.current_url.endswith('/login') or 
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "success-message"))(x)
        )
        
        return username, password
        
    except Exception as e:
        raise Exception(f"Registration failed: {str(e)}")


def login(driver, credentials: dict):
    try:
        driver.get(f'{gigaupload_host}/login')
        
        form = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "loginForm"))
        )
        
        username_field = driver.find_element(By.ID, "username")
        password_field = driver.find_element(By.ID, "password")
        
        username_field.send_keys(credentials['username'])
        password_field.send_keys(credentials['password'])
        
        form.submit()
        
        WebDriverWait(driver, 10).until(
            lambda x: x.current_url.endswith('/upload') or 
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "success-message"))(x)
        )
        
        return True
        
    except Exception as e:
        return False


def upload_flag(driver):
    try:
        driver.get(f'{gigaupload_host}/upload')
        
        form = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "uploadForm"))
        )
        
        flag_path = '/app/flag.txt'
        
        file_input = driver.find_element(By.ID, "file")
        file_input.send_keys(flag_path)
        form.submit()
        
        success_message = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "success-message"))
        )
        
        message_text = success_message.get_attribute('innerHTML')
        file_id = message_text.split('UUID: ')[1].split('.')[0].strip()

        return file_id
        
    except Exception as e:
        raise Exception(f"Flag upload failed: {str(e)}")


def check_file(driver, file_id):
    try:
        driver.get(f'{storage_host}/{file_id}')
        time.sleep(2)
        return 'Error code' not in driver.page_source
        
    except Exception as e:
        raise Exception(f"File check failed: {str(e)}")
    


def init() -> None:
    import chromedriver_autoinstaller as ca
    ca.install()

    driver = run_chrome()
    username, password = register(driver)
    login(driver, {'username': username, 'password': password})
    file_id = upload_flag(driver)

    save_credentials({'username': username, 'password': password, 'file_id': file_id})


def visit(url: str) -> Tuple[bool, str]:
    if not url.lower().startswith("https://"):
        return False, "No way I'm visiting an insecure website! They are listening!"
    
    driver = run_chrome()
    credentials = load_credentials()

    try:
        if not check_file(driver, credentials['file_id']):
            res = login(driver, credentials)
            if not res:
                register(driver, credentials['username'], credentials['password'])
                login(driver, credentials)
            credentials['file_id'] = upload_flag(driver)
            save_credentials(credentials)

        driver.get(url)
        time.sleep(5)
    except Exception:
        return False, f"Bot failed:\n{traceback.format_exc()}"
    finally:
        driver.quit()
    
    return True, "Bot job has finished successfully!"


if __name__ == "__main__":
    init()