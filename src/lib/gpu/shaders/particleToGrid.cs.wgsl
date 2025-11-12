@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(1) @binding(0) var<storage, read> particleDataIn: array<ParticleData>;
@group(1) @binding(1) var<storage, read_write> particleDataOut: array<ParticleData>;

@compute
@workgroup_size(256)
fn doParticleToGrid(
    @builtin(global_invocation_id) gid: vec3u,
) {
    let threadIndex = gid.x;
    if threadIndex > arrayLength(&particleDataIn) { return; }
}