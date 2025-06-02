import numpy as np
import itertools

R = 6
N = 2**R - 1
K = N - R

def string_to_bits(s):
    bits = []
    for ch in s:
        bits.extend(int(b) for b in format(ord(ch), '08b'))
    return bits

def pad_and_split(bits, k):
    bb = bits.copy()
    bb.append(1)
    pad_len = (-len(bb)) % k
    bb.extend([0] * pad_len)
    return [bb[i:i+k] for i in range(0, len(bb), k)]

def p2(x):
    return x != 0 and (x & (x - 1) == 0)

def check(r):
    n = 2**r - 1
    H = np.zeros((r, n), dtype=int)
    for j in range(1, n+1):
        H[:, j-1] = [(j >> i) & 1 for i in range(r)]
    return H 

def gen(r):
    H = check(r)
    n = H.shape[1]
    posd   = [j for j in range(1, n+1) if not p2(j)]
    posp = [j for j in range(1, n+1) if p2(j)]
    k = len(posd)
    H_data = H[:, [j-1 for j in posd]]
    A = H_data.T                        
    G_h = np.zeros((k, n), dtype=int)
    for i, j in enumerate(posd):
        G_h[i, j-1] = 1
    for p, j in enumerate(posp):
        G_h[:, j-1] = A[:, p]
    return G_h

def bm(k):
    S = np.eye(k, dtype=int)
    for _ in range(k):
        i, j = np.random.choice(k, 2, replace=False)
        if np.random.rand() < 0.5:
            S[[i,j], :] = S[[j,i], :]
        else:
            S[i, :] ^= S[j, :]
    return S

def keygen(r=6):
    G_h = gen(r)
    k, n = G_h.shape
    S = bm(k)
    perm = np.random.permutation(n)
    G_pub = (S.dot(G_h) % 2)[:, perm]
    return (S, perm), G_pub, G_h

def enc(m_bits, G_pub, t):
    k, n = G_pub.shape
    assert len(m_bits) == k
    m = np.array(m_bits, dtype=int).reshape(1, k)
    c0 = (m.dot(G_pub) % 2).flatten()
    e = np.zeros(n, dtype=int)
    idx = np.random.choice(n, size=t, replace=False)
    e[idx] = 1
    return (c0 ^ e).tolist(), e.tolist()


def main():
    priv_key, G_pub, G_h = keygen(R)
    np.save('alice_pub.npy', G_pub)

    m = input("Enter your message: ")
    m_bits = string_to_bits(m)
    m_bits_blocks = pad_and_split(m_bits, K)

    c_bits_blocks = []
    for block in m_bits_blocks:
        c_block, e = enc(block, G_pub, 1)
        c_bits_blocks.append(c_block)

    c_bits = list(itertools.chain.from_iterable(c_bits_blocks))
    c_int = int(''.join(map(str, c_bits)), 2)
    c_hex = hex(c_int)[2:].rjust(len(c_bits) // 4, '0')

    print("Your encrypted message is: ", c_hex)
