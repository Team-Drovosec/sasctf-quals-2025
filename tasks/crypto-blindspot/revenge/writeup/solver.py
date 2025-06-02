import base64
import hashlib
import json
import os
import socket
import time

from ecdsa.curves import NIST256p
from ecdsa.ellipticcurve import Point, PointJacobi

curve = NIST256p
P = curve.generator
q = P.order()


def cl_to_bits(cl, l):
    bits = []
    for i in range(l):
        bits.append((cl >> i) & 1)
    return bits


def point2bytes(Q):
    return Q.to_bytes()


def hash_func(R, m):
    if isinstance(m, str):
        m = m.encode()
    return int.from_bytes(hashlib.sha256(point2bytes(R) + m).digest(), "big") % q


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


def main():
    l = 256
    socks = []
    for x in range(l):
        sock = socket.socket()
        sock.connect(("localhost", 1337))
        socks.append(sock)
        receive_message(sock)

    R_list = []
    for i in range(l):
        send_message(socks[i], "sign")
        response = receive_message(socks[i])
        print(response)
        Q = PointJacobi.from_affine(
            Point(curve.curve, response["Q"][0], response["Q"][1])
        )
        R_list.append(
            PointJacobi.from_affine(
                Point(curve.curve, response["R"][0], response["R"][1])
            )
        )

    c_list: list[tuple[int, int]] = []
    m_i: list[tuple[int, int]] = []
    for i in range(l):
        m0 = base64.b64encode(os.urandom(32)).decode()
        m1 = base64.b64encode(os.urandom(32)).decode()
        m_i.append((m0, m1))
        R = R_list[i]
        c_list.append((hash_func(R, m0), hash_func(R, m1)))
        if c_list[-1][0] == c_list[-1][1]:
            print(f"c0[{i}] == c1[{i}]")
            exit(0)
    free_coef = 0
    p_i = []
    for i in range(l):
        denominator = c_list[i][1] - c_list[i][0]
        p_i.append((2**i * pow(denominator, -1, q)) % q)
        free_coef += (((-(2**i) * c_list[i][0]) % q) * pow(denominator, -1, q)) % q

    p_l = free_coef % q

    R_l = p_i[0] * R_list[0]
    for i in range(1, l):
        R_l += p_i[i] * R_list[i]

    R_l += p_l * (P + (-Q))
    m_l = "Any message you want to fake sign"
    c_l = hash_func(R_l, m_l)
    b_i = cl_to_bits(c_l, l)

    s_list = []
    for i in range(l):
        ci = c_list[i][b_i[i]]
        send_message(socks[i], {"c": ci})
        s = receive_message(socks[i])["s"]
        assert R_list[i] == s * P + (-c_list[i][b_i[i]] * Q)
        s_list.append(s)

    for i in range(l):
        sock = socket.socket()
        sock.connect(("localhost", 1337))
        receive_message(sock)
        send_message(sock, "verify")
        # if we spam with messages in socket they could be read by the server as one message instead of two or more
        time.sleep(0.05)
        R = R_list[i].to_affine()
        signature = ([R.x(), R.y()], s_list[i])
        message = m_i[i][b_i[i]]

        verify_req = {"sig": signature, "msg": message}

        send_message(sock, verify_req)
        response = receive_message(sock)

        print(response)
        sock.close()

    s_l = p_i[0] * s_list[0]
    for i in range(1, l):
        s_l += p_i[i] * s_list[i]

    s_l += p_l
    s_l %= q
    R = R_l.to_affine()
    signature = ([R.x(), R.y()], s_l)
    message = m_l
    verify_req = {"sig": signature, "msg": message}
    sock = socket.socket()
    sock.connect(("localhost", 1337))
    receive_message(sock)
    send_message(sock, "verify")
    time.sleep(0.05)
    send_message(sock, verify_req)
    response = receive_message(sock)
    flag_msg = sock.recv(65536).decode()
    print(flag_msg)


if __name__ == "__main__":
    main()
