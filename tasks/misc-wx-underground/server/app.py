from flask import Flask, request, send_file
import subprocess

app = Flask(__name__)

# Inspired by and derived from https://ctftime.org/task/30126
@app.route('/write', methods=['POST'])
def write():
    filename = request.args.get('filename', '')
    content = request.get_data()
    try:
        with open(filename, 'wb') as f:
            f.write(content)
            f.flush()
        return 'OK'
    except Exception as e:
        return str(e), 400

@app.route('/exec')
def execute():
    cmd = request.args.get('cmd', '')
    if len(cmd) > 4:
        return 'Command too long', 400
    if "|" in cmd:
        return 'No pipi racing this time :(', 400
    try:
        output = subprocess.check_output(cmd, shell=True)
        return output
    except Exception as e:
        return str(e), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7331)
