import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { Scene } from "@babylonjs/core/scene";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { PBRMaterial, DynamicTexture, StandardMaterial, Color3, Vector2, ActionManager, UniversalCamera, ExecuteCodeAction, SetValueAction, ActionEvent, Constants, VertexBuffer, Mesh, StorageBuffer, UniformBuffer, AnimationGroup, Animation, TransformNode, AnimationEvent, Observer, Nullable, Geometry, Tools, BoundingInfo } from "@babylonjs/core";
import "@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture";
import { AppendSceneAsync, ISceneLoaderPluginFactory, SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import sceneGlb from "./scene.glb";
import { GLTFFileLoader, IGLTFLoaderExtension } from "@babylonjs/loaders/glTF";
import "@babylonjs/core/Loading/loadingScreen";
import '@babylonjs/loaders/glTF/2.0/Extensions/ExtrasAsMetadata';
import { ArrayItem, GLTFLoader, IMeshPrimitive, registerGLTFExtension } from "@babylonjs/loaders/glTF/2.0";
import { Decrypt4Shader, DeformToStateShader as DeformShapeShader, GenerateWaveMoveShader, GenValueShader, MergeShader, MoveShader, TryMoveShader, UpdateQuadsShader, WavesCountShader, WavesShader, wgsl } from "./computing";
// import { Decrypt4DbgShader, Decrypt4DumpFinalXorShader, Decrypt4DumpKeysShader } from "./computing";
import prand from "pure-rand";


class LoaderExtension implements IGLTFLoaderExtension {
    public readonly name = "LoaderExtension";
    public enabled = true;
    private _loader: GLTFLoader;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
    }
    public _loadVertexDataAsync(
        context: string,
        primitive: IMeshPrimitive,
        babylonMesh: Mesh
    ): Nullable<Promise<Geometry>> {
        const basePromise = (this._loader as any)._loadVertexDataAsync(context, primitive, babylonMesh);
        if (!basePromise) {
            return null;
        }
        return basePromise.then((geometry: Geometry) => {
            const promises = new Array<Promise<unknown>>();
            const loadAttribute = (name: string, kind: string) => {
                if (primitive.attributes[name] == undefined) {
                    return;
                }
    
                babylonMesh._delayInfo = babylonMesh._delayInfo || [];
                if (babylonMesh._delayInfo.indexOf(kind) === -1) {
                    babylonMesh._delayInfo.push(kind);
                }
    
                const accessor: any = ArrayItem.Get(`${context}/attributes/${name}`, (this._loader as any)._gltf.accessors, primitive.attributes[name]);
                promises.push(
                    this._loader._loadVertexAccessorAsync(`/accessors/${accessor.index}`, accessor, kind).then((babylonVertexBuffer) => {
                        geometry.setVerticesBuffer(babylonVertexBuffer, accessor.count);
                    })
                );
            };
            loadAttribute("_V0", "v0");
            loadAttribute("_V1", "v1");
            loadAttribute("_V2", "v2");
            loadAttribute("_V3", "v3");
            loadAttribute("_V4", "v4");
            loadAttribute("_V5", "v5");
            return Promise.all(promises).then(() => {
                return geometry;
            });
        });
    }

    public dispose() {}
}


await (async () => {
    registerGLTFExtension("LoaderExtension", false, (loader: GLTFLoader) => {
        return new LoaderExtension(loader);
    });
    (SceneLoader.GetPluginForExtension(".glb") as ISceneLoaderPluginFactory).createPlugin = () => {
        const loader = new GLTFFileLoader();
        loader.useSRGBBuffers = false;
        return loader;
    };
    const canvas = document.querySelector("#target")!;
    const engine = new WebGPUEngine(canvas as unknown as HTMLCanvasElement);
    await engine.initAsync();

    const resizeWatcher = new ResizeObserver(() => {
        engine.resize();
    });
    resizeWatcher.observe(canvas);

    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);
    await AppendSceneAsync(sceneGlb, scene);
    const flag = scene.getMeshById("flag")! as Mesh;
    flag.setBoundingInfo(new BoundingInfo(new Vector3(), new Vector3(1,1,1)));

    // {
        const positions = flag.getVerticesData(VertexBuffer.PositionKind)!;
        const vertexCount = positions.length / 3;
        const trianglesCount = vertexCount / 3;
        const quadsCount = trianglesCount / 2;

        const v0 = flag.getVerticesData("v0")!;
        const v1 = flag.getVerticesData("v1")!;
        const v2 = flag.getVerticesData("v2")!;
        const v3 = flag.getVerticesData("v3")!;
        const v4 = flag.getVerticesData("v4")!;
        const v5 = flag.getVerticesData("v5")!;
        const initialParticleData = new Uint32Array(vertexCount * 4);
        // const initialParticleData = new ArrayBuffer(vertexCount * 12 * 4);
        // const dataView = new DataView(initialParticleData);
        console.assert(v0.length == positions.length / 3);
        
        const initialQuadData = new Uint32Array(quadsCount * 4);
        for (let i = 0; i < vertexCount; i+=6) {
            initialQuadData[4*i/6 + 0] = v2[i];
        }
        const quadDataBuf = new StorageBuffer(engine, initialQuadData.byteLength, Constants.BUFFER_CREATIONFLAG_WRITE);
        quadDataBuf.update(initialQuadData);
        for (let i = 0; i < vertexCount; ++i) {
            // dataView.setFloat32((i * 12 + 0) * 4, positions[i * 3 + 0], true);
            // dataView.setFloat32((i * 12 + 1) * 4, positions[i * 3 + 1], true);
            // dataView.setFloat32((i * 12 + 2) * 4, positions[i * 3 + 2], true);
            // dataView.setFloat32((i * 12 + 3) * 4, 0);

            // dataView.setUint32((i * 12 + 4) * 4, v0[i], true);
            // dataView.setUint32((i * 12 + 5) * 4, (v1[i] & 0xFFF) | (v5[i] << 12), true);
            // dataView.setUint32((i * 12 + 6) * 4, v4[i] | (((v1[i] >> 12) & 0xFF) << 24), true);
            // dataView.setUint32((i * 12 + 7) * 4, v3[i], true);

            initialParticleData[4*i+0] = v0[i];
            initialParticleData[4*i+1] = (v1[i] & 0xFFF) | (v5[i] << 12);
            initialParticleData[4*i+2] = v4[i] | (((v1[i] >> 12) & 0xFF) << 24);
            initialParticleData[4*i+3] = v3[i];
        }
        const verticesDataBuf = new StorageBuffer(engine, initialParticleData.byteLength, Constants.BUFFER_CREATIONFLAG_VERTEX | Constants.BUFFER_CREATIONFLAG_WRITE);
        // flag.setVerticesBuffer(new VertexBuffer(engine, verticesDataBuf.getBuffer(), "pos", false, false, 12, false, 0, 3, VertexBuffer.FLOAT), false);
        // flag.setVerticesBuffer(new VertexBuffer(engine, verticesDataBuf.getBuffer(), "xxx", false, false, 12, false, 4, 4, VertexBuffer.UNSIGNED_INT), false);
        flag.setVerticesBuffer(new VertexBuffer(engine, verticesDataBuf.getBuffer(), "xxx", false, false, 4, false, 0, 4, VertexBuffer.UNSIGNED_INT), false);
        verticesDataBuf.update(initialParticleData);

        let bWash = 0;
        const ubuffer = new UniformBuffer(engine, undefined, true, "params");
        ubuffer.addUniform("bWash", 1);
        ubuffer.updateFloat("bWash", bWash);
        ubuffer.update();

        const triangleNeighboursData = new Uint32Array(trianglesCount * 4);
        {
            function compare1DArrays(a: number[], b: number[]): -1 | 0 | 1 {
                for (let i = 0; i < a.length; i++) {
                    if (a[i] < b[i]) {
                        return -1;
                    } else if (a[i] > b[i]) {
                        return 1;
                    }
                }
                return 0;
            }
            function compare2DArrays(a: number[][], b: number[][]): -1 | 0 | 1 {
                for (let i = 0; i < a.length; i++) {
                    const result = compare1DArrays(a[i], b[i]);
                    if (result !== 0) {
                        return result;
                    }
                }
                return 0;
            }

            const edges = [];
            for (let i = 0; i < trianglesCount; ++i) {
                const [p0, p1, p2] = [
                    [v0[3 * i + 0], v1[3 * i + 0] & 0xFFF],
                    [v0[3 * i + 1], v1[3 * i + 1] & 0xFFF],
                    [v0[3 * i + 2], v1[3 * i + 2] & 0xFFF]
                ].sort((a, b) => compare1DArrays(a, b));

                edges.push(
                    {"data": [p0,  p1], "triangle": i},
                    {"data": [p0,  p2], "triangle": i},
                    {"data": [p1,  p2], "triangle": i},
                );
            }
            edges.sort((a, b) => compare2DArrays(a.data, b.data));

            
            for(let i = 0; i < trianglesCount; ++i) {
                triangleNeighboursData[i * 4 + 0] = 0xFFFFFFFF;
                triangleNeighboursData[i * 4 + 1] = 0xFFFFFFFF;
                triangleNeighboursData[i * 4 + 2] = 0xFFFFFFFF;
            }
            const setNeigbour = (source: number, neighbour: number) => {
                if (triangleNeighboursData[source * 4 + 0] == 0xFFFFFFFF) {
                    triangleNeighboursData[source * 4 + 0] = neighbour;
                } else if (triangleNeighboursData[source * 4 + 1] == 0xFFFFFFFF) {
                    triangleNeighboursData[source * 4 + 1] = neighbour;
                } else {
                    console.assert(triangleNeighboursData[source * 4 + 2] == 0xFFFFFFFF);
                    triangleNeighboursData[source * 4 + 2] = neighbour;
                }
            };
            for(let i = 1; i < edges.length; ++i) {
                if (compare2DArrays(edges[i-1].data, edges[i].data) === 0) {
                    setNeigbour(edges[i-1].triangle, edges[i].triangle);
                    setNeigbour(edges[i].triangle, edges[i-1].triangle);
                }
            }
        }
        
        const triangleNeighbours = [
            new StorageBuffer(engine, triangleNeighboursData.byteLength, Constants.BUFFER_CREATIONFLAG_WRITE),
            new StorageBuffer(engine, triangleNeighboursData.byteLength, Constants.BUFFER_CREATIONFLAG_WRITE)
        ];
        triangleNeighbours[0].update(triangleNeighboursData);
        const triangleWaveState = [
            new StorageBuffer(engine, trianglesCount * 4, Constants.BUFFER_CREATIONFLAG_WRITE),
            new StorageBuffer(engine, trianglesCount * 4, Constants.BUFFER_CREATIONFLAG_WRITE),
            new StorageBuffer(engine, trianglesCount * 4, Constants.BUFFER_CREATIONFLAG_WRITE),
        ];

        const changed = new StorageBuffer(engine, 4, Constants.BUFFER_CREATIONFLAG_WRITE | Constants.BUFFER_CREATIONFLAG_READ);
        const changedData = new Uint32Array(1);
        changedData[0] = 0;
        const csWave = [
            WavesShader({
                engine,
                vertices: verticesDataBuf,
                triangleNeighboursPrev: triangleNeighbours[0],
                triangleNeighboursNext: triangleNeighbours[1],
                triangleWaveStatePrev: triangleWaveState[0],
                triangleWaveStateNext: triangleWaveState[1],
                changed,
            }),
            WavesShader({
                engine,
                vertices: verticesDataBuf,
                triangleNeighboursPrev: triangleNeighbours[1],
                triangleNeighboursNext: triangleNeighbours[0],
                triangleWaveStatePrev: triangleWaveState[1],
                triangleWaveStateNext: triangleWaveState[0],
                changed,
            }),
        ];
        const csMerge = MergeShader({
            engine,
            triangleWaveStateNew: triangleWaveState[0],
            triangleWaveStateDst: triangleWaveState[2],
        });
        const wavesMax = trianglesCount * 2;
        const wavesCount = new StorageBuffer(engine, wavesMax * 4, Constants.BUFFER_CREATIONFLAG_WRITE | Constants.BUFFER_CREATIONFLAG_READ);
        const wavesCountEmpty = new Uint32Array(wavesMax);
        const csWavesCount = WavesCountShader({
            engine,
            triangleWaveState: triangleWaveState[2],
            wavesCount
        });
        const failedMoves = new StorageBuffer(engine, wavesMax * 4, Constants.BUFFER_CREATIONFLAG_WRITE);
        const waveMatrix = new StorageBuffer(engine, wavesMax * 16 * 4, Constants.BUFFER_CREATIONFLAG_WRITE);

        const csGenerateWaveMove = GenerateWaveMoveShader({
            engine,
            wavesCount,
            waveMatrix,
        });
        const csTryMove = TryMoveShader({
            engine,
            vertices: verticesDataBuf,
            waveMatrix,
            failedMoves,
            triangleWaveState: triangleWaveState[2]
        });
        const csMove = MoveShader({
            engine,
            vertices: verticesDataBuf,
            waveMatrix,
            triangleWaveState: triangleWaveState[2],
            failedMoves
        });
        const genValueBuf = new StorageBuffer(engine, 4, Constants.BUFFER_CREATIONFLAG_WRITE);
        const csGenValue = GenValueShader({
            engine,
            triangleWaveState: triangleWaveState[2],
            genValue: genValueBuf
        });
        const csDecrypt4 = Decrypt4Shader({
            engine,
            vertices: verticesDataBuf,
            genValue: genValueBuf
        });
        // const keysDumpBuf = new StorageBuffer(engine, trianglesCount * 256 * 4, Constants.BUFFER_CREATIONFLAG_WRITE | Constants.BUFFER_CREATIONFLAG_READ);
        // const csDecrypt4DumpKeys = Decrypt4DumpKeysShader({
        //     engine,
        //     vertices: verticesDataBuf,
        //     genValue: genValueBuf,
        //     keysDump: keysDumpBuf
        // });
        // const finalXorBuf = new StorageBuffer(engine, vertexCount * 4, Constants.BUFFER_CREATIONFLAG_WRITE | Constants.BUFFER_CREATIONFLAG_READ);
        // const csDecrypt4DumpFinalXor = Decrypt4DumpFinalXorShader({
        //     engine,
        //     vertices: verticesDataBuf,
        //     finalXorDump: finalXorBuf
        // });
        // const dbgBuf = new StorageBuffer(engine, vertexCount * 4, Constants.BUFFER_CREATIONFLAG_WRITE | Constants.BUFFER_CREATIONFLAG_READ);
        // const csDecrypt4Dbg = Decrypt4DbgShader({
        //     engine,
        //     vertices: verticesDataBuf,
        //     dbgDump: dbgBuf
        // });
        const csUpdateQuads = UpdateQuadsShader({
            engine,
            vertices: verticesDataBuf,
            quads: quadDataBuf,
            genValue: genValueBuf
        });
        const csDeformShape = DeformShapeShader({
            engine,
            vertices: verticesDataBuf,
        });
    // }
    // {
        const OFFSETS = wgsl`
            const OFFSETS = array(
                vec2u(0,0),
                vec2u(0,16),
                vec2u(16,16),
                vec2u(0,0),
                vec2u(16,0),
                vec2u(16,16),
            );
        `;
        const UVs = wgsl`
            varying uv : vec2<f32>;
            flat varying uv0Clamp : vec2<u32>;
            flat varying uv1Clamp : vec2<u32>;
            flat varying uv2Clamp : vec2<u32>;
            flat varying uv3Clamp : vec2<u32>;
            flat varying uv4Clamp : vec2<u32>;
        `;
        ShaderStore.ShadersStoreWGSL["flagVertexShader"]=wgsl`
            #include<sceneUboDeclaration>
            #include<meshUboDeclaration>

            // attribute pos : vec3<f32>;
            attribute xxx: vec4<u32>;
            var<storage> quads : array<vec3u>;
            var<uniform> params: f32;

            ${UVs}
            ${OFFSETS}

            @vertex
            fn main(input : VertexInputs) -> FragmentInputs {
                var positionUpdated = vec3f(
                    f32(input.xxx.x & 0xfff) / f32(0xfff),
                    f32(input.xxx.y & 0xfff) / f32(2 * 0xfff),
                    -f32((input.xxx.x >> 12) & 0xfff) / f32(2 * 0xfff)
                );
                // var positionUpdated = vertexInputs.pos;

                let finalWorld = mesh.world;
                let worldPos = finalWorld * vec4<f32>(positionUpdated, 1.0);
                vertexOutputs.position = scene.viewProjection * worldPos;
                let quad = quads[input.vertexIndex / 6];
                let vecStart = vec2u(quad.x & 0x7ff, (quad.x >> 12) & 0x3ff);
                let vecCur = vecStart + OFFSETS[input.vertexIndex % 6];
                vertexOutputs.uv = vec2f(f32(vecCur.x)/2047, 1 - f32(vecCur.y)/1023);
                vertexOutputs.uv0Clamp = vec2u(vecStart.x, 1023 - vecStart.y);
                vertexOutputs.uv1Clamp = vec2u((quad.y & 0x7ff) % 0x7f1, 1023 - (((quad.y >> 11) & 0x3ff) % 0x3f1));
                vertexOutputs.uv2Clamp = vec2u(((quad.y >> 21) & 0x7ff) % 0x7f1, 1023 - ((quad.z & 0x3ff) % 0x3f1));
                vertexOutputs.uv3Clamp = vec2u(((quad.z >> 10) & 0x7ff) % 0x7f1, 1023 - (((quad.z >> 21) & 0x3ff) % 0x3f1));
                let v = input.xxx.x ^ (input.xxx.y << 6) ^ input.xxx.z;
                vertexOutputs.uv4Clamp = vec2u((v & 0x7ff) % 0x7f1, 1023 - (((v >> 12) & 0xfff) % 0x3f1));
            }
        `;
        ShaderStore.ShadersStoreWGSL["flagFragmentShader"]=wgsl`
            ${UVs}
            ${OFFSETS}
            var texture0 : texture_2d<f32>;
            var texture1 : texture_2d<f32>;
            var texture2 : texture_2d<f32>;
            var texture3 : texture_2d<f32>;
            var texture4 : texture_2d<f32>;
            var<uniform> params: f32;

            @fragment
            fn main(input : FragmentInputs) -> FragmentOutputs {
                let base = clamp(
                    vec2u(u32(round(fragmentInputs.uv.x * 2047)), u32(round(fragmentInputs.uv.y * 1023))),
                    vec2u(fragmentInputs.uv0Clamp.x, fragmentInputs.uv0Clamp.y - 15),
                    vec2u(fragmentInputs.uv0Clamp.x + 15, fragmentInputs.uv0Clamp.y)
                );
                let c0 = vec4u(round(textureLoad(texture0, base, 0) * 255));
                fragmentOutputs.color = mix(
                    vec4f((vec4f(c0)/255).xyz, 1),
                    vec4f((vec4f(c0 ^ vec4u(round(textureLoad(texture1, (base + fragmentInputs.uv1Clamp) - fragmentInputs.uv0Clamp, 0) * 255)) ^ vec4u(round(textureLoad(texture2, (base + fragmentInputs.uv2Clamp) - fragmentInputs.uv0Clamp, 0) * 255)) ^ vec4u(round(textureLoad(texture3, (base + fragmentInputs.uv3Clamp) - fragmentInputs.uv0Clamp, 0) * 255)) ^ vec4u(round(textureLoad(texture4, (base + fragmentInputs.uv4Clamp) - fragmentInputs.uv0Clamp, 0) * 255)))/255).xyz, 1),
                    params
                );
            }
        `;
        const mat = new ShaderMaterial("shader", scene,
            {
                vertex: "flag",
                fragment: "flag",
            },
            {
                attributes: ["xxx"],
                uniformBuffers: ["Scene", "Mesh"],
                storageBuffers: ["quads"],
                shaderLanguage: ShaderLanguage.WGSL,
            }
        );
        mat.setUniformBuffer("params", ubuffer);
        mat.setStorageBuffer("quads", quadDataBuf);
        mat.backFaceCulling = false;
        mat.setTexture("texture0", (flag.material as PBRMaterial).emissiveTexture!);
        mat.setTexture("texture1", (flag.material as PBRMaterial).sheen.texture!);
        mat.setTexture("texture2", (flag.material as PBRMaterial).reflectanceTexture!);
        mat.setTexture("texture3", (flag.material as PBRMaterial).albedoTexture!);
        mat.setTexture("texture4", (flag.material as PBRMaterial).bumpTexture!);
        flag.material = mat;
    // }
    // {
        const btnStart = scene.getMeshById("btnStart")!;
        btnStart.actionManager = new ActionManager(scene);
        btnStart.actionManager.registerAction(
            new SetValueAction(
                ActionManager.OnPointerOverTrigger,
                btnStart.material,
                "emissiveColor",
                new Color3(0, 1, 0)
            )
        );
        btnStart.actionManager.registerAction(
            new SetValueAction(
                ActionManager.OnPointerOutTrigger,
                btnStart.material,
                "emissiveColor",
                new Color3(0, 0, 0)
            )
        );

        let state = 0;
        let bReady = false;

        let rotationObserver: Observer<Scene>;
        btnStart.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                (_: ActionEvent) => {
                    if (bReady) {
                        bReady = false;
                        state = 1;
                        {
                            let nWaveSmallStep = 0;
                            const wgTriangles = Math.ceil(trianglesCount / 64);
                            const wgWaves = Math.ceil(trianglesCount * 2 / 64);
                            const wgQuads = Math.ceil(trianglesCount/2/64);
                            let nWaves = 20, nWaveStep = 5, nWaveSubStep = 1;
                            let wavesCountData = new Uint32Array(wavesMax);

                            const rng = prand.xoroshiro128plus(params.nMode * 100 + params.nTemp);

                            for (let i = 0; i < quadsCount; i+=6) {
                                initialQuadData[4*i + 1] = prand.unsafeUniformIntDistribution(0, 0xFFFFFFFF, rng);
                                initialQuadData[4*i + 2] = prand.unsafeUniformIntDistribution(0, 0xFFFFFFFF, rng);
                            }
                            quadDataBuf.update(initialQuadData);
                            const startMixObserver = scene.onBeforeRenderObservable.add(() => {
                                bWash += scene.deltaTime / 1000 / 30;
                                if (1 < bWash) {
                                    bWash = 1;
                                    startMixObserver.remove();
                                }
                                ubuffer.updateFloat("bWash", bWash);
                                ubuffer.update();
                            });

                            let trianglesShuffle = Uint32Array.from({length: trianglesCount}, (_, i) => i);
        
                            
                            function shuffle(array: Uint32Array) {
                                let current = array.length;
                                while (current !== 0) {
                                    const random = prand.unsafeUniformIntDistribution(0, current-1, rng);
                                    current--;
                                    [array[current], array[random]] = [array[random], array[current]];
                                }
                            }
                            const SpawnWaves = () => {
                                const triangleWaveStateInit = new Uint32Array(trianglesCount);
                                const zeroes: number[] = [];    
                                for (let i = 0; i < wavesCountData.length && zeroes.length < nWaves; i++) {
                                    if (wavesCountData[i] === 0) {
                                        zeroes.push(i);
                                    }
                                }
                                shuffle(trianglesShuffle);
                                let nZeroes=0;
                                for(let i=0; i<nWaves;++i) {
                                    const triangleId = trianglesShuffle[i];
                                    if (i < zeroes.length) {
                                        const value = zeroes[i];
                                        wavesCountData[value] = 1;
                                        triangleWaveStateInit[triangleId] = value+1;
                                        nZeroes += 1;
                                    } else {
                                        break;
                                    }
                                }
                                
                                triangleWaveState[0].update(triangleWaveStateInit);
                                nWaves += nWaveStep;
                                if (nWaveStep == nWaveSubStep) {
                                    nWaveStep++;
                                    nWaveSubStep=1;
                                } else {
                                    nWaveSubStep++;
                                }
                                
                                if (trianglesCount < nWaves) {
                                    nWaves = trianglesCount;
                                }
                            };
                            const updateData = new Uint32Array(wavesMax * 16);
                            for (let i =0; i < wavesMax; ++i) {
                                updateData[16*i + 12] = prand.unsafeUniformIntDistribution(0, 0xFFFFFFFF, rng);
                            }
                            waveMatrix.update(updateData);
                            SpawnWaves();

                            let nParts = 0;
                            // let nCount = 0;
                            // let nCalls = 0, nRound=0;
                            // function downloadTextFile(content: string, filename: string) {
                            //     const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                            //     const url = URL.createObjectURL(blob);
                            //     const link = document.createElement("a");
                            //     link.href = url;
                            //     link.download = filename;
                            //     document.body.appendChild(link);
                            //     link.click();
                            //     document.body.removeChild(link);
                            //     URL.revokeObjectURL(url);
                            // }
                            scene.onBeforeRenderObservable.add(() => {
                                if (state === 1) {
                                    changed.update(changedData);
                                    csWave[nWaveSmallStep].dispatch(wgTriangles);
                                    nWaveSmallStep = (nWaveSmallStep + 1) % 2;
                                    state = 0;
                                    changed.read().then((buf) => {
                                        if ((new Uint32Array(buf.buffer))[0] === 0) {
                                            state = 2;
                                        } else {
                                            state = 1;
                                        }
                                    });
                                } else if (state === 2) {
                                    // nCalls++;
                                    csMerge.dispatch(wgTriangles);
                                    wavesCount.update(wavesCountEmpty);
                                    csWavesCount.dispatch(wgTriangles);
                                    csGenerateWaveMove.dispatch(wgWaves);
                                    failedMoves.update(new Uint32Array(wavesMax));
                                    csTryMove.dispatch(wgTriangles);
                                    csMove.dispatch(wgTriangles);
                                    csGenValue.dispatch(wgWaves);
                                    csUpdateQuads.dispatch(wgQuads);
                    
                                    // csDecrypt4DumpKeys.dispatch(wgTriangles);
                                    // keysDumpBuf.read().then((keysBuf) => {
                                    //     const key = new Uint32Array(keysBuf.buffer);
                                    //     let keysTriangles = [];
                                    //     for (let nTriangle=0; nTriangle < trianglesCount; ++nTriangle) {
                                    //         const keyTriangleExport = [];
                                    //         for (let i = 0; i < 256; ++i) {
                                    //             keyTriangleExport.push(key[256 * nTriangle + i]);
                                    //         }
                                    //         keysTriangles.push(keyTriangleExport);
                                    //     }
                                    //     // keysExport.push();
                                    //     downloadTextFile(JSON.stringify(keysTriangles), `keys${nRound}.json`);
                                    //     nRound++;
                                    // });
                                    
                                    csDecrypt4.dispatch(wgTriangles);
                                    // csDecrypt4Dbg.dispatch(Math.ceil(vertexCount/64));
                                    // dbgBuf.read().then((buf) => {
                                    //     console.log(JSON.stringify(Array.from(new Uint32Array(buf.buffer))));
                                    // });
                                    
                                    // nCount += 1;
                                    state = 0;
                                    wavesCount.read().then((buf) => {
                                        wavesCountData = new Uint32Array(buf.buffer);
                                        nParts = wavesCountData.reduce((acc, cur) => cur !== 0 ? acc+1 : acc, 0);
                                        estimator.update(nParts);
                                        if (nParts === trianglesCount) {
                                            // console.assert(nCalls === nRound);
                            
                                            // csDecrypt4DumpFinalXor.dispatch(Math.ceil(vertexCount/64));
                                            // finalXorBuf.read().then((buf) => {
                                            //     const xorExport = Array.from(new Uint32Array(buf.buffer));
                                            //     downloadTextFile(JSON.stringify(xorExport), "finalXor.json");
                                            // });
                                            // quadDataBuf.read().then((buf) => {
                                            //     const quads = new Uint32Array(buf.buffer);
                                            //     const quadsExport: number[][][] = [];
                                            //     for(let i = 0; i < quadsCount; ++i) {
                                            //         const y = quads[4 * i + 1];
                                            //         const z = quads[4 * i + 2];
                                            //         quadsExport.push([
                                            //             [(y & 0x7ff) % 0x7f1, ((y >> 11) & 0x3ff) % 0x3f1],
                                            //             [((y >> 21) & 0x7ff) % 0x7f1, (z & 0x3ff) % 0x3f1],
                                            //             [((z >> 10) & 0x7ff) % 0x7f1, ((z >> 21) & 0x3ff) % 0x3f1]
                                            //         ]);
                                            //     }
                                            //     downloadTextFile(JSON.stringify(quadsExport), "quads.json");
                                            // });

                                            state = 0;
                                            // state = 1;
                                            // console.log("Done");
                                            rotationObserver.remove();
                                        } else {
                                            setTimeout(() => {
                                                state=1;
                                                SpawnWaves();
                                            }, 10000);
                                        }
                                    });
                                }
                            });
                        }
                        {
                            camera.inputs.addMouse();
                            camera.inputs.addTouch();
                            camera.attachControl(canvas, false);
                        }
                        {
                            const pivot = new TransformNode("pivot", scene);
                            pivot.position = center.add(new Vector3(0, 0.1));
                            flag.setParent(pivot, true, true);
                            rotationObserver = scene.onBeforeRenderObservable.add(() => {
                                pivot.addRotation(scene.deltaTime/125, 0, 0);
                            });
                        }

                        {
                            let isLocked = false;
                            scene.onPointerDown = function (_) {
                                if (!isLocked) {
                                    canvas.requestPointerLock = canvas.requestPointerLock || (canvas as any).msRequestPointerLock || (canvas as any).mozRequestPointerLock || (canvas as any).webkitRequestPointerLock;
                                    if (canvas.requestPointerLock) {
                                        canvas.requestPointerLock();
                                    }
                                }
                            };
                            const pointerlockchange = function () {
                                const doc = document as any;
                                const controlEnabled = doc.mozPointerLockElement || doc.webkitPointerLockElement || doc.msPointerLockElement || doc.pointerLockElement || null;
                                
                                if (!controlEnabled) {
                                    isLocked = false;
                                } else {
                                    isLocked = true;
                                }
                            };
                    
                            document.addEventListener("pointerlockchange", pointerlockchange, false);
                            document.addEventListener("mspointerlockchange", pointerlockchange, false);
                            document.addEventListener("mozpointerlockchange", pointerlockchange, false);
                            document.addEventListener("webkitpointerlockchange", pointerlockchange, false);
                        }
                    }
                }
            )
        );
    // }

    const machine = scene.getMeshByName("hull")!;

    class WashingMachineParams {
        nTemp: number;
        nMode: number;

        constructor(nTemp: number, nMode: number) {
            this.nTemp = nTemp;
            this.nMode = nMode;
        }
    };
    const params = new WashingMachineParams(30, 0);

    const modes = ["Cotton", "Synthetics", "Delicates", "Wool", "Quick Wash", "Eco", "Heavy Duty", "Rinse Spin", "Baby Care", "Sportswear"];
    const textureTempScreen = new DynamicTexture("textureTempScreen", {width:256, height: 128}, scene);
    const materialTempScreen = new StandardMaterial("TempScreenMaterial", scene);
    materialTempScreen.diffuseTexture = textureTempScreen;
    scene.getMeshById("tempScreen")!.material = materialTempScreen;

    const textureSwitchScreen = new DynamicTexture("textureSwitchScreen", {width:256, height: 128}, scene);
    const materialSwitchScreen = new StandardMaterial("SwitchScreenMaterial", scene);
    materialSwitchScreen.diffuseTexture = textureSwitchScreen;
    scene.getMeshById("switchScreen")!.material = materialSwitchScreen;

    const UpdateSwitchScreen = () => {
        const ctx = textureSwitchScreen.getContext();
        const size = textureSwitchScreen.getSize();
        ctx.beginPath();
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.font = "bold 12px monospace";
        const cx      = 256 / 2;
        const cy      = 128 / 2;
        const radius  = Math.min(cx, cy) - 8;
        
        (ctx as any).textBaseline = "middle";
        const step = 2 * Math.PI / modes.length;
        for (let i = 0; i < modes.length; i++) {
            if (i == params.nMode) {
                ctx.fillStyle = "#FF3333";
            } else {
                ctx.fillStyle = "#33FF33";
            }
            const angle = -Math.PI / 2 + i * step;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i == 0 || i == 5) {
                (ctx as any).textAlign   = "center";
            } else if (i < 6) {
                (ctx as any).textAlign   = "left";
            } else {
                (ctx as any).textAlign   = "right";
            }
            ctx.fillText(modes[i], x, y);
        }
        textureSwitchScreen.update(); 
    };
    UpdateSwitchScreen();
    
    class ETAEstimator {
        private readonly target: number;
        private readonly samples: { time: number; progress: number }[] = [];
        private accumulated = 0;
      
        constructor(target: number) {
          this.target = target;
        }
      
        public update(newProgress: number): void {
            this.accumulated = newProgress;
            this.samples.push({ time: Date.now(), progress: this.accumulated });
        
            if (20 < this.samples.length) {
                this.samples.shift();
            }
            UpdateTempScreen();
        }

        public getRemainingSeconds(): number {
            const n = this.samples.length;
            if (n < 3) {
                return 2*60*60;
            }
            const t0 = this.samples[0].time;
            const xs = this.samples.map(s => (s.time - t0) / 1000);
            const ys = this.samples.map(s => s.progress);
            const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
        
            const xMean = mean(xs);
            const yMean = mean(ys);
        
            let num = 0, den = 0;
            for (let i = 0; i < n; i++) {
              const dx = xs[i] - xMean;
              num += dx * (ys[i] - yMean);
              den += dx * dx;
            }
            if (den === 0) {
                return 2*60*60;
            }
            const speed = num / den;
            if (speed <= 0) {
                return 2*60*60;
            }
            const remaining = Math.max(0, this.target - this.accumulated);
            return remaining / speed;
        }
    };
    const estimator = new ETAEstimator(16384); 

    const UpdateTempScreen = () => {
        const ctx = textureTempScreen.getContext();
        const size = textureTempScreen.getSize();
        (ctx as any).textAlign   = "left";
        ctx.beginPath();
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.font = "bold 30px monospace";
        ctx.fillStyle = "#33FF33";

        ctx.font = "bold 50px monospace";
        const nSeconds = estimator.getRemainingSeconds();
        ctx.fillText(`${Math.floor(nSeconds/3600)}:${Math.floor((nSeconds % 3600)/60).toString().padStart(2, "0")}`, 20, 50);
        ctx.font = "bold 30px monospace";
        (ctx as any).textAlign   = "right";
        ctx.fillText(`${params.nTemp} °C`, 256, 120);
        textureTempScreen.update();
    };
    UpdateTempScreen(); 

    {
        let startPos: Vector2 | null = null;
        const switchCircular = scene.getMeshById("switchCircular")!;
        switchCircular.pointerOverDisableMeshTesting = true;
        switchCircular.actionManager = new ActionManager(scene);
        switchCircular.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickDownTrigger,
                (evt: ActionEvent) => {
                    if (bReady) {
                        startPos = new Vector2(evt.pointerX, evt.pointerY);
                    }
                }
            )
        );
        const SECTOR_WIDTH = 360 / modes.length;
        const HALF = SECTOR_WIDTH / 2;
        switchCircular.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPointerOverTrigger,
                (evt: ActionEvent) => {
                    if (bReady) {
                        if (startPos !== null) {
                            const dx = evt.pointerX - startPos!.x;
                            const dy = evt.pointerY - startPos!.y;
                            let deg = Tools.ToDegrees(Math.atan2(dx, -dy));
                            if (deg < 0) deg += 360;
                            const shifted = (deg + HALF) % 360;
                            const newMode = Math.floor(shifted / SECTOR_WIDTH);
                            if (newMode !== params.nMode) {
                                params.nMode = newMode;
                                UpdateSwitchScreen();
                            }
                        }
                    }
                }
            )
        );
        switchCircular.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickOutTrigger,
                (_: ActionEvent) => {
                    if (bReady) {
                        startPos = null;
                    }
                }
            )
        );
        switchCircular.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickUpTrigger,
                (_: ActionEvent) => {
                    if (bReady) {
                        startPos = null;
                    }
                }
            )
        );
        const btnTmpInc = scene.getMeshById("btnTmpInc")!;
        btnTmpInc.actionManager = new ActionManager(scene);
        btnTmpInc.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                (_: ActionEvent) => {
                    if (bReady) {
                        if (params.nTemp < 100) {
                            params.nTemp++;
                            UpdateTempScreen();
                        }
                    }
                }
            )
        );
        const btnTmpDec = scene.getMeshById("btnTmpDec")!;
        btnTmpDec.actionManager = new ActionManager(scene);
        btnTmpDec.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                (_: ActionEvent) => {
                    if (bReady) {
                        if (20 < params.nTemp) {
                            params.nTemp--;
                            UpdateTempScreen();
                        }
                    }
                }
            )
        );
    }
    
    // {
        const animationGroup1 = new AnimationGroup("Group1");
        const boundingSphere = machine.getBoundingInfo().boundingSphere;
        const radius = boundingSphere.radiusWorld * 0.6;
        const center = boundingSphere.centerWorld.clone();
    
        // const camera = new ArcRotateCamera("camera1", 1, 2, 3, Vector3.Zero(), scene);
        const camera = new UniversalCamera("camera1", Vector3.Zero(), scene);
        camera.minZ = 0.5;
        const distance = radius / Math.sin(camera.fov / 2);

        camera.inputs.clear();

        const cameraAnim = new Animation("startScene", "position", 60, Animation.ANIMATIONTYPE_VECTOR3);
        const nStop1Frame = 10 * 60;
        cameraAnim.setKeys([
            {
                frame: 0,
                value: new Vector3(0, center.y + radius + 0.4, center.z),
            },
            {
                frame: nStop1Frame,
                value: new Vector3(center.x + distance, center.y + radius + 0.4, center.z),
            },
        ]);
        let observer: Observer<Scene>;
        cameraAnim.addEvent(
            new AnimationEvent(
                0,
                () => {
                    camera.lockedTarget = center;
                    const localOffset = new Vector3(0.5, -0.5, 1);
                    observer = scene.onBeforeRenderObservable.add(() => {
                        flag.position = camera.position.add(
                            Vector3.TransformCoordinates(localOffset, Matrix.RotationYawPitchRoll(
                                camera.rotation.y,
                                camera.rotation.x,
                                camera.rotation.z
                            ))
                        );
                    });
                },
                true
            )
        );
        cameraAnim.addEvent(
            new AnimationEvent(
                nStop1Frame,
                () => {
                    camera.lockedTarget = null;
                    camera.target = center;
                    scene.onBeforeRenderObservable.remove(observer);
                },
                true
            )
        );
        
        animationGroup1.addTargetedAnimation(cameraAnim, camera);
        
        animationGroup1.play();
        animationGroup1.onAnimationGroupEndObservable.addOnce(() => {
            scene.getMeshById("tag")!.visibility = 0
            csDeformShape.dispatch(Math.ceil(vertexCount / 64));
            const nStop2Frame = 1 * 60;
            const animationGroup2 = new AnimationGroup("Group2");
            const flagMoveAnim = new Animation("flagMove", "position", 60, Animation.ANIMATIONTYPE_VECTOR3);
            flag.position.addInPlace(new Vector3(0,0.25,-0.25));
            flagMoveAnim.setKeys([
                {
                    frame: 0,
                    value: flag.position,
                },
                {
                    frame: nStop2Frame,
                    // value: new Vector3(center.x + 0.5, center.y, center.z + 0.5),
                    value: new Vector3(center.x + 0.2, center.y - 0.18, center.z + 0.25),
                },
            ]);
            flagMoveAnim.addEvent(new AnimationEvent(
                nStop2Frame,
                () => {
                    bReady = true;
                },
                true
            ));
            animationGroup2.addTargetedAnimation(flagMoveAnim, flag);
            animationGroup2.play();
        });
    // }

    await Promise.all([
        csWave[0].dispatchWhenReady(0,0,0),
        csWave[1].dispatchWhenReady(0,0,0),
        csMerge.dispatchWhenReady(0,0,0),
        csWavesCount.dispatchWhenReady(0,0,0),
        csGenerateWaveMove.dispatchWhenReady(0,0,0),
        csTryMove.dispatchWhenReady(0,0,0),
        csMove.dispatchWhenReady(0,0,0),
        csGenValue.dispatchWhenReady(0,0,0),
        csDecrypt4.dispatchWhenReady(0,0,0),
        // csDecrypt4DumpKeys.dispatchWhenReady(0,0,0),
        // csDecrypt4DumpFinalXor.dispatchWhenReady(0,0,0),
        // csDecrypt4Dbg.dispatchWhenReady(0,0,0),
        csUpdateQuads.dispatchWhenReady(0,0,0),
        csDeformShape.dispatchWhenReady(0,0,0),
    ]);

    engine.runRenderLoop(() => {
        scene.render();
    });
})()
