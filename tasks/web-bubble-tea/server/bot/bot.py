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

SERVICE_HOST = os.getenv('SERVICE_HOST', 'https://bubble-tea.task.sasc.tf')

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


def register(driver) -> Tuple[str, str]:
    username = randstr(10)
    password = randstr(16)

    try:
        driver.get(SERVICE_HOST)

        form = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "auth-form"))
        )
        swap_form_btn = driver.find_element(By.ID, "swap")
        swap_form_btn.click()

        username_field = driver.find_element(By.ID, "username-field")
        password_field = driver.find_element(By.ID, "password-field")

        username_field.send_keys(username)
        password_field.send_keys(password)
        form.submit()

        create_post_btn = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "create-post-button"))
        )
        create_post_btn.click()

        with open('/app/flag.txt', 'r') as f:
            flag = f.read().strip()

        post_text_field = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "post-textarea"))
        )
        time.sleep(0.5)
        post_text_field.clear()
        post_text_field.send_keys(flag)
        
        private_checkbox = driver.find_element(By.CLASS_NAME, "private-checkbox")
        private_checkbox.click()

        publish_btn = driver.find_element(By.CLASS_NAME, "publish-btn")
        publish_btn.click()
        time.sleep(0.5)

        return username, password

    except Exception as e:
        raise Exception(f"Registration failed: {str(e)}")


def login(driver, credentials: dict):
    try:
        driver.get(SERVICE_HOST)
        time.sleep(0.5)
        if driver.current_url.endswith("/dashboard"):
            return True

        form = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "auth-form"))
        )

        username_field = driver.find_element(By.ID, "username-field")
        password_field = driver.find_element(By.ID, "password-field")

        username_field.send_keys(credentials['username'])
        password_field.send_keys(credentials['password'])

        form.submit()

        WebDriverWait(driver, 10).until(
            lambda x: x.current_url.endswith('/dashboard') or
                      expected_conditions.presence_of_element_located((By.CLASS_NAME, "posts-container"))(x)
        )

        return True

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return False


def write_opinion(driver) -> None:
    try:
        form = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "comment-form"))
        )

        author_username = driver.find_element(By.CLASS_NAME, "post-author")
        opinions = [
            "Post so good, I laughed, cried! I like it!"
            "Brilliant! My cat nodded in approval. True story.",
            "Read it twice. Still unsure if genius or witchcraft.",
            "10/10—would trade my snacks for more posts.",
            "Laughed so hard, my coffee escaped my nose. Thanks!",
            "My plants grew happier after I read this. Magic?",
            "Post inspired me… to procrastinate after sharing it everywhere.",
            "More addictive than cat videos. Zero regrets. Send help.",
            "If this post were a person, I’d propose. Immediately.",
        ]

        text_input = driver.find_element(By.CLASS_NAME, "comment-textarea")
        text_input.send_keys(f"Dear {author_username.text},\n {random.choice(opinions)}")
        form.submit()
        time.sleep(0.5)

        back_btn = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "back-button"))
        )
        back_btn.click()

        create_button_post = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "create-post-button"))
        )
        create_button_post.click()

        post_text_field = WebDriverWait(driver, 10).until(
            expected_conditions.presence_of_element_located((By.CLASS_NAME, "post-textarea"))
        )
        posts = [
            "Coolest humans online!",
            "Creativity overload—love this crowd!",
            "Witty minds, golden hearts!",
            "Best virtual squad ever!"
        ]
        time.sleep(0.5)
        post_text_field.clear()
        post_text_field.send_keys(random.choice(posts))

        publish_btn = driver.find_element(By.CLASS_NAME, "publish-btn")
        publish_btn.click()
    except Exception as e:
        raise Exception(f"Opinion not posted: {str(e)}")


def init() -> None:
    import chromedriver_autoinstaller as ca
    ca.install()

    driver = run_chrome()
    username, password = register(driver)

    save_credentials({'username': username, 'password': password})


def visit(url: str) -> Tuple[bool, str]:
    if not url.lower().startswith(f"{SERVICE_HOST}/post/"):
        return False, "No way I'm visiting that, only posts!"

    driver = run_chrome()
    credentials = load_credentials()

    try:
        if not login(driver, credentials):
            register(driver)
            save_credentials(credentials)

        driver.get(url)
        write_opinion(driver)
        time.sleep(0.5)
    except Exception:
        return False, f"Bot failed:\n{traceback.format_exc()}"
    finally:
        driver.quit()

    return True, "Bot job has finished successfully!"


if __name__ == "__main__":
    init()
