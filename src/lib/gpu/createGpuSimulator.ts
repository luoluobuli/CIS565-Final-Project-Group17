export const createGpuSimulator = ({
    device,

    simulationStepPipeline,
    uniformsBindGroup,
    simulationStepStorageBindGroup,

    nParticles,
}: {
    device: GPUDevice,

    simulationStepPipeline: GPUComputePipeline,
    uniformsBindGroup: GPUBindGroup,
    simulationStepStorageBindGroup: GPUBindGroup,

    nParticles: number,
}) => {
    return async () => {
        const commandEncoder = device.createCommandEncoder({
            label: "simulation step command encoder",
        });

        const computePassEncoder = commandEncoder.beginComputePass({
            label: "simulation step compute pass",
        });
        computePassEncoder.setPipeline(simulationStepPipeline);
        computePassEncoder.setBindGroup(0, uniformsBindGroup);
        computePassEncoder.setBindGroup(1, simulationStepStorageBindGroup);
        computePassEncoder.dispatchWorkgroups(Math.ceil(nParticles / 256));
        computePassEncoder.end();


        device.queue.submit([commandEncoder.finish()]);
        await device.queue.onSubmittedWorkDone();
    };
};