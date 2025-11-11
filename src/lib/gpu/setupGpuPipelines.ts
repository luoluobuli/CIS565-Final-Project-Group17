import commonModuleSrc from "./shader/_common.wgsl?raw";
import vertexModuleSrc from "./shader/vertex.wgsl?raw";
import fragmentModuleSrc from "./shader/fragment.wgsl?raw";
import simulationStepModuleSrc from "./shader/simulationStep.wgsl?raw";
import type { GpuSnowUniformsManager } from "./GpuSnowUniformsManager";

export const setupGpuPipelines = ({
    device,
    nParticles,
    gridResolution,
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




    return {
        particleDataBuffer1,
        particleDataBuffer2,
    };
};