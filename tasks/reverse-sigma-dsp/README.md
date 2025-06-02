## Title
Sigma DSP

## Description
Sigma Acoustic Calibrator helps protect your hearing by playing a short reference signal and dynamic audio, letting you adjust your system volume to a safe, comfortable level.

## Solution
1) We're given a web page with a single “Start” button. When clicked, we hear a voice say: "Your flag is SAS{" followed by a looping Sigma Boy sound, after some time, we hear the voice again saying "close curly bracket"
    - The page includes HTML, JavaScript, and WASM files. The JavaScript is not minified, and from examining it, we can see that it uses Faust — a technology for real-time audio synthesis.
    - This suggests that the actual flag is being synthesized via the WASM file.
2) Let's use tools from the WABT package. Firstly decompile the .wasm file into a human-readable format using `wasm-decompile dsp-module.wasm -o dsp-module.dcmp`.
    - Upon analyzing the decompiled code, we find a massive function that is called within the exported function `init`. This function appears to initialize a large array of constants.
    - More interestingly, we find another exported function `compute`. This function seems to contain the core logic.
3) Let's take a look at how [Faust](https://faustdoc.grame.fr/manual/quick-start/#quick-start) code typically works.
    - Usually, there's a main `process` function, which defines the digital signal processing pipeline.
    This function returns audio samples or in other words, just floating-point numbers that represent sound.
    - So, it's very likely that the compiled WebAssembly `compute` function corresponds directly to Faust's `process` function. - By examining the body of `compute`, we can probably identify the section that corresponds to `process`'s return value in the original Faust source.
    ```
    (e + f)[0]:float =
      0.5f *
      (0.000031f *
       f32_convert_i32_s(if (j < 32768) { j } else { j + -65536 }) +
       0.000061f *
       f32_convert_i32_s(if (l < 32768) { l } else { l + -65536 }));
    ```
    - In the `compute` function, we see that two values are added together and then divided by 2. This is a common technique in audio processing used to mix two audio signals without exceeding amplitude limits by averaging them.
    - This strongly suggests that the synthesized output consists of two separate tracks: one containing the spoken flag, another with the Sigma Boy sound. They are being mixed together in real time.
    - Our goal is to prevent the Sigma Boy track from being included in the final mix.
4) Let's use the `wasm2wat dsp-module.wasm -o dsp-module.wat` utility to convert the `.wasm` binary into its textual WebAssembly format. So we can modify assembly, and build it back.
5) We need to figure out which of the two audio tracks to remove, but we don't need a deep analysis — we can simply try both options one by one.
In the .wat file, we locate the `compute` function. Toward the end of the function, we see two `i32` values being converted to `f32`, then added together and multiplied (likely by 0.5).
    - To mute one of the tracks, we can replaces top stack value with `0` just before the `i32` to `f32` conversion
    ```
            if (result i32)  ;; label = @3
              local.get 9
            else
              local.get 9
              i32.const -65536
              i32.add
            end
    +       drop
    +       i32.const 0
            f32.convert_i32_s
            f32.mul
            f32.const 0x1p-14 (;=6.10352e-05;)
            local.get 11
            i32.const 32768
            i32.lt_s
            if (result i32)  ;; label = @3
              local.get 11
            else
              local.get 11
              i32.const -65536
              i32.add
            end
            f32.convert_i32_s
            f32.mul
            f32.add
            f32.mul
    ```
6) Let's test our changes!
    - Build it back using `wat2wasm dsp-module.wat -o dsp-module.wasm`.
    - To test it we have to download all files, replace .wasm module and use some local web server, for example `python -m http.server --bind 127.0.0.1`
        ```
        ├── assets
        │   ├── dsp-module-zxlZi3iI.wasm
        │   └── index-Dm2-F_VW.js
        └── index.html
        ```
    - And it works! Instead of hearing "SAS{Sigma Boy...Sigma Boy}", we hear the Sigma Boy sound at the start now, when in place of the middle part we can now clearly hear the actual letters of the flag being spoken!

There's also an alternative approach you could take.
- Instead of patching the WebAssembly, you could extract all the numbers from `init` function. Understand how these numbers are converted into audio signals, write them into two separate .wav files and listen to them individually. For the especially curious, you could go one step further and combine the flag prefix and body into a single clean track.

## Flag
SAS{F4U5T_DSP_IS_4_S1GM4_S1GN}

**Solved by:** 8 teams