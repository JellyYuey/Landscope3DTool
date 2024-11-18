import * as THREE from "three";
import { toSeePoint } from "../utilities";

/*************************************************************************************
 * CLASS NAME:  InstancedLOD
 * DESCRIPTION: Combine instancedMesh with lod instead of using THREE.LOD
 * NOTE:        Each class of InstancedLOD represents one single kind of tree,
 *              check 'treeSpecies' for detail
 *
 *************************************************************************************/ 0;
let count = 0;
class InstancedLOD {
  constructor(scene, camera, treeSpecies) {
    this.treeSpecies = treeSpecies;
    this.numOfLevel = 0;
    this.scene = scene;
    this.camera = camera;
    this.levels;
    this.instancedMeshOfAllLevel;
    this.groupOfInstances;

    this.frustum = new THREE.Frustum();
    this.worldProjectionMatrix = new THREE.Matrix4();
    this.obj_position = new THREE.Vector3();
    this.cur_dist = 0;
    this.cur_level = 0;
  }

  setOctree(octree) {
    this.octree = octree;
  }

  extractMeshes(group) {
    return group.children[0].isMesh
      ? group.children
      : group.children[0].children;
  }

  setLevels(array) {
    this.numOfLevel = array.length;
    this.levels = new Array(this.numOfLevel);
    this.instancedMeshOfAllLevel = new Array(this.numOfLevel); // array of { mesh:[], count, matrix4:[] }
    this.groupOfInstances = new Array(this.numOfLevel); // array of THREE.Group(), each Group -> tree meshes in each level
    for (let i = 0; i < this.numOfLevel; i++) {
      this.levels[i] = array[i].distance;
      this.instancedMeshOfAllLevel[i] = {
        meshes: this.extractMeshes(array[i].group),
        count: 0,
        matrix4: [],
      };
    }
  }

  setPopulation(number) {
    for (let i = 0; i < this.numOfLevel; i++) {
      const group = new THREE.Group();
      this.instancedMeshOfAllLevel[i].meshes.forEach((m) => {
        const instancedMesh = new THREE.InstancedMesh(
          m.geometry,
          m.material,
          15000,
        );
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        // instancedMesh.instanceMatrix.needsUpdate = true;
        group.add(instancedMesh);
      });
      this.groupOfInstances[i] = group;
      this.scene.add(group);
    }
  }

  getDistanceLevel(dist) {
    const { levels } = this;
    const length = levels.length;
    for (let i = 0; i < length; i++) {
      if (dist <= levels[i]) {
        return i;
      }
    }
    return length - 1;
  }

  getLastLevel() {
    return this.levels.length - 1;
  }

  getSpecies() {
    return this.treeSpecies;
  }

  expandFrustum(frustum, offset) {
    frustum.planes.forEach((plane) => {
      plane.constant += offset;
    });
  }

  /* render函数每帧都要进行,内存交换越少越好,计算时间越短越好 */
  render() {
    count++;
    let {
      instancedMeshOfAllLevel,
      groupOfInstances,
      numOfLevel,
      camera,
      frustum,
      octree,
      worldProjectionMatrix,
      obj_position,
      cur_dist,
      cur_level,
    } = this;
    // clear
    for (let i = 0; i < numOfLevel; i++) {
      instancedMeshOfAllLevel[i].count = 0;
      instancedMeshOfAllLevel[i].matrix4 = [];
    }
    // update camera frustum
    worldProjectionMatrix.identity(); // reset as identity matrix
    frustum.setFromProjectionMatrix(
      worldProjectionMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );

    this.expandFrustum(frustum, 25);
    let found = octree.queryByFrustum(frustum);
    found.forEach((matrix) => {
      obj_position.setFromMatrixPosition(matrix);
      cur_dist = obj_position.distanceTo(camera.position);
      cur_level = this.getDistanceLevel(cur_dist);
      instancedMeshOfAllLevel[cur_level].count++;
      instancedMeshOfAllLevel[cur_level].matrix4.push(matrix); // column-major list of a matrix
    });

    // console.log("instancedMeshOfAllLevel:", instancedMeshOfAllLevel);

    // if(count<5999)
    for (let i = 0; i < numOfLevel; i++) {
      // console.log(count)
      const obj = instancedMeshOfAllLevel[i]; // obj: { meshes:[], count, matrix4:[] }
      for (let j = 0; j < groupOfInstances[i].children.length; j++) {
        // let new_instancedMesh = new THREE.InstancedMesh(
        //   obj.meshes[j].geometry,
        //   obj.meshes[j].material,
        //   obj.count
        // );
        // for (let k = 0; k < obj.count; k++) {
        //   new_instancedMesh.setMatrixAt(k, obj.matrix4[k]);
        // }
        // new_instancedMesh.castShadow = true;
        // new_instancedMesh.receiveShadow = true;
        // groupOfInstances[i].children[j] = new_instancedMesh;

        let instancedMesh = groupOfInstances[i].children[j];

        if (instancedMesh.count >= obj.count) {
          instancedMesh.count = obj.count;
          for (let k = 0; k < obj.count; k++) {
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.setMatrixAt(k, obj.matrix4[k]);
          }
        } else {
          let new_instancedMesh = new THREE.InstancedMesh(
            obj.meshes[j].geometry,
            obj.meshes[j].material,
            obj.count,
          );
          for (let k = 0; k < obj.count; k++) {
            new_instancedMesh.setMatrixAt(k, obj.matrix4[k]);
          }
          new_instancedMesh.castShadow = true;
          new_instancedMesh.receiveShadow = true;
          groupOfInstances[i].children[j] = new_instancedMesh;
        }
      }
    }
    // console.log("groupOfInstances:", groupOfInstances);
  }
}

export { InstancedLOD };
