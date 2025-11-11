import type { Camera } from "$lib/Camera.svelte";
import { GpuPointRenderPipelineManager } from "./GpuRenderPipelineManager";
import { GpuSimulationStepPipelineManager } from "./GpuSimulationStepPipelineManager";
import { GpuSnowUniformsManager } from "./GpuSnowUniformsManager";
import { setupGpuPipelines } from "./setupGpuPipelines";

const MAX_SIMULATION_DRIFT_MS = 1_000;

export class GpuSnowPipelineRunner {
    private readonly device: GPUDevice;
    private readonly context: GPUCanvasContext;
    private readonly nParticles: number;
    private readonly simulationTimestepS: number;
    private readonly camera: Camera;

    private buffer1IsSource = true;

    private readonly uniformsManager: GpuSnowUniformsManager;
    private readonly simulationStepPipelineManager: GpuSimulationStepPipelineManager;
    private readonly pointsRenderPipelineManager: GpuPointRenderPipelineManager;
    private readonly pipelineData: ReturnType<typeof setupGpuPipelines>;

    constructor({
        device,
        format,
        context,
        nParticles,
        gridResolution,
        simulationTimestepS,
        camera,
    }: {
        device: GPUDevice,
        format: GPUTextureFormat,
        context: GPUCanvasContext,
        nParticles: number,
        gridResolution: number,
        simulationTimestepS: number,
        camera: Camera,
    }) {
        this.device = device;
        this.context = context;
        this.nParticles = nParticles;
        this.simulationTimestepS = simulationTimestepS;

        this.camera = camera;

        const uniformsManager = new GpuSnowUniformsManager({device});
        this.uniformsManager = uniformsManager;

        this.pipelineData = setupGpuPipelines({device, format, nParticles, gridResolution, uniformsManager});

        const simulationStepPipelineManager = new GpuSimulationStepPipelineManager({
            device,
            particleDataBuffer1: this.pipelineData.particleDataBuffer1,
            particleDataBuffer2: this.pipelineData.particleDataBuffer2,
            uniformsManager,
        });
        this.simulationStepPipelineManager = simulationStepPipelineManager;

        const pointsRenderPipelineManager = new GpuPointRenderPipelineManager({device, format, uniformsManager});
        this.pointsRenderPipelineManager = pointsRenderPipelineManager;

    }

    async doSimulationStep() {
        const commandEncoder = this.device.createCommandEncoder({
            label: "simulation step command encoder",
        });
        this.simulationStepPipelineManager.addComputePass({
            commandEncoder,
            nParticles: this.nParticles,
            buffer1IsSource: this.buffer1IsSource,
        });
        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();

        this.buffer1IsSource = !this.buffer1IsSource;
    }

    async render() {
        this.uniformsManager.writeSimulationTimestepS(this.simulationTimestepS);
        this.uniformsManager.writeViewProjInvMat(this.camera.viewInvProj);
        
        const commandEncoder = this.device.createCommandEncoder({
            label: "render command encoder",
        });
        this.pointsRenderPipelineManager.addRenderPass({
            commandEncoder,
            context: this.context,
            particleDataBuffer: this.particleDataBuffer,
            nParticles: this.nParticles,
        });
        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();
    }

    loop() {
        let handle = 0;

        const simulationTimestepMs = this.simulationTimestepS * 1_000;


        let nSimulationStep = 0;
        let simulationStartTime = Date.now();
        const loop = async () => {
            // catch up the simulation to the current time
            let currentSimulationTime = simulationStartTime + nSimulationStep * simulationTimestepMs;
            let timeToSimulate = Date.now() - currentSimulationTime;
            if (timeToSimulate > MAX_SIMULATION_DRIFT_MS) {
                // if drifting too much, drop simulation steps 
                nSimulationStep += Math.ceil(timeToSimulate / simulationTimestepMs);

                currentSimulationTime = simulationStartTime + nSimulationStep * simulationTimestepMs;
                timeToSimulate = Date.now() - currentSimulationTime;
            }
            while (timeToSimulate > 0) {
                await this.doSimulationStep();

                nSimulationStep++;
                timeToSimulate -= simulationTimestepMs;
            }


            await this.render();

            handle = requestAnimationFrame(loop);
        };

        handle = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(handle);
        };
    }

    private get simulationStepStorageBindGroup() {
        return this.buffer1IsSource
            ? this.simulationStepPipelineManager.storageBindGroup1_2
            : this.simulationStepPipelineManager.storageBindGroup2_1;
    }

    private get particleDataBuffer() {
        return this.buffer1IsSource
            ? this.pipelineData.particleDataBuffer1
            : this.pipelineData.particleDataBuffer2;
    }
}