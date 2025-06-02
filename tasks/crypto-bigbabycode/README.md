## Title
bigbabycode

## Description
I'm that fella (hey) \
Excuse me, but I'm that fella (hey, hey) \
Think there's a secret in this house (bih', bih', bih') \
But we gon' party so hard, we'll knock the walls down \
Flash drive in my garage, think my house has been raided (pow) \
They whisper I need (S, perm) to spread the secret round' (bam, bam) \
That's not straight stuff, my man ain't doin it (for real)

## Solution
For encryption, a McEliece‐style scheme based on a binary Hamming code is used. One sets $R=6$, so that $N=2^R-1=63$ and $K=N-R=57$. The standard Hamming code has parity‐check matrix $H\in\mathbb{F}_2^{6\times63}$, where column $j$ is the 6‐bit binary expansion of $j$. A systematic generator matrix $G_h\in\mathbb{F}_2^{57\times63}$ is formed by placing a $57\times57$ identity block in the non‐power‐of‐two positions and choosing the remaining six columns so that $H\,G_h^T=0$. Any 57‐bit message $m$ maps to the codeword $c_0=m\,G_h\in\mathbb{F}_2^{63}$, which has distance at least three and can correct one error.

To hide this structure, a random invertible $`S\in\mathbb{F}_2^{57\times57}`$ and a random column permutation $P$ of size 63 are chosen, yielding the public matrix $G_{\text{pub}}=S\,G_h\,P$. Encryption converts the plaintext into 8‐bit ASCII bits, appends a “1” bit, pads to a multiple of 57, and splits into blocks $`m\in\mathbb{F}_2^{57}`$. Each block is encoded as $c_0=m\,G_{\text{pub}}\in\mathbb{F}_2^{63}$, then a random weight-1 error $e$ is added to produce $c=c_0\oplus e$. All 63‐bit blocks are concatenated and given as a hex output.

Because exactly one error is added per codeword, an attacker can recover each 57-bit block by testing all 63 single-bit flips: for each position $i$, let $c^{(i)}$ be $c$ with bit $i$ toggled. Exactly one $c^{(i)}$ lies in the row span of $G_{\text{pub}}$, so solving $x\,G_{\text{pub}}=c^{(i)}$ over $\mathbb{F}_2$ yields the unique $x=m$. 

More generally, when McEliece is instantiated with larger codes and a higher error weight $t$, the standard method for recovering the message is an information‐set decoding (ISD) attack. In an ISD attack, the adversary selects a subset of coordinates (an “information set”) of size equal to the code dimension—say $K$ out of $N$—and hopes that none of the $t$ randomly introduced errors lie within this chosen set. If that happens, the restriction of the received word to those $K$ positions directly yields the original message bits in that coordinate subset, because those positions correspond to an invertible submatrix of the public generator matrix. An attacker repeats this procedure by sampling many random information sets until finding one that is error‐free.

Check the [solve.py](./writeup/solve.py) script.

## Flag
SAS{y0u_d0nt_r3ally_n33d_S_perm_t0_d3c0d3_Mc_3l1ec3_w1th_H4mm1ng_c0d3s}

**Solved by:** 73 teams