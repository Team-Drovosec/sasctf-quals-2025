import base64
import hashlib
import json
import os
import socket

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


def interact(sock, obj):
    sock.sendall(json.dumps(obj).encode())
    print(json.dumps(obj).encode())
    msg = sock.recv(65536).decode()
    print(msg)
    return json.loads(msg)


def main():
    l = 256
    socks = []
    for x in range(l):
        sock = socket.socket()
        sock.connect(("localhost", 1337))
        socks.append(sock)
    Q = interact(sock, {"cmd": "GETKEY"})["Q"]
    Q = PointJacobi.from_affine(Point(curve.curve, Q[0], Q[1]))

    # Opening socket 256 sessions
    sessions = []
    for i in range(l):
        reply = interact(socks[i], {"cmd": "REQUEST"})
        R = PointJacobi.from_affine(Point(curve.curve, reply["R"][0], reply["R"][1]))
        sessions.append(R)

    c: list[tuple[int, int]] = []
    m_i: list[tuple[int, int]] = []
    for i in range(l):
        m0 = base64.b64encode(os.urandom(32)).decode()
        m1 = base64.b64encode(os.urandom(32)).decode()
        m_i.append((m0, m1))
        R = sessions[i]
        c.append((hash_func(R, m0), hash_func(R, m1)))

        if c[-1][0] == c[-1][1]:
            print(f"[-] c0[{i}] == c1[{i}]")
            exit(0)
    free_coef = 0
    p_i = []
    for i in range(l):
        denominator = c[i][1] - c[i][0]
        p_i.append((2**i * pow(denominator, -1, q)) % q)
        free_coef += (((-(2**i) * c[i][0]) % q) * pow(denominator, -1, q)) % q

    p_l = free_coef % q

    R_l = p_i[0] * sessions[0]
    for i in range(1, l):
        R_l += p_i[i] * sessions[i]

    R_l += p_l * (P + (-Q))
    m_l = "Any message you want to fake sign"
    c_l = hash_func(R_l, m_l)

    b_i = cl_to_bits(c_l, l)
    s_list = []
    for i in range(l):
        ci = c[i][b_i[i]]
        s = interact(socks[i], {"cmd": "CHALLENGE", "c": ci})["s"]

        print(sessions[i] == s * P + (-c[i][b_i[i]] * Q))
        s_list.append(s)

    for i in range(l):
        R = sessions[i].to_affine()
        signature = ([R.x(), R.y()], s_list[i])
        message = m_i[i][b_i[i]]

        verify = interact(socks[i], {"cmd": "VERIFY", "msg": message, "sig": signature})
        print(verify)

    s_l = p_i[0] * s_list[0]
    for i in range(1, l):
        s_l += p_i[i] * s_list[i]

    s_l += p_l
    s_l %= q
    print(s_l)
    R = R_l.to_affine()
    signature = ([R.x(), R.y()], s_l)
    message = m_l
    verify = interact(socks[0], {"cmd": "VERIFY", "msg": message, "sig": signature})
    print(verify)
    flag_msg = socks[0].recv(65536).decode()
    print(flag_msg)


if __name__ == "__main__":
    main()
