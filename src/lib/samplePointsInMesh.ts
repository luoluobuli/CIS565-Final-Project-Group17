const samplePointInTriangle = (v0: number[], v1: number[], v2: number[]): number[] => {
    let u = Math.random();
    let v = Math.random();
    
    if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
    }
    
    const w = 1 - u - v;
    
    return [
        w * v0[0] + u * v1[0] + v * v2[0],
        w * v0[1] + u * v1[1] + v * v2[1],
        w * v0[2] + u * v1[2] + v * v2[2],
    ];
};

export const samplePointsOnMeshSurface = (vertices: number[][], nPoints: number): Float32Array => {
    const points = new Float32Array(nPoints * 3);
    
    for (let i = 0; i < nPoints; i++) {
        const triIndex = Math.floor(Math.random() * vertices.length / 3) * 3;
        const v0 = vertices[triIndex];
        const v1 = vertices[triIndex + 1];
        const v2 = vertices[triIndex + 2];
        
        const point = samplePointInTriangle(v0, v1, v2);
        points[i * 3] = point[0];
        points[i * 3 + 1] = point[1];
        points[i * 3 + 2] = point[2];
    }
    
    return points;
};


const rayIntersectsTriangle = (
    rayOrigin: number[],
    rayDir: number[],
    v0: number[],
    v1: number[],
    v2: number[]
): boolean => {
    const EPSILON = 0.0000001;
    
    const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    
    const h = [
        rayDir[1] * edge2[2] - rayDir[2] * edge2[1],
        rayDir[2] * edge2[0] - rayDir[0] * edge2[2],
        rayDir[0] * edge2[1] - rayDir[1] * edge2[0]
    ];
    
    const a = edge1[0] * h[0] + edge1[1] * h[1] + edge1[2] * h[2];
    
    if (a > -EPSILON && a < EPSILON) return false;
    
    const f = 1.0 / a;
    const s = [rayOrigin[0] - v0[0], rayOrigin[1] - v0[1], rayOrigin[2] - v0[2]];
    const u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]);
    
    if (u < 0.0 || u > 1.0) return false;
    
    const q = [
        s[1] * edge1[2] - s[2] * edge1[1],
        s[2] * edge1[0] - s[0] * edge1[2],
        s[0] * edge1[1] - s[1] * edge1[0]
    ];
    
    const v = f * (rayDir[0] * q[0] + rayDir[1] * q[1] + rayDir[2] * q[2]);
    
    if (v < 0.0 || u + v > 1.0) return false;
    
    const t = f * (edge2[0] * q[0] + edge2[1] * q[1] + edge2[2] * q[2]);
    
    return t > EPSILON;
};

const isPointInsideMesh = (point: number[], meshVertices: number[][]): boolean => {
    // even-odd test using ray in +x dir
    const rayDir = [1, 0, 0];
    let intersections = 0;
    
    for (let i = 0; i < meshVertices.length; i += 3) {
        if (rayIntersectsTriangle(point, rayDir, meshVertices[i], meshVertices[i + 1], meshVertices[i + 2])) {
            intersections++;
        }
    }
    
    return intersections % 2 === 1;
};

const getMeshBounds = (meshVertices: number[][]) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    for (const v of meshVertices) {
        min[0] = Math.min(min[0], v[0]);
        min[1] = Math.min(min[1], v[1]);
        min[2] = Math.min(min[2], v[2]);
        max[0] = Math.max(max[0], v[0]);
        max[1] = Math.max(max[1], v[1]);
        max[2] = Math.max(max[2], v[2]);
    }
    
    return {min, max};
};

export const samplePointsInMeshVolume = (meshVertices: number[][], nPoints: number): Float32Array => {
    const points = new Float32Array(nPoints * 3);
    const {min, max} = getMeshBounds(meshVertices);
    

    // use rejection sampling
    let nSampled = 0;
    let nAttempt = 0;
    const nMaxAttempts = nPoints * 64;
    
    while (nSampled < nPoints && nAttempt < nMaxAttempts) {
        const candidate = [
            min[0] + Math.random() * (max[0] - min[0]),
            min[1] + Math.random() * (max[1] - min[1]),
            min[2] + Math.random() * (max[2] - min[2])
        ];
        
        if (isPointInsideMesh(candidate, meshVertices)) {
            points[nSampled * 3] = candidate[0];
            points[nSampled * 3 + 1] = candidate[1];
            points[nSampled * 3 + 2] = candidate[2];
            nSampled++;
        }
        
        nAttempt++;
    }
    
    // if we couldn't sample enough points, fill remaining with random points in bounding box
    for (let i = nSampled; i < nPoints; i++) {
        points[i * 3] = min[0] + Math.random() * (max[0] - min[0]);
        points[i * 3 + 1] = min[1] + Math.random() * (max[1] - min[1]);
        points[i * 3 + 2] = min[2] + Math.random() * (max[2] - min[2]);
    }
    
    return points;
};