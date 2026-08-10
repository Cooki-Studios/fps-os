// Modified from:
// https://jrouwe.github.io/JoltPhysics.js/falling_shapes.html (view source for <script>)
// https://jrouwe.github.io/JoltPhysics.js/js/example.js

import * as THREE from "three";
import type JoltTypes from "jolt-physics/wasm";
import { getPlayerData, resetPlayerRotDelta } from "./player";
const { default: initJolt } = await import("jolt-physics/wasm");

let Jolt: typeof initJolt;
let joltInterface: JoltTypes.JoltInterface;
let initPromise: Promise<void> | null = null;

const dynamicObjects: THREE.Mesh[] = [];
const LAYER_STATIC = 0;
const LAYER_DYNAMIC = 1;
const NUM_OBJECT_LAYERS = 2;
const debugGroup = new THREE.Group();
debugGroup.visible = false;

export let playerRotDelta = 0;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (joltInterface) {
      const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();
      for (const obj of dynamicObjects) {
        if (obj.userData.body) {
          bodyInterface.RemoveBody(obj.userData.body.GetID());
          bodyInterface.DestroyBody(obj.userData.body.GetID());
        }
        if (obj.userData.debugMesh) {
          debugGroup.remove(obj.userData.debugMesh);
          obj.userData.debugMesh.geometry.dispose();
          obj.userData.debugMesh.material.dispose();
          delete obj.userData.debugMesh;
        }
      }
      Jolt.destroy(joltInterface);
    }
    dynamicObjects.length = 0;
    debugGroup.clear();
    initPromise = null;
  });
}

export async function initPhysics(scene: THREE.Scene) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    Jolt = await initJolt();

    const settings = new Jolt.JoltSettings();
    settings.mMaxWorkerThreads = 3;

    setupCollisionFiltering(settings);

    joltInterface = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);

    scene.add(debugGroup);
  })();

  return initPromise;
}

export async function addPhysicsToObject(
  obj: THREE.Mesh,
  dynamic: boolean = false,
  showDebug = false,
  isPlayer = false,
  scene?: THREE.Scene,
) {
  if (initPromise) await initPromise;
  if (!obj.parent) return;

  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();
  let shape: JoltTypes.Shape;

  obj.updateMatrixWorld(true);

  const posAttr = obj.geometry.attributes.position;
  const vertices = new Jolt.ArrayVec3();

  for (let i = 0; i < posAttr.count; i++) {
    vertices.push_back(
      new Jolt.Vec3(
        posAttr.getX(i) * obj.scale.x,
        posAttr.getY(i) * obj.scale.y,
        posAttr.getZ(i) * obj.scale.z,
      ),
    );
  }

  const shapeSettings = new Jolt.ConvexHullShapeSettings();
  shapeSettings.set_mPoints(vertices);

  const shapeResult = shapeSettings.Create();
  shape = shapeResult.Get();

  Jolt.destroy(vertices);
  Jolt.destroy(shapeSettings);

  const pos = new Jolt.RVec3(
    obj.parent.position.x,
    obj.parent.position.y,
    obj.parent.position.z,
  );
  const rot = new Jolt.Quat(
    obj.parent.quaternion.x,
    obj.parent.quaternion.y,
    obj.parent.quaternion.z,
    obj.parent.quaternion.w,
  );

  const bodySettings = new Jolt.BodyCreationSettings(
    shape,
    pos,
    rot,
    dynamic ? Jolt.EMotionType_Dynamic : Jolt.EMotionType_Static,
    dynamic ? LAYER_DYNAMIC : LAYER_STATIC,
  );
  bodySettings.mMotionQuality = Jolt.EMotionQuality_LinearCast;
  bodySettings.mRestitution = 0.25;
  bodySettings.mLinearDamping = 0.2;
  bodySettings.mAngularDamping = 0.2;

  if (isPlayer)
    bodySettings.set_mAllowedDOFs(
      Jolt.EAllowedDOFs_TranslationX |
        Jolt.EAllowedDOFs_TranslationY |
        Jolt.EAllowedDOFs_TranslationZ,
    );

  const body = bodyInterface.CreateBody(bodySettings);
  bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);

  Jolt.destroy(shapeResult);
  Jolt.destroy(bodySettings);

  obj.userData.body = body;
  dynamicObjects.push(obj);

  if (showDebug && scene) {
    const debugMesh = createDebugMesh(shape);
    obj.userData.debugMesh = debugMesh;
    debugGroup.add(debugMesh);
  }
}

export function togglePhysicsDebug() {
  debugGroup.visible = !debugGroup.visible;
}

function createDebugMeshForShape(shape: JoltTypes.Shape): THREE.BufferGeometry {
  const scale = new Jolt.Vec3(1, 1, 1);
  const triContext = new Jolt.ShapeGetTriangles(
    shape,
    Jolt.AABox.prototype.sBiggest(),
    shape.GetCenterOfMass(),
    Jolt.Quat.prototype.sIdentity(),
    scale,
  );
  Jolt.destroy(scale);

  const vertices = new Float32Array(
    Jolt.HEAPF32.buffer,
    triContext.GetVerticesData(),
    triContext.GetVerticesSize() / Float32Array.BYTES_PER_ELEMENT,
  ).slice();

  Jolt.destroy(triContext);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createDebugMesh(shape: JoltTypes.Shape): THREE.Mesh {
  const geometry = createDebugMeshForShape(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

const MAX_PHYSICS_DELTA = 1 / 30;

export function updatePhysics(delta: number) {
  if (!joltInterface) return;

  const clampedDelta = Math.min(delta, MAX_PHYSICS_DELTA);
  const numSteps = Math.min(4, Math.max(1, Math.ceil(clampedDelta / (1 / 60))));
  joltInterface.Step(delta, numSteps);

  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();

  for (const obj of dynamicObjects) {
    if (!obj.parent) continue;

    const body = obj.userData.body;

    const pos = bodyInterface.GetPosition(body.GetID());
    const rot = bodyInterface.GetRotation(body.GetID());

    obj.parent.position.set(pos.GetX(), pos.GetY(), pos.GetZ());

    if (obj.name == "Player") {
      const deltaY = getPlayerData().deltaRotY;

      if (deltaY !== 0) {
        const halfAngle = deltaY * 0.5;
        const deltaQuat = new Jolt.Quat(
          0,
          Math.sin(halfAngle),
          0,
          Math.cos(halfAngle),
        );
        const newRot = rot.MulQuat(deltaQuat);

        bodyInterface.SetRotation(
          body.GetID(),
          newRot,
          Jolt.EActivation_Activate,
        );

        Jolt.destroy(deltaQuat);
        Jolt.destroy(newRot);
      }

      resetPlayerRotDelta();
    }
    obj.parent.quaternion.set(rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW());

    if (obj.userData.debugMesh) {
      obj.userData.debugMesh.position.set(pos.GetX(), pos.GetY(), pos.GetZ());
      obj.userData.debugMesh.quaternion.set(
        rot.GetX(),
        rot.GetY(),
        rot.GetZ(),
        rot.GetW(),
      );
    }

    Jolt.destroy(pos);
  }
}

function setupCollisionFiltering(settings: JoltTypes.JoltSettings) {
  let objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
  objectFilter.EnableCollision(LAYER_STATIC, LAYER_DYNAMIC);
  objectFilter.EnableCollision(LAYER_DYNAMIC, LAYER_DYNAMIC);

  const BP_LAYER_STATIC = new Jolt.BroadPhaseLayer(0);
  const BP_LAYER_DYNAMIC = new Jolt.BroadPhaseLayer(1);
  const NUM_BROAD_PHASE_LAYERS = 2;
  let bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(
    NUM_OBJECT_LAYERS,
    NUM_BROAD_PHASE_LAYERS,
  );
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_STATIC, BP_LAYER_STATIC);
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_DYNAMIC, BP_LAYER_DYNAMIC);

  settings.mObjectLayerPairFilter = objectFilter;
  settings.mBroadPhaseLayerInterface = bpInterface;
  settings.mObjectVsBroadPhaseLayerFilter =
    new Jolt.ObjectVsBroadPhaseLayerFilterTable(
      settings.mBroadPhaseLayerInterface,
      NUM_BROAD_PHASE_LAYERS,
      settings.mObjectLayerPairFilter,
      NUM_OBJECT_LAYERS,
    );
}
