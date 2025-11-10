<script lang="ts">
import type { Snippet } from "svelte";

export type Point = {
    x: number,
    y: number,
};

const {
    dragTarget,
    onDrag,
}: {
    dragTarget: Snippet<[{
        onpointerdown: (event: PointerEvent) => void,
    }]>,
    onDrag: (data: {
        movement: Point,
        displacement: Point,
    }) => void,
} = $props();

let dragStartPos = $state.raw<Point | null>(null);
const dragging = $derived(dragStartPos !== null);


const handlePointerDown = (event: PointerEvent) => {
    dragStartPos = {
        x: event.pageX,
        y: event.pageY,
    };
};
const handlePointerMove = (event: PointerEvent) => {
    if (dragStartPos === null) return;

    onDrag({
        movement: {
            x: event.movementX,
            y: event.movementY,
        },
        displacement: {
            x: event.pageX - dragStartPos.x,
            y: event.pageY - dragStartPos.y,
        },
    });
};
const handlePointerUp = () => {
    dragStartPos = null;
};
</script>

<svelte:window
    onpointermove={dragging ? handlePointerMove : null}
    onpointerup={dragging ? handlePointerUp : null}
/>

{@render dragTarget({
    onpointerdown: handlePointerDown,
})}