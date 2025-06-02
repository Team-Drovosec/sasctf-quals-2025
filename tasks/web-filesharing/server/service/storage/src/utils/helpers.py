import os
import uuid
import re
import shutil
import hmac
import time
from typing import Tuple, Optional

UPLOAD_DIR = "uploads"
UPLOAD_KEY = os.environ.get('UPLOAD_KEY')

def validate_upload_token(token) -> bool:
    try:
        user_id, expire_timestamp, token_hmac = token.split('.')
        expire_timestamp = int(expire_timestamp)

        if time.time() > expire_timestamp:
            return False

        message = f'tk{user_id}{expire_timestamp}'
        expected_hmac = hmac.new(
            UPLOAD_KEY.encode(),
            message.encode(),
            'sha256'
        ).hexdigest()
        
        return hmac.compare_digest(token_hmac, expected_hmac)
    except Exception:
        return False


def get_file_size(uploaded_file) -> str:
    try:
        uploaded_file.file.seek(0, os.SEEK_END)
        size = uploaded_file.file.tell()
        uploaded_file.file.seek(0)
        return str(size)
    except Exception:
        return 0

def get_content_type(uploaded_file) -> str:
    return getattr(uploaded_file, "type", None) or "application/octet-stream"

def get_filename_and_encoding(disposition: str) -> Tuple[Optional[str], str]:
    try:
        if not disposition:
            return
        match = re.search(r"filename\*=([^']+)'[^']*'(.+)", disposition)
        if match:
            encoding, filename = match.groups()
            if encoding:
                return filename, encoding.lower()
            return filename, 'utf-8'
        
        match = re.search(r'filename="([^"]+)"', disposition)
        if match:
            return match.group(1), 'utf-8'
        return None, None
    except Exception:
        return None, None

def save_file(file_content: bytes, file_size: str, filename: str, encoding: str, content_type: str) -> Tuple[str, str]:
    try:
        file_uuid = str(uuid.uuid4())
        file_dir = os.path.join(UPLOAD_DIR, file_uuid)
        os.makedirs(file_dir, exist_ok=True)

        file_path = os.path.join(file_dir, file_uuid)
        with open(file_path, 'wb') as f:
            f.write(file_content)

        metadata = {
            "size": file_size,
            "name": filename,
            "encoding": encoding,
            "content_type": content_type,
        }

        for key, value in metadata.items():
            metadata_path = os.path.join(file_dir, f"{file_uuid}.{key}")
            with open(metadata_path, 'wb') as f:
                f.write(value.encode() if isinstance(value, str) else value)

        return file_uuid
    except Exception as e:
        raise

def get_file_info(file_uuid: str) -> Tuple[bytes, str, str, bytes, str]:
    try:
        file_path = os.path.join(UPLOAD_DIR, file_uuid)

        metadata_paths = {
            "name": os.path.join(file_path, f"{file_uuid}.name"),
            "size": os.path.join(file_path, f"{file_uuid}.size"),
            "encoding": os.path.join(file_path, f"{file_uuid}.encoding"),
            "content_type": os.path.join(file_path, f"{file_uuid}.content_type"),
        }

        if not all(os.path.exists(path) for path in metadata_paths.values()):
            raise FileNotFoundError("File not found")

        with open(metadata_paths["encoding"], 'r') as f:
            encoding = f.read()
        with open(metadata_paths["name"], 'r', encoding=encoding) as f:
            filename = f.read()
        with open(metadata_paths["size"], 'r', encoding=encoding) as f:
            file_size = f.read()
        with open(metadata_paths["content_type"], 'r', encoding=encoding) as f:
            content_type = f.read()

        file_dir = os.path.join(file_path, file_uuid)
        with open(file_dir, 'rb') as f:
            file_content = f.read()

        return file_content, file_size, encoding, filename, content_type
    except FileNotFoundError:
        raise FileNotFoundError('File not found')
    except Exception:
        raise Exception('Server error')

def clean_uploads():
    try:
        MAX_FILES = 10

        directories = [d for d in os.listdir(UPLOAD_DIR) if os.path.isdir(os.path.join(UPLOAD_DIR, d))]

        directories.sort(key=lambda d: os.path.getmtime(os.path.join(UPLOAD_DIR, d)))

        if len(directories) > MAX_FILES:
            dirs_to_remove = directories[:len(directories) - MAX_FILES]

            for directory in dirs_to_remove:
                dir_path = os.path.join(UPLOAD_DIR, directory)
                shutil.rmtree(dir_path, ignore_errors=True)
    except Exception:
        return
