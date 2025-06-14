import { FaustMonoDspGenerator } from "./faustwasm/index.js";

import dspMeta from "./dsp-meta.json"
import dspWasm from "./dsp-module.wasm?url";

// @ts-check

/**
 * @typedef {{ dspModule: WebAssembly.Module; dspMeta: FaustDspMeta; effectModule?: WebAssembly.Module; effectMeta?: FaustDspMeta; mixerModule?: WebAssembly.Module }} FaustDspDistribution
 * @typedef {import("./faustwasm").FaustDspMeta} FaustDspMeta
 * @typedef {import("./faustwasm").FaustMonoAudioWorkletNode} FaustMonoAudioWorkletNode
 * @typedef {import("./faustwasm").FaustPolyAudioWorkletNode} FaustPolyAudioWorkletNode
 * @typedef {import("./faustwasm").FaustMonoScriptProcessorNode} FaustMonoScriptProcessorNode
 * @typedef {import("./faustwasm").FaustPolyScriptProcessorNode} FaustPolyScriptProcessorNode
 * @typedef {FaustMonoAudioWorkletNode | FaustPolyAudioWorkletNode | FaustMonoScriptProcessorNode | FaustPolyScriptProcessorNode} FaustNode
 */

/**
 * Creates a Faust audio node for use in the Web Audio API.
 *
 * @param {AudioContext} audioContext - The Web Audio API AudioContext to which the Faust audio node will be connected.
 * @param {string} [dspName] - The name of the DSP to be loaded.
 * @param {number} [voices] - The number of voices to be used for polyphonic DSPs.
 * @param {boolean} [sp] - Whether to create a ScriptProcessorNode instead of an AudioWorkletNode.
 * @returns {Promise<{ faustNode: FaustNode | null; dspMeta: FaustDspMeta }>} - An object containing the Faust audio node and the DSP metadata.
 */
const createFaustNode = async (audioContext, dspName = "template", voices = 0, sp = false, bufferSize = 512) => {

    // Load DSP metadata from JSON
    /** @type {FaustDspMeta} */
    // const dspMeta = dspMeta;

    // Compile the DSP module from WebAssembly binary data
    const dspModule = await WebAssembly.compileStreaming(await fetch(dspWasm));

    // Create an object representing Faust DSP with metadata and module
    /** @type {FaustDspDistribution} */
    const faustDsp = { dspMeta, dspModule };

    /** @type {FaustNode | null} */
    let faustNode = null;
    // Create a standard Faust audio node
    const generator = new FaustMonoDspGenerator();
    faustNode = await generator.createNode(
        audioContext,
        dspName,
        { module: faustDsp.dspModule, json: JSON.stringify(faustDsp.dspMeta), soundfiles: {} },
        sp,
        bufferSize
    );

    // Return an object with the Faust audio node and the DSP metadata
    return { faustNode, dspMeta };
}

/**
 * Connects an audio input stream to a Faust WebAudio node.
 * 
 * @param {AudioContext} audioContext - The Web Audio API AudioContext to which the Faust audio node is connected.
 * @param {string} id - The ID of the audio input device to connect.
 * @param {FaustNode} faustNode - The Faust audio node to which the audio input stream will be connected.
 * @param {MediaStreamAudioSourceNode} oldInputStreamNode - The old audio input stream node to be disconnected from the Faust audio node.
 * @returns {Promise<MediaStreamAudioSourceNode>} - The new audio input stream node connected to the Faust audio node.
 */
async function connectToAudioInput(audioContext, id, faustNode, oldInputStreamNode) {
    // Create an audio input stream node
    const constraints = {
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            deviceId: id ? { exact: id } : undefined,
        },
    };
    // Get the audio input stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (stream) {
        if (oldInputStreamNode) oldInputStreamNode.disconnect();
        const newInputStreamNode = audioContext.createMediaStreamSource(stream);
        newInputStreamNode.connect(faustNode);
        return newInputStreamNode;
    } else {
        return oldInputStreamNode;
    }
};

// Export the functions
export { createFaustNode, connectToAudioInput };

