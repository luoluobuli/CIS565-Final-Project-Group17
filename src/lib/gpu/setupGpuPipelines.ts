import commonModuleSrc from "./shader/_common.wgsl?raw";
import vertexModuleSrc from "./shader/vertex.wgsl?raw";
import fragmentModuleSrc from "./shader/fragment.wgsl?raw";
import simulationStepModuleSrc from "./shader/simulationStep.wgsl?raw";
import type { GpuSnowUniformsManager } from "./GpuSnowUniformsManager";

export const setupGpuPipelines = ({
    device,
    format,
    nParticles,
    gridResolution,
    uniformsManager,
}: {
    device: GPUDevice,
    format: GPUTextureFormat,
    nParticles: number,
    gridResolution: number,
    uniformsManager: GpuSnowUniformsManager,
}) => {
    const particleDataBuffer1 = device.createBuffer({
        label: "particle data ping-pong buffer 1",
        size: nParticles * 48,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM,
    });
    const particleDataBuffer2 = device.createBuffer({
        label: "particle data ping-pong buffer 2",
        size: nParticles * 48,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM,
    });
    const particleDataArray = new Float32Array(nParticles * 12);
    for (let i = 0; i < nParticles; i++) {
        particleDataArray[i * 12] = Math.random();
        particleDataArray[i * 12 + 1] = Math.random();
        particleDataArray[i * 12 + 2] = Math.random();
        particleDataArray[i * 12 + 3] = 1;
    }
    device.queue.writeBuffer(particleDataBuffer1, 0, particleDataArray);


    const gridDataBuffer1 = device.createBuffer({
        label: "grid data ping-pong buffer 1",
        size: (gridResolution**3) * 16,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM,
    });
    const gridDataBuffer2 = device.createBuffer({
        label: "grid data ping-pong buffer 2",
        size: (gridResolution**3) * 16,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM,
    });


    const renderPipelineLayout = device.createPipelineLayout({
        label: "render pipeline",
        bindGroupLayouts: [uniformsManager.bindGroupLayout],
    });


    const vertexModule = device.createShaderModule({
        label: "vertex module",
        code: commonModuleSrc + vertexModuleSrc,
    });
    const fragmentModule = device.createShaderModule({
        label: "fragment module",
        code: commonModuleSrc + fragmentModuleSrc,
    });
    
    const renderPipeline = device.createRenderPipeline({
        label: "render pipeline",

        layout: renderPipelineLayout,

        vertex: {
            module: vertexModule,
            entryPoint: "vert",
            buffers: [
                {
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x4",
                        },
                    ],
                    arrayStride: 32,
                    stepMode: "vertex",
                },
            ],
        },

        fragment: {
            module: fragmentModule,
            entryPoint: "frag",
            targets: [
                {
                    format,
                },
            ],
        },

        primitive: {
            topology: "point-list",
        },
    });


    const simulationStepStorageBindGroupLayout = device.createBindGroupLayout({
        label: "simulation step storage bind group layout",
        
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage",
                },
            },

            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                },
            },
        ],
    });
    const simulationStepStorageBindGroup1_2 = device.createBindGroup({
        label: "simulation step storage bind group, 1 -> 2",

        layout: simulationStepStorageBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: particleDataBuffer1,
                },
            },

            {
                binding: 1,
                resource: {
                    buffer: particleDataBuffer2,
                },
            },
        ],
    });
    const simulationStepStorageBindGroup2_1 = device.createBindGroup({
        label: "simulation step storage bind group, 2 -> 1",

        layout: simulationStepStorageBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: particleDataBuffer2,
                },
            },

            {
                binding: 1,
                resource: {
                    buffer: particleDataBuffer1,
                },
            },
        ],
    });
    const simulationStepPipelineLayout = device.createPipelineLayout({
        label: "simulation step pipeline layout",
        bindGroupLayouts: [uniformsManager.bindGroupLayout, simulationStepStorageBindGroupLayout],
    });

    const simulationStepModule = device.createShaderModule({
        label: "simulation step module",
        code: commonModuleSrc + simulationStepModuleSrc,
    });
    
    const simulationStepPipeline = device.createComputePipeline({
        label: "simulation step pipeline",
        layout: simulationStepPipelineLayout,

        compute: {
            module: simulationStepModule,
            entryPoint: "doSimulationStep",
        },
    });


    return {
        particleDataBuffer1,
        particleDataBuffer2,
        simulationStepStorageBindGroup1_2,
        simulationStepStorageBindGroup2_1,
        renderPipeline,
        simulationStepPipeline,
    };
};