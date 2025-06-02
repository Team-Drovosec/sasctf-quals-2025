from pathlib import Path
import shutil
import soundfile as sf, numpy as np
import subprocess

dataLoop, srLoop = sf.read("sigmaboyLoop16k.wav")
assert srLoop == 16000 and len(dataLoop) == 1 * 16000
dataPackedLoop = np.clip(np.round(dataLoop * 32767), -32768, 32767).astype(np.int16).astype(np.uint16)

dataFlag, srFlag = sf.read("flag16k.wav")
assert srFlag == 16000 and len(dataFlag) == 24 * 16000
nSigmaStart, nSigmaEnd = 4 * 16000, 22 * 16000

dataFlag[:nSigmaStart] = dataFlag[:nSigmaStart] - np.resize(dataLoop, nSigmaStart)
dataFlag[nSigmaEnd:] = dataFlag[nSigmaEnd:] - np.resize(dataLoop, len(dataFlag) - nSigmaEnd)
dataFlag /= 2
dataPackedFlag = np.clip(np.round(dataFlag * 32767), -32768, 32767).astype(np.int16).astype(np.uint16)

with open("main.dsp") as f:
    with open("main_.dsp", "w") as fOut:
        strLoop = ", ".join(f"{x}" for x in dataPackedLoop)
        strFlag = ", ".join(f"{a^b}" for a, b in zip(dataPackedFlag, np.resize(dataPackedLoop, len(dataPackedFlag))))
        fOut.write(f.read()
                   .replace("waveLoop = waveform {};", f"waveLoop = waveform {{{strLoop}}};")
                   .replace("waveFlag = waveform {};", f"waveFlag = waveform {{{strFlag}}};")
                   )

strWasmTo = "./tmp"
subprocess.run(["node", r"faust2wasm.js", "main_.dsp", strWasmTo], check=True)


def ignore_root_files(cur_dir: str, _: list[str]) -> set[str]:
    if Path(cur_dir).resolve() == Path(strWasmTo).resolve():
        return {'index.html', 'index.js'}
    return set()

shutil.copytree(
    strWasmTo,
    "../server/sigmadsp/src",
    ignore=ignore_root_files,
    dirs_exist_ok=True,
)
