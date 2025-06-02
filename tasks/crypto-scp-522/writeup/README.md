## Overview

There are four provided files:

* `comm_log_caldwell_lvl5.pcap` — a traffic dump
* `key.pub` — a public ECDSA key
* `ecdsa_cli.py` — a script for signing files using ECDSA over the P-521 curve
* `aes_cli.py` — a script for encrypting files using AES with a 256-bit key

The PCAP file contains an FTP transfer of 160 files:

* 80 `.txt` documents
* 80 `.txt.sign` ECDSA signatures (DER format)

One of the files — named after the challenge — is encrypted and is suspected to contain the flag.

> Note: The scripts use a secret scalar `D` as the private key. `D` is used for ECDSA signing, and `sha256(D)` is used as the AES encryption key.

## Vulnerability

The signing script `ecdsa_cli.py` uses an insecure nonce generation method:

```python
def nonce():
    random_bytes = os.urandom(64)
    nonce = hashlib.sha512(random_bytes).digest()
    return int.from_bytes(nonce, byteorder='big')
```

Because the P-521 curve's order is 521 bits, but SHA-512 produces only 512 bits of entropy, every nonce actually has its top 9 bits set to zero. 
That “9-bit bias” in every nonce leaks enough information that, once you collect a sufficient number of signatures, you can set up a lattice problem and recover the private key. 

The challenge is affected by the same weakness as [CVE-2024-31497](https://github.com/HugoBond/CVE-2024-31497-POC).

## Exploitation

Exploitation path:

1. Extract all 80 plaintexts and 80 signatures from the PCAP.
2. **Recover the private ECDSA key using the 80 messages and their signatures**: because each signature's nonce leaks a small‐error relation between the public data `(r, s, hash)` and the unknown private key, ECDSA with biased nonces is framed as a Hidden Number Problem. For each of the 80 signatures, a pair of public coefficients is computed that, together with an unknown multiple of the curve order, must differ from an integer smaller than $`2^{512}`$. Embedding all those constraints into an 81×81 integer lattice yields a basis whose shortest vector encodes the private key (up to a factor of $n$). Application of LLL to this lattice recovers the private key.

4. Use the recovered key to decrypt the encrypted file and obtain the flag.
