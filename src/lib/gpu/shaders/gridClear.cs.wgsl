@group(1) @binding(1) var<storage, read_write> gridData: array<CellData>;

@compute
@workgroup_size(256)
fn doClearGrid(
    @builtin(global_invocation_id) gid: vec3u,
) {
    let threadIndex = gid.x;
    if threadIndex >= arrayLength(&gridData) { return; }

    let grid = &gridData[threadIndex];

    atomicStore(&(*grid).momentumX, 0);
    atomicStore(&(*grid).momentumY, 0);
    atomicStore(&(*grid).momentumZ, 0);
    atomicStore(&(*grid).mass, 0);
}
