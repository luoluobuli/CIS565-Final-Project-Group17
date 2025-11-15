@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(1) @binding(1) var<storage, read_write> gridData: array<GridData>;

@compute
@workgroup_size(256)
fn doGridUpdate(
    @builtin(global_invocation_id) gid: vec3u,
) {
    let threadIndex = gid.x;
    if threadIndex >= arrayLength(&gridData) { return; }

    let grid = &gridData[threadIndex];

    let mass = bitcast<f32>(atomicLoad(&(*grid).mass));
    if (mass > 0.0) {
        var vel = vec3f(
            bitcast<f32>(atomicLoad(&(*grid).vx)),
            bitcast<f32>(atomicLoad(&(*grid).vy)),
            bitcast<f32>(atomicLoad(&(*grid).vz)),
        ) / mass;

        vel += vec3f(0.0, 0.0, -9.81) * uniforms.simulationTimestep;

        atomicStore(&(*grid).vx, bitcast<u32>(vel.x));
        atomicStore(&(*grid).vy, bitcast<u32>(vel.y));
        atomicStore(&(*grid).vz, bitcast<u32>(vel.z));
    }
}