import hashlib
import json
import os
import secrets
import socket
import threading

from ecdsa.curves import NIST256p
from ecdsa.ellipticcurve import Point, PointJacobi
from pydantic import BaseModel, ValidationError

FLAG = os.getenv("FLAG")
curve = NIST256p
gen = curve.generator
p = gen.order()


def KeyGen():
    d = secrets.randbelow(p)
    while d == 0:
        d = secrets.randbelow(p)
    Q = gen * d
    return d, Q


def point2bytes(P):
    return P.to_bytes()


def hash_func(Rp, m):
    if isinstance(m, str):
        m = m.encode()
    return (
        int.from_bytes(hashlib.sha256(point2bytes(Rp) + m).digest(), byteorder="big")
        % p
    )


def Verify(Q, m, sig):
    R_prime, s_prime = sig
    c_prime = hash_func(R_prime, m)
    return gen * s_prime == R_prime + Q * c_prime


class ServerState:
    def __init__(self):
        self.d, self.Q = KeyGen()
        self.counter_sign = 0
        self.verified_messages = set()
        self.mutex = threading.Lock()

    def reset(self):
        with self.mutex:
            self.d, self.Q = KeyGen()
            self.counter_sign = 0
            self.verified_messages.clear()

    def gen_new_session(self):
        k = secrets.randbelow(p)
        while k == 0:
            k = secrets.randbelow(p)
        R = gen * k
        return k, R

    def process_challenge(self, addr, c, k):
        s = (k + c * self.d) % p
        with self.mutex:
            self.counter_sign += 1
        return s

    def verify_sig(self, msg, sig):
        try:
            sig = [
                PointJacobi.from_affine(Point(curve.curve, sig[0][0], sig[0][1])),
                sig[1],
            ]
            res = Verify(self.Q, msg, sig)
            if res:
                with self.mutex:
                    self.verified_messages.add(msg)
            return res
        except Exception:
            return 0


def convert_point_to_dict(point):
    if isinstance(point, PointJacobi):
        point = point.to_affine()
    return [point.x(), point.y()]


def process_json_value(value):
    if isinstance(value, PointJacobi):
        return convert_point_to_dict(value)
    elif isinstance(value, dict):
        return {k: process_json_value(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple)):
        return [process_json_value(item) for item in value]
    return value


def send_socket_message(conn, msg):
    if not isinstance(msg, str):
        processed_data = process_json_value(msg)
    else:
        processed_data = msg
    conn.sendall(json.dumps(processed_data).encode() + b"\n")


def recv_message_to_model(conn, model):
    req = conn.recv(65536)
    if not req:
        return None
    try:
        data = json.loads(req)

        try:
            return model.model_validate(data)
        except ValidationError as e:
            send_socket_message(conn, {"status": "err", "detail": e.errors()})
    except Exception:
        send_socket_message(conn, {"status": "err", "detail": "bad json"})
    return None


class ChallengeRequest(BaseModel):
    c: int


class VerifyRequest(BaseModel):
    sig: tuple[tuple[int, int], int]
    msg: str


srv = ServerState()


def handle_client(conn, addr):
    try:
        send_socket_message(
            conn,
            """Welcome to Blind signing! Available commands: (sign, reset, verify)""",
        )
        command = conn.recv(65536).decode()
        if command not in ("sign", "reset", "verify"):
            send_socket_message(conn, {"status": "err", "detail": "unknown cmd"})
        if command == "reset":
            srv.reset()
            send_socket_message(conn, {"status": "ok", "msg": "reset done"})
            return
        elif command == "sign":
            k, R = srv.gen_new_session()
            send_socket_message(conn, {"R": R, "Q": srv.Q})

            req = recv_message_to_model(conn, ChallengeRequest)
            if req is None:
                return

            s = srv.process_challenge(conn, req.c, k)
            send_socket_message(conn, {"s": s})
        elif command == "verify":
            req = recv_message_to_model(conn, VerifyRequest)
            if req is None:
                return

            result = srv.verify_sig(req.msg, req.sig)
            send_socket_message(
                conn,
                {
                    "status": "ok" if result else "bad",
                    "sign_cnt": srv.counter_sign,
                    "verify_cnt": len(srv.verified_messages),
                },
            )

            if len(srv.verified_messages) > srv.counter_sign:
                send_socket_message(
                    conn,
                    {
                        "msg": f"Wow, you can verify unsigned messages, here is your prize: {FLAG}",
                    },
                )
    finally:
        try:
            conn.close()
        except Exception:
            pass


def start_server(port=1337):
    srv.reset()
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", port))
    s.listen(100)
    print(f"Server started on {port}")
    while True:
        try:
            conn, addr = s.accept()
            threading.Thread(
                target=handle_client, args=(conn, addr), daemon=True
            ).start()
        except KeyboardInterrupt:
            print("Shutting down")
            break


if __name__ == "__main__":
    start_server(1337)
