import ast
import hashlib
import json
import queue
import secrets
import socket
import threading
import time

from ecdsa.curves import NIST256p
from ecdsa.ellipticcurve import Point, PointJacobi

curve = NIST256p
gen = curve.generator
p = gen.order()


def point2bytes(P):
    return P.to_bytes()


def hash_func(Rp, m):
    if isinstance(m, str):
        m = m.encode()
    return (
        int.from_bytes(hashlib.sha256(point2bytes(Rp) + m).digest(), byteorder="big")
        % p
    )


class SocketReader(threading.Thread):
    def __init__(self, sock):
        super().__init__(daemon=True)
        self.sock = sock
        self.response_queue = queue.Queue()
        self.running = True

    def run(self):
        while self.running:
            try:
                self.sock.setblocking(0)
                try:
                    data = self.sock.recv(65536)
                    if not data:
                        time.sleep(0.1)
                        continue
                except socket.error:
                    time.sleep(0.1)
                    continue

                message = data.decode()
                print(f"[*] Received from server: {message}")

                try:
                    response = json.loads(message)
                    self.response_queue.put(response)
                except json.JSONDecodeError:
                    pass

            except Exception as e:
                print(f"[!] Socket reader error: {e}")
                if not self.running:
                    break
                time.sleep(0.1)

    def stop(self):
        self.running = False

    def get_response(self, timeout=10):
        try:
            return self.response_queue.get(timeout=timeout)
        except queue.Empty:
            return None


class BlindClient:
    def __init__(self, host="localhost", port=1337):
        self.host = host
        self.port = port
        self.sock = None
        self.Q = None  # Server's public key
        self.reader = None

    def connect(self):
        try:
            self.sock = socket.socket()
            self.sock.connect((self.host, self.port))
            print(f"[+] Connected to server at {self.host}:{self.port}")

            self.reader = SocketReader(self.sock)
            self.reader.start()

            self.sock.sendall(json.dumps({"cmd": "GETKEY"}).encode())
            print("[*] Sent: {'cmd': 'GETKEY'}")

            response = self.reader.get_response()
            if not response or "Q" not in response:
                print(
                    f"[-] Unexpected or no response from server when getting key: {response}"
                )
                return False

            try:
                self.Q = PointJacobi.from_affine(
                    Point(curve.curve, response["Q"][0], response["Q"][1])
                )
                print("[+] Received server's public key")
                return True
            except Exception as e:
                print(f"[-] Error processing server's public key: {e}")
                return False
        except Exception as e:
            print(f"[-] Connection error: {e}")
            return False

    def reset_server(self):
        if not self.sock or not self.reader:
            print("[-] Not connected to server. Use 'connect' command first.")
            return False

        try:
            print("[*] Resetting server state...")
            self.sock.sendall(json.dumps({"cmd": "RESET"}).encode())
            print("[*] Sent: {'cmd': 'RESET'}")

            response = self.reader.get_response()
            if not response or "status" not in response:
                print(
                    f"[-] Unexpected or no response from server when resetting: {response}"
                )
                return False

            if response["status"] == "ok":
                print("[+] Server reset successful")
                self.sock.sendall(json.dumps({"cmd": "GETKEY"}).encode())
                print("[*] Sent: {'cmd': 'GETKEY'}")

                response = self.reader.get_response()
                if not response or "Q" not in response:
                    print(
                        f"[-] Unexpected or no response from server when getting new key: {response}"
                    )
                    return False

                try:
                    self.Q = PointJacobi.from_affine(
                        Point(curve.curve, response["Q"][0], response["Q"][1])
                    )
                    print("[+] Received server's new public key")
                    return True
                except Exception as e:
                    print(f"[-] Error processing server's new public key: {e}")
                    return False
            else:
                print(f"[-] Server reset failed: {response}")
                return False
        except Exception as e:
            print(f"[-] Error during server reset: {e}")
            return False

    def sign_message(self, message):
        if not self.sock or not self.Q or not self.reader:
            print("[-] Not connected to server. Use 'connect' command first.")
            return None

        try:
            print("[*] Starting signing session...")
            self.sock.sendall(json.dumps({"cmd": "REQUEST"}).encode())
            print("[*] Sent: {'cmd': 'REQUEST'}")

            reply = self.reader.get_response()
            if not reply or "R" not in reply:
                print(
                    f"[-] Unexpected or no response from server when requesting session: {reply}"
                )
                return None

            try:
                R = PointJacobi.from_affine(
                    Point(curve.curve, reply["R"][0], reply["R"][1])
                )
            except Exception as e:
                print(f"[-] Error processing server's R point: {e}")
                return None

            alpha = secrets.randbelow(p)
            while alpha == 0:
                alpha = secrets.randbelow(p)
            beta = secrets.randbelow(p)
            while beta == 0:
                beta = secrets.randbelow(p)

            Rblind = R + gen * alpha + self.Q * beta
            c_prime = hash_func(Rblind, message)
            c = (c_prime + beta) % p

            print("[*] Sending challenge to server...")
            challenge_data = {"cmd": "CHALLENGE", "c": c}
            self.sock.sendall(json.dumps(challenge_data).encode())
            print(f"[*] Sent: {challenge_data}")

            response = self.reader.get_response()
            if not response or "s" not in response:
                print(
                    f"[-] Unexpected or no response from server when sending challenge: {response}"
                )
                return None

            s = response["s"]

            s_prime = (s + alpha) % p
            R = Rblind.to_affine()
            signature = ([R.x(), R.y()], s_prime)

            print("[+] Signature created successfully")
            return signature
        except Exception as e:
            print(f"[-] Error during signing: {e}")
            return None

    def verify_signature(self, message, signature):
        if not self.sock or not self.reader:
            print("[-] Not connected to server. Use 'connect' command first.")
            return False

        try:
            print("[*] Sending verification request to server...")
            verify_data = {"cmd": "VERIFY", "msg": message, "sig": signature}
            self.sock.sendall(json.dumps(verify_data).encode())
            print(f"[*] Sent: {verify_data}")

            verify = self.reader.get_response()
            if not verify or "status" not in verify:
                print(
                    f"[-] Unexpected or no response from server when verifying: {verify}"
                )
                return False

            if verify["status"] == "ok":
                print("[+] Signature is valid!")
                print(
                    f"[*] Server stats - Signatures: {verify.get('sign_cnt', 'N/A')}, Verifications: {verify.get('verify_cnt', 'N/A')}"
                )
                return True
            else:
                print("[-] Signature is invalid.")
                if "detail" in verify:
                    print(f"[*] Details: {verify['detail']}")
                return False
        except Exception as e:
            print(f"[-] Error during verification: {e}")
            return False

    def close(self):
        if self.reader:
            self.reader.stop()

        if self.sock:
            self.sock.close()
            self.sock = None
            print("[+] Connection closed")


def parse_signature(signature_str):
    try:
        sig_data = ast.literal_eval(signature_str)

        if (isinstance(sig_data, tuple) or isinstance(sig_data, list)) and len(
            sig_data
        ) == 2:
            R_prime, s_prime = sig_data

            if (isinstance(R_prime, tuple) or isinstance(R_prime, list)) and len(
                R_prime
            ) == 2:
                if all(isinstance(coord, int) for coord in R_prime):
                    if isinstance(s_prime, int):
                        return [R_prime, s_prime]

        raise ValueError("Invalid signature format")
    except Exception as e:
        raise ValueError(f"Failed to parse signature: {e}")


def print_help():
    print("\nBlind Signature Client - Available Commands:")
    print("  connect                     - Connect to the server")
    print("  reset                       - Reset the server state")
    print("  sign <message>              - Sign a message")
    print("  verify                      - Verify your message and signature")
    print("  help                        - Show this help message")
    print("  exit                        - Exit the program")
    print()


def main():
    client = BlindClient()

    print("=== Blind Signature Client ===")
    print("Type 'help' for available commands")

    while True:
        try:
            cmd_line = input("\n> ").strip()
            if not cmd_line:
                continue

            parts = cmd_line.split(maxsplit=1)
            cmd = parts[0].lower()

            if cmd == "exit":
                client.close()
                print("[+] Exiting...")
                break
            elif cmd == "help":
                print_help()
            elif cmd == "connect":
                client.connect()
            elif cmd == "reset":
                client.reset_server()
            elif cmd == "sign":
                if len(parts) < 2:
                    message = input("Enter message to sign: ")
                else:
                    message = parts[1]

                print(f"[*] Signing message: '{message}'")
                signature = client.sign_message(message)

                if signature:
                    print("[+] Signature:")
                    print(f"  R': {signature[0]}")
                    print(f"  s': {signature[1]}")
            elif cmd == "verify":
                message = input("Enter message to verify: ")

                print("Enter signature in format ([x, y], s):")
                print("Example: ([12345, 67890], 54321)")
                signature_str = input("Signature: ")

                try:
                    signature = parse_signature(signature_str)
                    print(f"[*] Verifying custom signature for message: '{message}'")
                    client.verify_signature(message, signature)
                except ValueError as e:
                    print(f"[-] {e}")
            else:
                print(f"[-] Unknown command: {cmd}")
                print("    Type 'help' for available commands")

        except KeyboardInterrupt:
            print("\n[*] Interrupted")
            client.close()
            break
        except Exception as e:
            print(f"[-] Error: {e}")
            print("[*] Continuing...")


if __name__ == "__main__":
    main()
