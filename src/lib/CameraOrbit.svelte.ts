import { mat4, vec3, type Mat4 } from "wgpu-matrix";
import type { CameraControlScheme } from "./Camera.svelte";
import type { Point } from "./Draggable.svelte";
import { mod, PI_2, REV } from "./util";


const ORBIT_CONTROL_SCALE = 0.005;

export class CameraOrbit implements CameraControlScheme {
    radius = $state(2);
    lat = $state(0);
    long = $state(0);
    
    offset = $state(vec3.zero());

    readonly orientation = $derived(mat4.mul(
        mat4.rotationZ(-this.long),
        mat4.rotationX(-this.lat + PI_2),
    ));

    readonly pos = $derived(vec3.add(
        vec3.transformMat4(vec3.fromValues(0, 0, this.radius), this.orientation),
        this.offset,
    ));
    readonly rot = $derived(this.orientation);

    readonly view = $derived(mat4.inverse(mat4.mul(mat4.translation(this.pos), this.rot)));

    viewTransform(): Mat4 {
        return this.view;
    }

    move(movement: Point) {
        this.lat = mod(this.lat + movement.y * ORBIT_CONTROL_SCALE, REV);

        if (PI_2 < this.lat && this.lat < 3 * PI_2) {
            this.long = mod(this.long - movement.x * ORBIT_CONTROL_SCALE, REV);
        } else {
            this.long = mod(this.long + movement.x * ORBIT_CONTROL_SCALE, REV);
        }
    }
}