@group(1) @binding(0) var<storage, read_write> particleDataIn: ParticleData;
@group(1) @binding(1) var<storage, read_write> particleDataOut: ParticleData;

@compute
@workgroup_size(256)
fn doSimulationStep() {

}