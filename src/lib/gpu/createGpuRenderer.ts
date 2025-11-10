import type { Camera } from "$lib/Camera.svelte";

export const createGpuRenderer = ({
    device,
    context,

    renderPipeline,
    uniformsBindGroup,
    
    uniformsBuffer,
    particleDataBuffer,

    nParticles,
    camera,
}: {
    device: GPUDevice,
    context: GPUCanvasContext,

    uniformsBindGroup: GPUBindGroup,
    renderPipeline: GPURenderPipeline,

    particleDataBuffer: GPUBuffer,
    uniformsBuffer: GPUBuffer,

    nParticles: number,
    camera: Camera,
}) => {
    return async () => {
        device.queue.writeBuffer(uniformsBuffer, 0, camera.viewInvProj.buffer);
        
        const commandEncoder = device.createCommandEncoder({
            label: "render command encoder",
        });

        const renderPassEncoder = commandEncoder.beginRenderPass({
            label: "render pass",
            colorAttachments: [
                {
                    clearValue: {
                        r: 0,
                        g: 0,
                        b: 0,
                        a: 1,
                    },

                    loadOp: "clear",
                    storeOp: "store",
                    view: context.getCurrentTexture().createView(),
                },
            ],
        });
        renderPassEncoder.setBindGroup(0, uniformsBindGroup);
        renderPassEncoder.setVertexBuffer(0, particleDataBuffer);
        renderPassEncoder.setPipeline(renderPipeline);
        renderPassEncoder.draw(nParticles);
        renderPassEncoder.end();


        device.queue.submit([commandEncoder.finish()]);
        await device.queue.onSubmittedWorkDone();
    };
}