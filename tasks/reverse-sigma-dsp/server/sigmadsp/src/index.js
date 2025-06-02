import { createFaustNode, connectToAudioInput } from "./create-node.js";

const $buttonDsp = document.getElementById("button-dsp");
$buttonDsp.onclick = async () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioCtx({ latencyHint: 0.00001 });
    const result = await createFaustNode(audioContext, "main_", 0);
    const faustNode = result.faustNode;
    if (!faustNode) throw new Error("Faust DSP not compiled");
    faustNode.connect(audioContext.destination);
    if (faustNode.getNumInputs() > 0) {
        await connectToAudioInput(audioContext, null, faustNode, null);
    }
    $buttonDsp.disabled = true;
}
