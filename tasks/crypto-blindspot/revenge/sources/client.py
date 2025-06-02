import ast
import hashlib
import json
import secrets
import socket

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


def send_message(sock, message):
    if isinstance(message, str):
        sock.sendall(message.encode())
    else:
        sock.sendall(json.dumps(message).encode() + b"\n")


def receive_message(sock):
    data = b""
    while b"\n" not in data:
        chunk = sock.recv(4096)
        if not chunk:
            break
        data += chunk
    try:
        return json.loads(data.decode().strip())
    except json.JSONDecodeError:
        return data.decode().strip()


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


def main():
    host = input("Enter host (default localhost): ") or "localhost"
    port = input("Enter port (default 1337): ") or "1337"
    port = int(port)

    print("Interactive mode. Type 'help' for a list of commands.")

    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.connect((host, port))
            welcome = sock.recv(4096).decode()
            cmd = input("> ").strip().lower()

            if cmd == "help":
                print("Available commands:")
                print("  reset - Reset server state")
                print("  sign - Request signature with the specified message")
                print("  verify - Verify signature for a message")
                print("  exit - Exit the program")

            elif cmd == "reset":
                send_message(sock, "reset")
                response = receive_message(sock)
                print(json.dumps(response, indent=2))

            elif cmd == "sign":
                try:
                    print("Enter your message:")
                    message = input()
                    send_message(sock, "sign")
                    response = receive_message(sock)

                    try:
                        Q = PointJacobi.from_affine(
                            Point(curve.curve, response["Q"][0], response["Q"][1])
                        )
                    except Exception as e:
                        print(f"Error processing server's public key: {e}")
                        return None

                    alpha = secrets.randbelow(p)
                    while alpha == 0:
                        alpha = secrets.randbelow(p)
                    beta = secrets.randbelow(p)
                    while beta == 0:
                        beta = secrets.randbelow(p)

                    try:
                        R = PointJacobi.from_affine(
                            Point(curve.curve, response["R"][0], response["R"][1])
                        )
                    except Exception as e:
                        print(f"Error processing server's R point: {e}")
                        return None
                    Rblind = R + gen * alpha + Q * beta
                    c_prime = hash_func(Rblind, message)
                    c = (c_prime + beta) % p

                    challenge_req = {"c": c}
                    send_message(sock, challenge_req)

                    s_response = receive_message(sock)
                    s = s_response["s"]
                    s_prime = (s + alpha) % p
                    R = Rblind.to_affine()
                    signature = ([R.x(), R.y()], s_prime)

                    print("Got signature:", signature)

                except Exception as e:
                    print(f"Error: {e}")
                    raise

            elif cmd == "verify":
                print("Enter message to verify:")
                message = input()

                print("Enter signature in format ([x, y], s):")
                print("Example: ([12345, 67890], 54321)")
                signature_str = input("Signature: ")

                try:
                    signature = parse_signature(signature_str)
                except ValueError as e:
                    print(f"Error: {e}")

                send_message(sock, "verify")

                verify_req = {"sig": signature, "msg": message}

                send_message(sock, verify_req)
                response = receive_message(sock)
                print(json.dumps(response, indent=2))

                try:
                    sock.settimeout(1)
                    more_data = sock.recv(4096)
                    if more_data:
                        try:
                            flag_msg = json.loads(more_data.decode().strip())
                            print(
                                "Additional response:", json.dumps(flag_msg, indent=2)
                            )
                        except Exception:
                            print("Additional data:", more_data.decode())
                except Exception:
                    pass
                finally:
                    sock.settimeout(None)

            elif cmd == "exit":
                break

            else:
                print("Unknown command. Type 'help' for a list of available commands.")


if __name__ == "__main__":
    main()
