## Title 
Blindspot / Blindspot Revenge

## Theory
A service implements the blind Schnorr signature scheme [1] over the NIST P-256 elliptic curve, using the SHA-256 hash function. The service allows for blind signing via an interactive protocol, and signature verification for arbitrary (message, signature) pairs. The server maintains two counters:

- Counter 1: number of successful signing sessions
- Counter 2: number of distinct valid signature submissions

A flag is issued if you submit more valid signatures than signing sessions - in other words, if you can create a valid (message, signature) pair without interacting with the signing oracle.

The blind Schnorr protocol as implemented is vulnerable to the ROS attack [2], which allows an attacker to forge signatures on arbitrary messages with as few as 256 queries.

Given the ability to open multiple parallel signing sessions, the attacker can manipulate the protocol to obtain multiple challenges and responses which, through carefully chosen coefficients (using the ROS method), can be linearly combined to produce a valid signature on a message of their choice.

### Blind Schnorr Signature Scheme

Let $\langle P \rangle$ be a cyclic group of points on an elliptic curve of prime order $q$, $P$ is a generator (point), and $H$ is a hash function. By $`a \leftarrow \$ \, \mathbb{Z}_q^*`$ we denote the uniform random choice of an element $a$ from $\mathbb{Z}_q^*$. Also, elliptic curve points can be represented as binary strings (corresponding to their coordinates) and, consequently, can be input to the hash function $H$.

The key generation algorithm KeyGen consists of choosing a random $`d \leftarrow\$\, \mathbb{Z}_q^*`$ (the signing private key) and computing the point $Q = dP$ (the verification public key).

The verification algorithm checks a signature $(R', s')$ on message $m$ against the public key $Q$ by checking whether
```math
s' P = R' + \left(H\left(R' \parallel m\right) \bmod q\right) \cdot Q,
```
then the signature is correct and the algorithm returns $1$; otherwise the algorithm returns $0$.


### Blind Signature Protocol

| **Server** $(d, Q)$                 |                                             | **User** $(Q, m)$                                     |
| ----------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| $`k \leftarrow\$\, \mathbb{Z}_q^*`$ |                                             |                                                       |
| $`R \leftarrow kP`$                 |                                             |                                                       |
|                                     | -------------------$`R`$------------------> |                                                       |
|                                     |                                             | $`\alpha, \beta \leftarrow\$\, \mathbb{Z}_q^*`$       |
|                                     |                                             | $`R' \leftarrow R + \alpha P + \beta Q`$              |
|                                     |                                             | $`c' \leftarrow H(R' \parallel m) \bmod q`$           |
|                                     |                                             | $`c \leftarrow c' + \beta`$                           |
|                                     | <------------------$`c`$------------------- |                                                       |
| $`s \leftarrow k + c d`$            |                                             |                                                       |
|                                     | -------------------$`c`$------------------> |                                                       |
|                                     |                                             | **if** $`sP \neq R + cQ`$: **return** $`\bot`$(error) |
|                                     |                                             | $s' \leftarrow s + \alpha$                            |
|                                     |                                             | $`\sigma \leftarrow (R', s')`$                        |
| **return 1**                        |                                             | **return** $`\sigma`$                                 |



### Attack steps
1. Choose a message $m_l \in \{0,1\}^*$  for which you want to forge a signature
2. Open $l$ (e.g., 256 for P-256) parallel sessions of the signing protocol and obtain in response $R_0, \ldots, R_{l-1}$
3. Choose $2l$ messages $m_0^0, m_0^1, \ldots, m_{l-1}^0, m_{l-1}^1$ such that $c_i^0 \ne c_i^1$, where $c_i^b = H(R_i \parallel m_i^b) \bmod q$, for $0 \leq i \leq l-1$, $b \in \{0, 1\}$
4. Determine the set $(\rho_0, \ldots, \rho_l)$ as the coefficients of $x_i$ in the expression
```math
\sum_{i=0}^{l-1} 2^i \frac{x_i - c_i^0}{c_i^1 - c_i^0} = \sum_{i=0}^{l-1} \rho_i x_i + \rho_l.
```
5. Set 
```math
R_l = \sum_{i=0}^{l-1} \rho_i R_i + \rho_l (P - Q), \quad c_l = H(R_l \parallel m_l) \bmod q
```
and determine the values $b_i$, $0 \leq i \leq l-1$, from the condition: 
```math
c_l = \sum_{i=0}^{l-1} 2^i b_i.
```
6. Send the values $`c_0^{b_0}, \ldots, c_{l-1}^{b_{l-1}}`$ to the signer in the corresponding open sessions.
7. Receive from the signer the values $`s_0, \ldots, s_{l-1}`$ such that:
```math
s_i P - c_i^{b_i} Q = R_i, \quad 0 \leq i < l-1.
```
8. Set 
```math
s_l = \sum_{i=0}^{l-1} \rho_i s_i + \rho_l.
```
9. The signature $(R_l, s_l)$ is a valid signature for the message $m_l$:
```math
\begin{align*}
R_l &= \sum_{i=0}^{l-1} \rho_i R_i + \rho_l (P - Q) = \sum_{i=0}^{l-1} \rho_i (s_i P - c_i^{b_i} Q) + \rho_l (P - Q) = \\
    &= \sum_{i=0}^{l-1} \rho_i s_i P + \rho_l P - \sum_{i=0}^{l-1} \rho_i c_i^{b_i} Q - \rho_l Q = s_l P - c_l Q.
\end{align*}
```
10. Set $`m_i = m_i^{b_i}`$ for $`0 \leq i < l`$, and output the set $`\{ m_i, (R_i, s_i) \}_{i=0}^l`$.


## Blindspot (non revenge) solution
[link to task files](./original/)\
In the `new_session` function, the value `k` is computed only once and can be reused multiple times for the same connection.
```python
def new_session(self, addr):
  k = secrets.randbelow(p)
  while k == 0:
      k = secrets.randbelow(p)
  R = gen * k
  with self.mutex:
      self.pending_sessions[addr] = (k, R)
```
On the same connection we can receive two `s` signed by same `k` using `CHALLENGE` command
After that server private key (`d`) can be recovered $`d = (s_1 - s_2) \cdot (c_1 - c_2)^{-1} mod p`$
since $`s_1=k+c_1d`$, $`s_2=k+c_2d`$. 
Now we can sign messages on client side

## Blindspot revenge solution
[link to task files](./revenge/)\
The intended solution is to apply the above described ROS attack to forge a valid signature on an arbitrary message.

Python implementation of this solution could be found in [solver.py](./revenge/writeup/solver.py)

### Unintended Blindspot revenge solution
Actually there is another unintended solution for Blindspot revenge task (ty [@maximxlss](https://github.com/maximxlss) for solution).\
since `verify_sig` does not acquire the lock, it is possible that a call to reset resets counter_sign to zero while leaving verified_messages uncleared, resulting in a race condition where
```python
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
```
So you can just spam sign+verify and reset messages, catching the moment when counter_sign becomes zero but verified_messages have not yet been cleared.
Here is the `reset` function
```python
def reset(self):
    with self.mutex:
        self.d, self.Q = KeyGen()
        self.counter_sign = 0
        self.verified_messages.clear()
```


### References

1. Pointcheval D., Stern J. "Provably secure blind signature schemes." ASIACRYPT'96, LNCS 1163, pp. 252–265, 1996.
2. Benhamouda F., Lepoint T., Orrù M., Raykova M. "On the (in)security of ROS." Cryptology ePrint Archive, Report 2020/945.
