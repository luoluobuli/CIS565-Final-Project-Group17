<script lang="ts">
import { onMount, tick } from "svelte";
import { requestGpuDeviceAndContext } from "./gpu/requestGpuDeviceAndContext";
import { setupGpuPipelines } from "./gpu/setupGpuPipelines";
import { createGpuRenderer } from "./gpu/createGpuRenderer";
import { Camera } from "./Camera.svelte";
import { CameraOrbit } from "./CameraOrbit.svelte";
import Draggable, {type Point} from "./Draggable.svelte";
    import { createGpuSimulator } from "./gpu/createGpuSimulator";

let {
    onStatusChange,
    onErr,
}: {
    onStatusChange: (text: string) => void,
    onErr: (text: string) => void,
} = $props();



let canvas: HTMLCanvasElement;
let width = $state(300);
let height = $state(150);

let nParticles = $state(2_000);
let simulate: (() => Promise<void>) | null = null;
let render: (() => Promise<void>) | null = null;


const rerender = async () => {
    if (render === null) return;

    onStatusChange("rendering");
    await render();
    onStatusChange("done!");
};

const updateCanvasSizeAndRerender = async () => {
    width = innerWidth;
    height = innerHeight;

    await tick();
    await rerender();
};


const orbit = new CameraOrbit();
const camera = new Camera({controlScheme: orbit, screenDims: {width: () => width, height: () => height}});

onMount(async () => {
    const response = await requestGpuDeviceAndContext({onStatusChange, onErr, canvas});
    if (response === null) return;
    const {device, context, format} = response;
    const {particleDataBuffer1: particleDataBuffer, uniformsBuffer, uniformsBindGroup, renderPipeline, simulationStepPipeline, simulationStepStorageBindGroup} = setupGpuPipelines({device, format, nParticles});
    
    simulate = createGpuSimulator({device, simulationStepPipeline, uniformsBindGroup, simulationStepStorageBindGroup, nParticles});
    render = createGpuRenderer({device, context, nParticles, uniformsBindGroup, renderPipeline, particleDataBuffer, uniformsBuffer, camera});
    
    updateCanvasSizeAndRerender();
});
</script>


<svelte:window onresize={() => updateCanvasSizeAndRerender()} />

<Draggable onDrag={async ({movement}) => {
    orbit.move(movement);
    await rerender();
}}>
    {#snippet dragTarget({onpointerdown})}
        <canvas
            bind:this={canvas}
            {width}
            {height}
            {onpointerdown}
        ></canvas>
    {/snippet}
</Draggable>
