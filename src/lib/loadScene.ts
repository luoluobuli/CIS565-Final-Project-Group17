// import { load } from "@loaders.gl/core";
// import { GLTFLoader } from "@loaders.gl/gltf";

// export const loadMeshes = async (url: string) => {
//     const {json} = await load(url, GLTFLoader);

//     if (json.meshes === undefined) return;

//     for (const mesh of json.meshes) {

//     }
// };

import {GLTFLoader, type GLTF} from "three/addons/loaders/GLTFLoader.js";
import { Matrix4, Mesh, MeshPhysicalMaterial, Object3D, Vector3 } from "three";


const traverseChildren = (scene: Object3D, fn: (child: Object3D) => void) => {
    fn(scene);

    for (const child of scene.children) {
        traverseChildren(child, fn);
    }
};

const vec = (array: Float32Array, mat: Matrix4) => {
    const vec3 = new Vector3(array[0], array[1], array[2]).applyMatrix4(mat);
    return [vec3.x, vec3.z, vec3.y];
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

export const loadGltfScene = async (url: string) => {
    const gltf = await new Promise<GLTF>((resolve, _reject) => new GLTFLoader().load(url, resolve));

    let nTriBytes = 0;
    let nMaterialBytes = 0;
    let nBoundingBoxBytes = 0;

    const materialMap = new Map<MeshPhysicalMaterial, number>();

    traverseChildren(gltf.scene, child => {
        if (!(child instanceof Mesh)) return;
        nTriBytes += child.geometry.index.array.length / 3 * 48;
        
        if (!materialMap.has(child.material)) {
            materialMap.set(child.material, materialMap.size);
            nMaterialBytes += 48;
        }

        nBoundingBoxBytes += 32;
    });

    const triangles = new ArrayBuffer(nTriBytes);
    let triOffset = 0;

    const boundingBoxes = new ArrayBuffer(nBoundingBoxBytes);
    let boundingBoxOffset = 0;

    traverseChildren(gltf.scene, child => {
        if (!(child instanceof Mesh)) return;


        const boxTriangleIndex = triOffset / 48;
        const boxMin = [Infinity, Infinity, Infinity];
        const boxMax = [-Infinity, -Infinity, -Infinity];


        const pos = child.geometry.attributes.position.array;
        const index = child.geometry.index.array;

        for (let i = 0; i < index.length; i += 3) {
            const v0 = vec(pos.slice(3 * index[i], 3 * index[i] + 3), child.matrix);
            const v1 = vec(pos.slice(3 * index[i + 1], 3 * index[i + 1] + 3), child.matrix);
            const v2 = vec(pos.slice(3 * index[i + 2], 3 * index[i + 2] + 3), child.matrix);

            new Float32Array(triangles, triOffset).set(v0);
            new Float32Array(triangles, triOffset + 16).set(v1);
            new Float32Array(triangles, triOffset + 32).set(v2);
            new Uint32Array(triangles, triOffset + 12).set([materialMap.get(child.material)!]);

            boxMin[0] = Math.min(boxMin[0], v0[0], v1[0], v2[0]);
            boxMin[1] = Math.min(boxMin[1], v0[1], v1[1], v2[1]);
            boxMin[2] = Math.min(boxMin[2], v0[2], v1[2], v2[2]);
            boxMax[0] = Math.max(boxMax[0], v0[0], v1[0], v2[0]);
            boxMax[1] = Math.max(boxMax[1], v0[1], v1[1], v2[1]);
            boxMax[2] = Math.max(boxMax[2], v0[2], v1[2], v2[2]);

            triOffset += 48;
        }

        new Float32Array(boundingBoxes, boundingBoxOffset).set([
            boxMin[0], boxMin[1], boxMin[2], 0,
            boxMax[0], boxMax[1], boxMax[2],
        ]);
        new Uint32Array(boundingBoxes, boundingBoxOffset + 28).set([boxTriangleIndex]);

        boundingBoxOffset += 32;
    });

    const materials = new ArrayBuffer(nMaterialBytes);
    for (const [material, i] of materialMap) {
        new Float32Array(materials, i * 48).set([
            material.color.r,
            material.color.g,
            material.color.b,
            Object.hasOwn(material, "transmission") ? 1 - material.transmission : 1,

            material.emissive.r * material.emissiveIntensity,
            material.emissive.g * material.emissiveIntensity,
            material.emissive.b * material.emissiveIntensity,
            [material.emissiveIntensity, material.emissive.r, material.emissive.g, material.emissive.b].every(c => c > 0) ? 1 : 0,

            material.roughness,
            0,
            0,
            0,
        ]);
    }

    const vertices: number[][] = [];
    traverseChildren(gltf.scene, child => {
        if (!(child instanceof Mesh)) return;
        
        const pos = child.geometry.attributes.position.array;
        const index = child.geometry.index.array;
        
        for (let i = 0; i < index.length; i++) {
            const v = vec(pos.slice(3 * index[i], 3 * index[i] + 3), child.matrix);
            vertices.push(v);
        }
    });

    return {
        boundingBoxes,
        triangles,
        materials,
        vertices,
    };
};