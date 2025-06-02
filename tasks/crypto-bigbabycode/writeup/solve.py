import numpy as np
import random
import sys

R = 6
N = 2**R - 1
K = N - R

def unpad_bits(bits):
    idx = len(bits) - 1 - bits[::-1].index(1)
    return bits[:idx]

def hex_to_bit_array(hex_str: str, bits_per_sublist: int):
    raw = bin(int(hex_str, 16))[2:].zfill(len(hex_str) * 4)
    extra = len(raw) % bits_per_sublist
    if extra:
        raw = raw[extra:]
    
    n_rows = len(raw) // bits_per_sublist
    return [
        [int(b) for b in raw[i*bits_per_sublist:(i+1)*bits_per_sublist]]
        for i in range(n_rows)
    ]
    
def gf2_inv(A):
    k = A.shape[0]
    M = np.concatenate((A.copy(), np.eye(k, dtype=int)), axis=1)
    for i in range(k):
        if M[i, i] == 0:
            for j in range(i+1, k):
                if M[j, i] == 1:
                    M[[i, j]] = M[[j, i]]
                    break
            else:
                raise np.linalg.LinAlgError("Not invertible")
        for j in range(k):
            if j != i and M[j, i] == 1:
                M[j, :] ^= M[i, :]
    return M[:, k:]

def hamming_weight(v):
    return int(v.sum())

def prange_isd(G_list, c_list, t=1, max_iters=200_000):
    G = np.array(G_list, dtype=int) % 2
    c = np.array(c_list, dtype=int) % 2
    k, n = G.shape

    for it in range(max_iters):
        I = sorted(random.sample(range(n), k))
        G_I = G[:, I]
        try:
            G_I_inv = gf2_inv(G_I)
        except np.linalg.LinAlgError:
            continue
        c_I = c[I]
        u = c_I.dot(G_I_inv) % 2
        c_est = (u.dot(G) % 2)
        e     = c ^ c_est
        if hamming_weight(e) <= t:
            return u.tolist(), e.tolist(), I

    return None, None, None

def bits_to_string(bits):
    chars = []
    for i in range(0, len(bits), 8):
        byte = bits[i:i+8]
        if len(byte) < 8:
            break
        val = sum(b << (7 - j) for j, b in enumerate(byte))
        chars.append(chr(val))
    return ''.join(chars)

ciphertexts = hex_to_bit_array(input(), N)
recovered_bits = []
G_pub = np.load('alice_pub.npy')

for i, c_block in enumerate(ciphertexts, 1):
    m_block, e_block, I = prange_isd(G_pub, c_block, t=1)
    if m_block is None:
        raise RuntimeError(f"Block {i}: ISD failed")
    recovered_bits.extend(m_block)

orig_bits = unpad_bits(recovered_bits)
flag = bits_to_string(orig_bits)
print("Recovered flag:", flag)
