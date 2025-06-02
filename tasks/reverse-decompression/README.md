## Title
Decompression

## Description
We compressed your flag so you can use the fanciest decompressor to get it

## Solution
1) We received a file with the `.zpaq` extension. This is an archive created with the ZPAQ compressor.
Let's download the official [ZPAQ](https://www.mattmahoney.net/dc/zpaq715.zip) from the author's website and attempt to extract it using `zpaq x flag.zpaq`
2) The archive extracts a file named `flag.jpg`, but instead of an image, it simply contains the message `INVALID PASSWORD`. This is unexpected, because the archive is not encrypted, and we were never prompted for a password.
3) Digging deeper into the ZPAQ format, we learn that one of its key features is that the decompression logic is not hardcoded into the binary, but rather embedded inside the archive itself as a kind of custom bytecode. The ZPAQ executable includes a JIT compiler to execute this bytecode, specifically optimized for x86 platforms.
    - To investigate further, let's attempt to debug the ZPAQ and analyze the generated JIT code.
    - Unfortunately, the precompiled .exe binaries do not contain debug symbols, and .pdb files are not provided.
    - We have to build ZPAQ from source with debug symbols, so we can debug the execution and understand how the JIT-ted logic handles the decompression.
4) To compile it on windows you can create default Console App with Visual Studio and replace default files with `zpaq.cpp`, `libzpaq.h` and `libzpaq.cpp`. If you use one of the latest versions of Visual Studio you also need to specify `_CRT_SECURE_NO_WARNINGS` to compile it.
5) Let's set breakpoint inside `libzpaq::ZPAQL::run` and follow jump to the generated code. Let's decompile it with your favourite decompiler.
    - We observe repeated blocks of code in the decompression logic that appear to be performing password checks.
    If a check fails, an internal error flag is set to 2.
        ```
        *&word_21D277F4CD4 = dword_21D27969080[(dword_21D277F4CE4[243] + 1) & 0x1FFFFF] + 11;
        *&word_21D277F4CD8 = dword_21D27969080[(dword_21D277F4CE4[243] + 1) & 0x1FFFFF] + 13;
        *&word_21D277F4CD0 = byte_21D277F49C0[word_21D277F4CD8 & 0x1FF] + byte_21D277F49C0[word_21D277F4CD4 & 0x1FF];
        *&word_21D277F4CDC = dword_21D27969080[(dword_21D277F4CE4[243] + 1) & 0x1FFFFF] + 4;
        *&word_21D277F4CE0 = dword_21D27969080[(dword_21D277F4CE4[243] + 1) & 0x1FFFFF] + 6;
        *&word_21D277F4CD8 = byte_21D277F49C0[word_21D277F4CE0 & 0x1FF] + byte_21D277F49C0[word_21D277F4CDC & 0x1FF];
        *&word_21D277F4CE0 = dword_21D27969080[(dword_21D277F4CE4[243] + 1) & 0x1FFFFF] + 12;
        dword_21D277F4CE4[0] = dword_21D27969080[(dword_21D277F4CE4[243] + 1) & 0x1FFFFF] + 3;
        *&word_21D277F4CDC = byte_21D277F49C0[dword_21D277F4CE4[0] & 0x1FF] + byte_21D277F49C0[word_21D277F4CE0 & 0x1FF];
        *&word_21D277F4CD4 = *&word_21D277F4CDC + *&word_21D277F4CD8;
        *&word_21D277F4CCC = (*&word_21D277F4CDC + *&word_21D277F4CD8) | *&word_21D277F4CD0;
        *byte_21D277F4CC8 = ((word_21D277F4CDC + word_21D277F4CD8) | word_21D277F4CD0);
        *&word_21D277F4CC4 = *byte_21D277F4CC8 != 191;
        if ( *byte_21D277F4CC8 != 191 )
        {
            v7 = (4i64 * ((dword_21D277F4CE4[243] + 2) & 0x1FFFFF) + 0x21D27969080i64);
            dword_21D27969080[(dword_21D277F4CE4[243] + 2) & 0x1FFFFF] = 2;
        }
        ```
    - Later, if this flag is equal to 2, the program displays our familiar message: "INVALID PASSWORD"
        ```
        LOBYTE(f) = dword_21D27969080[(dword_21D277F4CE4[243] + 2) & 0x1FFFFF] == 2;
        *&word_21D277F4CC4 = f;
        if ( f )
        {
            result = sub_21D27770052(v7, 'I');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v12, 'N');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v13, 'V');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v14, 'A');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v15, 'L');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v16, 'I');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v17, 'D');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v18, ' ');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v19, 'P');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v20, 'A');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v21, 'S');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v22, v11);
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v23, 'W');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v24, 'O');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v25, 'R');
            if ( result )
                goto LABEL_116;
            result = sub_21D27770052(v26, 'D');
            if ( result )
                goto LABEL_116;
            *byte_21D277F4CC8 = dword_21D27969080[(*&byte_21D277F49C0[768])-- & 0x1FFFFF];
            v2 = *&byte_21D277F49C0[768];
            *&byte_21D277F49C0[768] = dword_21D27969080[*&byte_21D277F49C0[768] & 0x1FFFFF];
        }
        ```
    - While debugging, we identify the value being checked: a fixed 16-byte buffer containing the string `ENTER___PASSWORD`. By searching the archive file for this sequence of bytes, we found it.
    - This suggests that we are expected to patch the archive file directly with the correct password, such that the decompression logic passes its validation.
    - This is a classic CTF scenario involving SMT solving. As with all such challenges, there are multiple viable approaches:
        - Dump the generated JIT code and run symbolic execution on it using tools like `angr`, mapping memory regions and marking paths we want to take.
        - Use some IDA/Ghidra plugins to run symbolic execution right in debugging session
        - Parse the password checks into a set of equations for an SMT solver manually, in this case, there are not so many checks, and they appear to be template-generated.
        - Since it's 2025 already, you can just ask a matrix multiplication tool to extract the constraints and translate them into Z3 Python code
            - I pasted the relevant section into ChatGPT-o3 and it generated the correct Z3 conditions [flawlessly](./writeup/password_solver.py)
6) After solving the system of constraints, we patch the original `ENTER___PASSWORD` bytes in the archive with the computed 16-byte password.

## Flag
SAS{4rch1v3d_cl455iqu3_r3_t45k}

**Solved by:** 8 teams