import { ComputeShader, StorageBuffer, WebGPUEngine } from "@babylonjs/core";

export function wgsl(
    strings: TemplateStringsArray,
    ...exprs: unknown[]
  ): string {
    return String.raw({ raw: strings }, ...exprs);
  }

const VertexStruct = wgsl`
    struct Vertex {
        // pos : vec3<f32>,
        xxx : vec4<u32>,
        // res : vec4<f32>,
    };
`;

interface WavesShaderData {
    engine: WebGPUEngine;
    vertices: StorageBuffer;
    triangleNeighboursPrev: StorageBuffer;
    triangleNeighboursNext: StorageBuffer;
    triangleWaveStatePrev: StorageBuffer;
    triangleWaveStateNext: StorageBuffer;
    changed: StorageBuffer;
}

export function WavesShader({engine, vertices, triangleNeighboursPrev, triangleNeighboursNext, triangleWaveStatePrev, triangleWaveStateNext, changed}: WavesShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs1",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read_write> vertices : array<Vertex>;
                @binding(1) @group(0) var<storage, read> triangleNeighboursPrev : array<vec3u>;
                @binding(2) @group(0) var<storage, read_write> triangleNeighboursNext : array<vec3u>;
                @binding(3) @group(0) var<storage, read> triangleWaveStatePrev : array<u32>;
                @binding(4) @group(0) var<storage, read_write> triangleWaveStateNext : array<u32>;
                @binding(5) @group(0) var<storage, read_write> changed : u32;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&triangleWaveStatePrev)) {
                        var nextState = triangleWaveStatePrev[i];
                        var nextNeighbourState = triangleNeighboursPrev[i];
            
                        if ((nextState & 0x80000000) == 0) {
                            for(var x=u32(0); x<3; x++) {
                                let neighbourId = triangleNeighboursPrev[i][x];
                                if (neighbourId != 0xFFFFFFFF && triangleWaveStatePrev[neighbourId] != 0 &&
                                    (triangleWaveStatePrev[neighbourId] & 0x80000000) == 0 && triangleWaveStatePrev[i] != triangleWaveStatePrev[neighbourId]) {
                                    if (triangleWaveStatePrev[i] == 0) {
                                        nextState = triangleWaveStatePrev[neighbourId];
                                    } else {
                                        nextState |= 0x80000000;
                                        nextNeighbourState[x] = 0xFFFFFFFF;
                                    }
                                    break;
                                }
                            }
                        }
                        triangleNeighboursNext[i] = nextNeighbourState;
                        triangleWaveStateNext[i] = nextState;
                        if (nextState != triangleWaveStatePrev[i] || any(nextNeighbourState != triangleNeighboursPrev[i])) {
                            changed = 1;
                            vertices[i * 3 + 0].xxx.w = nextState;
                            vertices[i * 3 + 1].xxx.w = nextState;
                            vertices[i * 3 + 2].xxx.w = nextState;
                        }
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "vertices": { group: 0, binding: 0 },
                "triangleNeighboursPrev": { group: 0, binding: 1 },
                "triangleNeighboursNext": { group: 0, binding: 2 },
                "triangleWaveStatePrev": { group: 0, binding: 3 },
                "triangleWaveStateNext": { group: 0, binding: 4 },
                "changed": { group: 0, binding: 5 },
            }
        }
    );
    cs.setStorageBuffer("vertices", vertices);
    cs.setStorageBuffer("triangleNeighboursPrev", triangleNeighboursPrev);
    cs.setStorageBuffer("triangleNeighboursNext", triangleNeighboursNext);
    cs.setStorageBuffer("triangleWaveStatePrev", triangleWaveStatePrev);
    cs.setStorageBuffer("triangleWaveStateNext", triangleWaveStateNext);
    cs.setStorageBuffer("changed", changed);
    return cs;
}

interface MergeShaderData {
    engine: WebGPUEngine;
    triangleWaveStateNew: StorageBuffer;
    triangleWaveStateDst: StorageBuffer;
}

export function MergeShader({engine, triangleWaveStateNew, triangleWaveStateDst}: MergeShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs2",
        engine,
        {
            computeSource: wgsl`
                @binding(0) @group(0) var<storage, read> triangleWaveStateNew : array<u32>;
                @binding(1) @group(0) var<storage, read_write> triangleWaveStateDst : array<u32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&triangleWaveStateNew)) {
                        if (triangleWaveStateNew[i] != 0) {
                            triangleWaveStateDst[i] = triangleWaveStateNew[i] & 0x7FFFFFFF;
                        }
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "triangleWaveStateNew": { group: 0, binding: 0 },
                "triangleWaveStateDst": { group: 0, binding: 1 },
            }
        }
    );
    cs.setStorageBuffer("triangleWaveStateNew", triangleWaveStateNew);
    cs.setStorageBuffer("triangleWaveStateDst", triangleWaveStateDst);
    return cs;
}

interface WavesCountShaderData {
    engine: WebGPUEngine;
    triangleWaveState: StorageBuffer;
    wavesCount: StorageBuffer;
}

export function WavesCountShader({engine, triangleWaveState, wavesCount}: WavesCountShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs3",
        engine,
        {
            computeSource: wgsl`
                @binding(0) @group(0) var<storage, read> triangleWaveState : array<u32>;
                @binding(1) @group(0) var<storage, read_write> wavesCount : array<atomic<u32>>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&triangleWaveState)) {
                        atomicAdd(&wavesCount[triangleWaveState[i]-1], 1u);
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "triangleWaveState": { group: 0, binding: 0 },
                "wavesCount": { group: 0, binding: 1 },
            }
        }
    );
    cs.setStorageBuffer("triangleWaveState", triangleWaveState);
    cs.setStorageBuffer("wavesCount", wavesCount);
    return cs;
}

interface GenerateWaveMoveShaderData {
    engine: WebGPUEngine;
    wavesCount: StorageBuffer;
    waveMatrix: StorageBuffer;
}

export function GenerateWaveMoveShader({engine, wavesCount, waveMatrix}: GenerateWaveMoveShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs8",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                struct WaveMatrix {
                    matrix: array<i32, 12>,
                    state0: u32,
                    state1: u32,
                    state2: u32,
                    state3: u32,
                };

                @binding(0) @group(0) var<storage, read> wavesCount : array<u32>;
                @binding(1) @group(0) var<storage, read_write> waveMatrix : array<WaveMatrix>;

                fn rand_u(state: ptr<storage, u32, read_write>) -> u32 {
                    *state = *state * 747796405u + 2891336453u;
                    let word = ((*state >> ((*state >> 28u) + 4u)) ^ *state) * 277803737u;
                    return (word >> 22u) ^ word;
                }
                const ROTATIONS = array(
                    array<i32, 9>(1, 0, 0, 0, 1, 0, 0, 0, 1),
                    array<i32, 9>(1, 0, 0, 0, -1, 0, 0, 0, -1),
                    array<i32, 9>(1, 0, 0, 0, 0, 1, 0, -1, 0),
                    array<i32, 9>(1, 0, 0, 0, 0, -1, 0, 1, 0),
                    array<i32, 9>(-1, 0, 0, 0, 1, 0, 0, 0, -1),
                    array<i32, 9>(-1, 0, 0, 0, -1, 0, 0, 0, 1),
                    array<i32, 9>(-1, 0, 0, 0, 0, 1, 0, 1, 0),
                    array<i32, 9>(-1, 0, 0, 0, 0, -1, 0, -1, 0),
                    array<i32, 9>(0, 1, 0, 1, 0, 0, 0, 0, -1),
                    array<i32, 9>(0, 1, 0, -1, 0, 0, 0, 0, 1),
                    array<i32, 9>(0, 1, 0, 0, 0, 1, 1, 0, 0),
                    array<i32, 9>(0, 1, 0, 0, 0, -1, -1, 0, 0),
                    array<i32, 9>(0, -1, 0, 1, 0, 0, 0, 0, 1),
                    array<i32, 9>(0, -1, 0, -1, 0, 0, 0, 0, -1),
                    array<i32, 9>(0, -1, 0, 0, 0, 1, -1, 0, 0),
                    array<i32, 9>(0, -1, 0, 0, 0, -1, 1, 0, 0),
                    array<i32, 9>(0, 0, 1, 1, 0, 0, 0, 1, 0),
                    array<i32, 9>(0, 0, 1, -1, 0, 0, 0, -1, 0),
                    array<i32, 9>(0, 0, 1, 0, 1, 0, -1, 0, 0),
                    array<i32, 9>(0, 0, 1, 0, -1, 0, 1, 0, 0),
                    array<i32, 9>(0, 0, -1, 1, 0, 0, 0, -1, 0),
                    array<i32, 9>(0, 0, -1, -1, 0, 0, 0, 1, 0),
                    array<i32, 9>(0, 0, -1, 0, 1, 0, 1, 0, 0),
                    array<i32, 9>(0, 0, -1, 0, -1, 0, -1, 0, 0)
                );

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&waveMatrix) && wavesCount[i] != 0) {
                        let rot = rand_u(&waveMatrix[i].state0) % 24;
                        waveMatrix[i].matrix[0] = ROTATIONS[rot][0];
                        waveMatrix[i].matrix[1] = ROTATIONS[rot][1];
                        waveMatrix[i].matrix[2] = ROTATIONS[rot][2];
                        waveMatrix[i].matrix[3] = i32(rand_u(&waveMatrix[i].state0)) % 2048 - 1024;
                        waveMatrix[i].matrix[4] = ROTATIONS[rot][3];
                        waveMatrix[i].matrix[5] = ROTATIONS[rot][4];
                        waveMatrix[i].matrix[6] = ROTATIONS[rot][5];
                        waveMatrix[i].matrix[7] = i32(rand_u(&waveMatrix[i].state0)) % 2048 - 1024;
                        waveMatrix[i].matrix[8] = ROTATIONS[rot][6];
                        waveMatrix[i].matrix[9] = ROTATIONS[rot][7];
                        waveMatrix[i].matrix[10] = ROTATIONS[rot][8];
                        waveMatrix[i].matrix[11] = i32(rand_u(&waveMatrix[i].state0)) % 2048 - 1024;
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "wavesCount": { group: 0, binding: 0 },
                "waveMatrix": { group: 0, binding: 1 },
            }
        }
    );
    cs.setStorageBuffer("wavesCount", wavesCount);
    cs.setStorageBuffer("waveMatrix", waveMatrix);
    return cs;
}

interface TryMoveShaderData {
    engine: WebGPUEngine;
    vertices: StorageBuffer;
    waveMatrix: StorageBuffer;
    failedMoves: StorageBuffer;
    triangleWaveState: StorageBuffer;
}

export function TryMoveShader({engine, vertices, waveMatrix, failedMoves, triangleWaveState}: TryMoveShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs4",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read> vertices : array<Vertex>;
                @binding(1) @group(0) var<storage, read> waveMatrix : array<array<i32, 16>>;
                @binding(2) @group(0) var<storage, read_write> failedMoves : array<atomic<u32>>;
                @binding(3) @group(0) var<storage, read> triangleWaveState : array<u32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&triangleWaveState)) {
                        let waveId = triangleWaveState[i]-1;
                        let tm = waveMatrix[waveId];
                        for (var s=u32(0); s < 3; s++) {
                            let x0 = i32(vertices[3*i+s].xxx.x & 0xFFF);
                            let y0 = i32(vertices[3*i+s].xxx.y & 0xFFF);
                            let z0 = i32((vertices[3*i+s].xxx.x >> 12) & 0xFFF);
                            var x1 = tm[0]*x0 + tm[1]*y0 + tm[2]*z0 + tm[3];
                            var y1 = tm[4]*x0 + tm[5]*y0 + tm[6]*z0 + tm[7];
                            var z1 = tm[8]*x0 + tm[9]*y0 + tm[10]*z0 + tm[11];

                            let rMax = 1024;
                            let vx = x1 - 1024;
                            let vy = y1 - 2048;

                            if (x1 < 0 || 4095 < x1 || y1 < 0 || 4095 < y1 || z1 < 0 || 4095 < z1 || 4 * rMax*rMax < 4 * vx * vx + vy * vy) {
                                atomicAdd(&failedMoves[waveId], 1);
                            }
                        }
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "vertices": { group: 0, binding: 0 },
                "waveMatrix": { group: 0, binding: 1 },
                "failedMoves": { group: 0, binding: 2 },
                "triangleWaveState": { group: 0, binding: 3 },
            }
        }
    );
    cs.setStorageBuffer("vertices", vertices);
    cs.setStorageBuffer("waveMatrix", waveMatrix);
    cs.setStorageBuffer("failedMoves", failedMoves);
    cs.setStorageBuffer("triangleWaveState", triangleWaveState);
    return cs;
}

interface MoveShaderData {
    engine: WebGPUEngine;
    vertices: StorageBuffer;
    waveMatrix: StorageBuffer;
    triangleWaveState: StorageBuffer;
    failedMoves: StorageBuffer;
}

export function MoveShader({engine, vertices, waveMatrix, triangleWaveState, failedMoves}: MoveShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs5",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read_write> vertices : array<Vertex>;
                @binding(1) @group(0) var<storage, read> waveMatrix : array<array<i32, 16>>;
                @binding(2) @group(0) var<storage, read> triangleWaveState : array<u32>;
                @binding(3) @group(0) var<storage, read> failedMoves : array<u32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&triangleWaveState)) {
                        if (failedMoves[triangleWaveState[i]-1] == 0) {
                            let tm = waveMatrix[triangleWaveState[i]-1];
                            for (var s=u32(0); s < 3; s++) {
                                let x0 = i32(vertices[3*i+s].xxx.x & 0xFFF);
                                let y0 = i32(vertices[3*i+s].xxx.y & 0xFFF);
                                let z0 = i32((vertices[3*i+s].xxx.x >> 12) & 0xFFF);

                                vertices[3*i+s].xxx.x = u32(tm[0]*x0 + tm[1]*y0 + tm[2]*z0 + tm[3]) | (u32(tm[8]*x0 + tm[9]*y0 + tm[10]*z0 + tm[11]) << 12);
                                vertices[3*i+s].xxx.y = u32(tm[4]*x0 + tm[5]*y0 + tm[6]*z0 + tm[7]);
                            }
                        }
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "vertices": { group: 0, binding: 0 },
                "waveMatrix": { group: 0, binding: 1 },
                "triangleWaveState": { group: 0, binding: 2 },
                "failedMoves": { group: 0, binding: 3 },
            }
        }
    );
    cs.setStorageBuffer("vertices", vertices);
    cs.setStorageBuffer("waveMatrix", waveMatrix);
    cs.setStorageBuffer("triangleWaveState", triangleWaveState);
    cs.setStorageBuffer("failedMoves", failedMoves);
    return cs;
}

interface GenValueShaderData {
    engine: WebGPUEngine;
    triangleWaveState: StorageBuffer;
    genValue: StorageBuffer;
}

export function GenValueShader({engine, triangleWaveState, genValue}: GenValueShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs8",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read> triangleWaveState : array<u32>;
                @binding(1) @group(0) var<storage, read_write> genValue : atomic<u32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&triangleWaveState)) {
                        atomicAdd(&genValue, triangleWaveState[i]);
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "triangleWaveState": { group: 0, binding: 0 },
                "genValue": { group: 0, binding: 1 },
            }
        }
    );
    cs.setStorageBuffer("triangleWaveState", triangleWaveState);
    cs.setStorageBuffer("genValue", genValue);
    return cs;
}

interface Decrypt4ShaderData {
    engine: WebGPUEngine;
    vertices: StorageBuffer;
    genValue: StorageBuffer;
}

export function Decrypt4Shader({engine, vertices, genValue}: Decrypt4ShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs6",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read_write> vertices : array<Vertex>;
                @binding(1) @group(0) var<storage, read> genValue : u32;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var x : u32 = GlobalInvocationID.x;
                    if (x < arrayLength(&vertices)/3) {
                        var S : array<u32, 256u>;
                        for (var i = 0u; i < 256u; i++) { S[i] = i; }

                        var j : u32 = 0u;
                        for (var i = 0u; i < 32u; i++) {
                            let idx = 3*x+i%3;
                            for(var t=0u; t<2u; t++) {
                                let part = select(vertices[idx].xxx.x, vertices[idx].xxx.y, t==0u) ^ genValue;
                                for (var b=0u; b < 4u; b++) {
                                    j = (j + S[4*i + b] + ((part >> (b * 8u)) & 0xFF)) & 0xFF;
                                    let tmp = S[4*i + b];  S[4*i + b] = S[j];  S[j] = tmp;
                                }
                            }
                        }

                        var i_p : u32 = 0u;
                        var j_p : u32 = 0u;

                        for (var i=0u; i < 3; i++) {
                            var ks_word : u32 = 0u;
                            for (var b=0u; b < 4u; b++) {
                                i_p = (i_p + 1u) & 0xFFu;
                                j_p = (j_p + S[i_p]) & 0xFFu;
                                let tmp = S[i_p];  S[i_p] = S[j_p];  S[j_p] = tmp;

                                ks_word |= (S[(S[i_p] + S[j_p]) & 0xFFu] << (b * 8u));
                            }
                            vertices[3*x+i].xxx.z ^= ks_word;
                        }
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "vertices": { group: 0, binding: 0 },
                "genValue": { group: 0, binding: 1 },
            }
        }
    );
    cs.setStorageBuffer("vertices", vertices);
    cs.setStorageBuffer("genValue", genValue);
    return cs;
}


// interface Decrypt4DumpKeysShaderData {
//     engine: WebGPUEngine;
//     vertices: StorageBuffer;
//     genValue: StorageBuffer;
//     keysDump: StorageBuffer;
// }

// export function Decrypt4DumpKeysShader({engine, vertices, genValue, keysDump}: Decrypt4DumpKeysShaderData): ComputeShader {
//     const cs = new ComputeShader(
//         "_cs6",
//         engine,
//         {
//             computeSource: `
//                 ${VertexStruct}

//                 @binding(0) @group(0) var<storage, read_write> vertices : array<Vertex>;
//                 @binding(1) @group(0) var<storage, read> genValue : u32;
//                 @binding(2) @group(0) var<storage, read_write> keysDump: array<array<u32, 256>>;

//                 @compute @workgroup_size(64)
//                 fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
//                     var x : u32 = GlobalInvocationID.x;
//                     if (x < arrayLength(&vertices)/3) {
//                         for (var i = 0u; i < 256u; i++) { keysDump[x][i] = i; }

//                         var j : u32 = 0u;
//                         for (var i = 0u; i < 32u; i++) {
//                             let idx = 3*x+i%3;
//                             for(var t=0u; t<2u; t++) {
//                                 let part = select(vertices[idx].xxx.x, vertices[idx].xxx.y, t==0u) ^ genValue;
//                                 for (var b=0u; b < 4u; b++) {
//                                     j = (j + keysDump[x][4*i + b] + ((part >> (b * 8u)) & 0xFF)) & 0xFF;
//                                     let tmp = keysDump[x][4*i + b];  keysDump[x][4*i + b] = keysDump[x][j];  keysDump[x][j] = tmp;
//                                 }
//                             }
//                         }
//                     }
//                 }
//             `
//         },
//         {
//             bindingsMapping: {
//                 "vertices": { group: 0, binding: 0 },
//                 "genValue": { group: 0, binding: 1 },
//                 "keysDump": { group: 0, binding: 2 },
//             }
//         }
//     );
//     cs.setStorageBuffer("vertices", vertices);
//     cs.setStorageBuffer("genValue", genValue);
//     cs.setStorageBuffer("keysDump", keysDump);
//     return cs;
// }

// interface Decrypt4DumpFinalXorShaderData {
//     engine: WebGPUEngine;
//     vertices: StorageBuffer;
//     finalXorDump: StorageBuffer;
// }

// export function Decrypt4DumpFinalXorShader({engine, vertices, finalXorDump}: Decrypt4DumpFinalXorShaderData): ComputeShader {
//     const cs = new ComputeShader(
//         "__cs6",
//         engine,
//         {
//             computeSource: `
//                 ${VertexStruct}

//                 @binding(0) @group(0) var<storage, read> vertices : array<Vertex>;
//                 @binding(1) @group(0) var<storage, read_write> finalXorDump: array<u32>;

//                 @compute @workgroup_size(64)
//                 fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
//                     var x : u32 = GlobalInvocationID.x;
//                     if (x < arrayLength(&vertices)) {
//                         finalXorDump[x] = vertices[x].xxx.x ^ (vertices[x].xxx.y << 6);
//                     }
//                 }
//             `
//         },
//         {
//             bindingsMapping: {
//                 "vertices": { group: 0, binding: 0 },
//                 "finalXorDump": { group: 0, binding: 1 },
//             }
//         }
//     );
//     cs.setStorageBuffer("vertices", vertices);
//     cs.setStorageBuffer("finalXorDump", finalXorDump);
//     return cs;
// }

// interface Decrypt4DbgShaderData {
//     engine: WebGPUEngine;
//     vertices: StorageBuffer;
//     dbgDump: StorageBuffer;
// }

// export function Decrypt4DbgShader({engine, vertices, dbgDump}: Decrypt4DbgShaderData): ComputeShader {
//     const cs = new ComputeShader(
//         "___cs6",
//         engine,
//         {
//             computeSource: `
//                 ${VertexStruct}

//                 @binding(0) @group(0) var<storage, read> vertices : array<Vertex>;
//                 @binding(1) @group(0) var<storage, read_write> dbgDump: array<u32>;

//                 @compute @workgroup_size(64)
//                 fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
//                     var x : u32 = GlobalInvocationID.x;
//                     if (x < arrayLength(&vertices)) {
//                         dbgDump[x] = vertices[x].xxx.z;
//                     }
//                 }
//             `
//         },
//         {
//             bindingsMapping: {
//                 "vertices": { group: 0, binding: 0 },
//                 "dbgDump": { group: 0, binding: 1 },
//             }
//         }
//     );
//     cs.setStorageBuffer("vertices", vertices);
//     cs.setStorageBuffer("dbgDump", dbgDump);
//     return cs;
// }

interface UpdateQuadsShaderData {
    engine: WebGPUEngine;
    vertices: StorageBuffer;
    quads: StorageBuffer;
    genValue: StorageBuffer;
}

export function UpdateQuadsShader({engine, genValue, vertices, quads}: UpdateQuadsShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs7",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read> vertices : array<Vertex>;
                @binding(1) @group(0) var<storage, read_write> quads : array<vec3u>;
                @binding(2) @group(0) var<storage, read> genValue : u32;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&quads)) {
                        quads[i].y ^= genValue + (vertices[6*i+0].xxx.x ^ vertices[6*i+1].xxx.y ^ vertices[6*i+2].xxx.x ^ vertices[6*i+3].xxx.y ^ vertices[6*i+4].xxx.x ^ vertices[6*i+5].xxx.y) * 747796405u + 2891336453u;
                        quads[i].z ^= genValue + (vertices[6*i+0].xxx.y ^ vertices[6*i+1].xxx.x ^ vertices[6*i+2].xxx.y ^ vertices[6*i+3].xxx.x ^ vertices[6*i+4].xxx.y ^ vertices[6*i+5].xxx.x) * 747796405u + 2891336453u;
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "vertices": { group: 0, binding: 0 },
                "quads": { group: 0, binding: 1 },
                "genValue": { group: 0, binding: 2 },
            }
        }
    );
    cs.setStorageBuffer("vertices", vertices);
    cs.setStorageBuffer("quads", quads);
    cs.setStorageBuffer("genValue", genValue);
    return cs;
}

interface DeformToStateShaderData {
    engine: WebGPUEngine;
    vertices: StorageBuffer;
}

export function DeformToStateShader({engine, vertices}: DeformToStateShaderData): ComputeShader {
    const cs = new ComputeShader(
        "cs8",
        engine,
        {
            computeSource: wgsl`
                ${VertexStruct}

                @binding(0) @group(0) var<storage, read_write> vertices : array<Vertex>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
                    var i : u32 = GlobalInvocationID.x;
                    if (i < arrayLength(&vertices)) {
                        vertices[i].xxx.x ^= vertices[i].xxx.w & 0xFFFFFF;
                        vertices[i].xxx.y ^= (vertices[i].xxx.y >> 12) & 0xFFF;
                    }
                }
            `
        },
        {
            bindingsMapping: {
                "vertices": { group: 0, binding: 0 },
            }
        }
    );
    cs.setStorageBuffer("vertices", vertices);
    return cs;
}
