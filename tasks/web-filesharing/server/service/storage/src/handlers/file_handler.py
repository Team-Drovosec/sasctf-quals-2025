import cgi
import os
import json
import uuid
from http.server import BaseHTTPRequestHandler

from utils.helpers import (
    get_file_size,
    get_content_type,
    get_filename_and_encoding,
    save_file,
    get_file_info,
    validate_upload_token
)


class FileUploadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            file_uuid = os.path.basename(self.path)
            try:
                uuid_obj = uuid.UUID(file_uuid)
            except ValueError:
                self.send_error(404, "File not found")
                return
            
            file_content, file_size, encoding, filename, content_type = get_file_info(file_uuid)

            self.send_response(200)
            self.send_header('Content-Disposition', 'attachment')
            self.send_header('X-File-Name', filename)
            self.send_header('X-File-Encoding', encoding)
            self.send_header('X-File-Content-Type', content_type)
            self.send_header('X-File-Size', file_size)
            self.end_headers()
            self.wfile.write(file_content)

        except FileNotFoundError:
            self.send_error(404, "File not found")
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        try:
            ctype, pdict = cgi.parse_header(self.headers.get('Content-Type'))

            if ctype != 'multipart/form-data':
                self.send_error(400, "Content-Type must be multipart/form-data")
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'},
                keep_blank_values=True
            )

            if "upload" not in form:
                self.send_error(400, "No file uploaded")
                return
            
            if 'upload_token' not in form:
                self.send_error(403, "Missing upload token")
                return
            
            upload_token = form['upload_token'].value
            if not validate_upload_token(upload_token):
                self.send_error(403, "Invalid upload token")
                return

            uploaded_file = form['upload']
            file_content = uploaded_file.file.read()

            file_size = get_file_size(uploaded_file)
            if int(file_size) >= 2 * 1024 * 1024:
                self.send_error(413, "File Too Large")
                return

            disposition = uploaded_file.headers.get('Content-Disposition', '')
            filename, encoding = get_filename_and_encoding(disposition)
            if not filename:
                self.send_error(400, "Missing filename in Content-Disposition")
                return

            file_content_type = get_content_type(uploaded_file)
            if file_content_type not in {'image/png', 'image/jpeg', 'text/plain'}:
                self.send_error(415, "Unsupported Media Type")
                return

            if isinstance(file_content, str):
                file_content = file_content.encode('utf-8')

            file_uuid = save_file(
                file_content,
                file_size,
                filename,
                encoding,
                file_content_type
            )

            response = {
                'status': 'success',
                'message': 'File uploaded successfully!',
                'filename': filename,
                'uuid': file_uuid
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_error(500, str(e)) 