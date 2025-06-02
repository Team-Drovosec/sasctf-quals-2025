The objective is to reverse engineer a smart contract to generate a valid key that passes the `validate()` function and can be submitted via web application.

---

## Task Steps

### 1. Download Contract Bytecode

Retrieve the bytecode using the following JSON-RPC call:

```bash
curl -X POST https://sova-rpc.task.sasc.tf \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getCode",
    "params": ["0xYourContractAddress", "latest"],
    "id":1
}'
```

---

### 2. Understand the `validate()` Function

- The `validate()` function acts as an **embedded virtual machine (VM)**.
- This VM executes custom logic based on encoded instructions stored in the contract's storage slots.

```solidity
case 7 {//lw
    let _sw_reg1:= add(_sw_regs, mul(and(_sw_data, 255),32))
    _sw_data := sar(8, _sw_data)
    let _sw_reg2:= add(_sw_regs, mul(and(_sw_data, 255),32))
    _sw_data := sar(8, _sw_data)
    let _sw_mem_addr := add(_sw_mem,add(mload(_sw_reg2),_sw_data))
    mstore(_sw_reg1,sar(224,mload(_sw_mem_addr)))
}
```

This is not obfuscation, the `EVM` operates on `256-bit` words, so we need to use bit shifting to store and retrieve smaller values efficiently.

---

### 3. Download VM Instructions from Storage

- Each storage slot (`slot0`, `slot1`, ...) represents one **instruction** of the embedded VM.
- Fetch slot values using the following template (slot 7):

```bash
curl -X POST https://sova-rpc.task.sasc.tf \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getStorageAt",
    "params": [
      "0xYourContractAddress",  
      "0x7",                    
      "latest"                  
    ],
    "id":1
}'
```

- Continue incrementing the slot index (`0x0`, `0x1`, `0x2`, ...) until a slot returns `0x0`, indicating the end of the instruction list.

---

### 4. Reverse Engineer Instructions

- The instruction format is **based on RISC-V**, but uses a **custom encoding**.
- Reverse each slot value to identify the corresponding instruction.

---

### 5. Disassemble to RISC-V

- Decode the custom instructions and **disassemble them into RISC-V assembly**.

```
   100b0:	fa010113          	add	sp,sp,-96
   100b4:	04813c23          	sd	s0,88(sp)
   100b8:	06010413          	add	s0,sp,96
   100bc:	faa43423          	sd	a0,-88(s0)
   100c0:	fab43023          	sd	a1,-96(s0)
   100c4:	f00dc7b7          	lui	a5,0xf00dc
   ...
```

---

### 6. Recover the Original C Logic

- The RISC-V assembly was compiled from a **C source code** base.
- Reconstruct the C logic to understand how the validation is performed.

```c
#include <stdint.h>
#include <stddef.h>

#define ROUNDS 4

// Reversible Feistel round
inline __attribute__((always_inline)) uint32_t feistel_round(uint32_t input, uint32_t key) {
    input ^= key;
    input = ((input << 5) | (input >> (32 - 5))) * 0x45D9F3B;
    input ^= (input >> 16);
    return input;
}

// Reversible avalanche transform
uint64_t reversible_transform(const char *name,size_t len) {
    uint32_t KEYS[ROUNDS];
    KEYS[0] = 0xF00DBABE;
    KEYS[1] = 0xDEADBEEF;
    KEYS[2] = 0xBADC0FFE;
    KEYS[3] = 0xFEEDFACE;
    
    uint64_t state = 0;

    if(len > 8 ){
        len = 8;
    }

    // Pack 8 chars max into 64-bit int
    for (size_t i = 0; i < len; ++i) {
        state |= ((uint64_t)(uint8_t)name[i]) << (i * 8);
    }    

    uint32_t left = (uint32_t)(state >> 32);
    uint32_t right = (uint32_t)(state & 0xFFFFFFFF);

    
    for (int i = 0; i < ROUNDS; ++i) {
        uint32_t tmp = right;
        right = left ^ feistel_round(right, KEYS[i]);
        left = tmp;
    }

    return ((uint64_t)left << 32) | right;
}
```

---

### 7. Build a Key Generator

- Use your understanding of the validation logic to build a **key generator** that produces valid inputs.
- The generated key should satisfy the conditions implemented by the VM and pass the `validate()` function.

```python
import sys

def feistel_round(x, k):
    x ^= k
    x = ((x << 5) & 0xFFFFFFFF) | (x >> (32 - 5))
    x = (x * 0x45D9F3B) & 0xFFFFFFFF
    x ^= x >> 16
    return x

def reverse_transform(serial):
    left = (serial >> 32) & 0xFFFFFFFF
    right = serial & 0xFFFFFFFF
    keys = [0xF00DBABE, 0xDEADBEEF, 0xBADC0FFE, 0xFEEDFACE]

    for i in reversed(range(4)):
        left, right = right ^ feistel_round(left, keys[i]), left

    state = (left << 32) | right
    chars = []
    for i in range(8):
        c = (state >> (i * 8)) & 0xFF
        chars.append(chr(c))
    return ''.join(chars)

if __name__ == "__main__":
    serial = int(sys.argv[1].strip(),16)
    recovered_name = reverse_transform(serial)
    print(f"Recovered name from serial: {recovered_name}")
    if len(sys.argv) > 2 and sys.argv[2] != recovered_name:
        exit(-1)

```
