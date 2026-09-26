// Modified from:
// https://jrouwe.github.io/JoltPhysics.js/falling_shapes.html (view source for <script>)
// https://jrouwe.github.io/JoltPhysics.js/js/example.js

import * as THREE from "three";
import type JoltTypes from "jolt-physics/wasm";
import {
  CAM_Y,
  CROUCH_RATIO,
  CROUCH_SPEED,
  getPlayerData,
  getPlayerMesh,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
} from "../objects/player";
import { lerp } from "three/src/math/MathUtils.js";
import { bootLog } from "../boot";
import { isMobile } from "../util/mobile";

const { default: initJolt } = await import("jolt-physics/wasm");

let Jolt: typeof initJolt,
  joltInterface: JoltTypes.JoltInterface,
  initPromise: Promise<void> | null = null;

const dynamicObjects = new Set<THREE.Mesh>(),
  LAYER_STATIC = 0,
  LAYER_DYNAMIC = 1,
  LAYER_NOCLIP = 2,
  NUM_OBJECT_LAYERS = 2,
  NUM_BROAD_PHASE_LAYERS = 2;

const debugGroup = new THREE.Group();
debugGroup.visible = false;

export let playerRotDelta = 0;
let playerChar: JoltTypes.CharacterVirtual | undefined,
  movingBPFilter: JoltTypes.DefaultBroadPhaseLayerFilter | undefined,
  movingLayerFilter: JoltTypes.DefaultObjectLayerFilter | undefined,
  bodyFilter: JoltTypes.BodyFilter | undefined,
  shapeFilter: JoltTypes.ShapeFilter | undefined,
  updateSettings: JoltTypes.ExtendedUpdateSettings | undefined;

let standingShape: JoltTypes.Shape,
  crouchingShape: JoltTypes.Shape,
  isCrouched = false;

const playerObj = getPlayerMesh();
let playerCam: THREE.Camera | undefined,
  crouchProgress = 1,
  crouchTarget = 1,
  crouchStartScale = 1;

const FIXED_DELTA = isMobile ? 1 / 15 : 1 / 30,
  MAX_STEPS_PER_FRAME = 5,
  DEATH_HEIGHT = -2.5;

let gravity: JoltTypes.Vec3,
  tempVec3: JoltTypes.Vec3,
  respawnPos: JoltTypes.RVec3,
  playerRespawnPos: JoltTypes.RVec3,
  zeroVel: JoltTypes.Vec3,
  playerWasReset = false;

export function respawnPlayer() {
  playerWasReset = true;
}

function joltToVec3(
  v: JoltTypes.RVec3 | JoltTypes.Vec3,
  target: THREE.Vector3,
) {
  target.set(v.GetX(), v.GetY(), v.GetZ());
}
function joltToQuat(q: JoltTypes.Quat, target: THREE.Quaternion) {
  target.set(q.GetX(), q.GetY(), q.GetZ(), q.GetW());
}

export function isPlayerGrounded(): boolean {
  return playerChar
    ? playerChar.GetGroundState() === Jolt.EGroundState_OnGround
    : false;
}
export function isPlayerHittingCeiling(): boolean {
  if (!playerChar) return false;

  const contacts = playerChar.GetActiveContacts();
  if (!contacts || contacts.size() === 0) return false;

  for (let i = 0; i < contacts.size(); i++) {
    const contact = contacts.at(i);
    const normalY = contact.mContactNormal.GetY();

    if (normalY < -0.5) {
      return true;
    }
  }
  return false;
}
export function isPlayerCrouched(): boolean {
  return isCrouched;
}

export function setPlayerCollision(enable: boolean) {
  if (enable) {
    movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(
      joltInterface.GetObjectVsBroadPhaseLayerFilter(),
      LAYER_DYNAMIC,
    );
    movingLayerFilter = new Jolt.DefaultObjectLayerFilter(
      joltInterface.GetObjectLayerPairFilter(),
      LAYER_DYNAMIC,
    );
  } else {
    movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(
      joltInterface.GetObjectVsBroadPhaseLayerFilter(),
      LAYER_NOCLIP,
    );
    movingLayerFilter = new Jolt.DefaultObjectLayerFilter(
      joltInterface.GetObjectLayerPairFilter(),
      LAYER_NOCLIP,
    );
  }
}

export function applyWallDrag(velocity: THREE.Vector3) {
  if (!playerChar) return;
  const contacts = playerChar.GetActiveContacts();

  for (let i = 0; i < contacts.size(); i++) {
    const contact = contacts.at(i);
    const n = contact.mContactNormal;
    const nx = n.GetX(),
      nz = n.GetZ();

    if (
      joltInterface
        .GetPhysicsSystem()
        .GetBodyInterface()
        .GetMotionType(contact.mBodyB) === Jolt.EMotionType_Dynamic
    )
      continue;

    const dot = velocity.x * nx + velocity.z * nz;
    if (dot < 0) {
      velocity.x -= nx * dot;
      velocity.z -= nz * dot;
    }
  }
}

let playerOffsetY = 0;
function updatePlayerCrouchAnimation(delta: number) {
  if (!playerObj || !playerCam || crouchProgress >= 1) return;

  crouchProgress = Math.min(1, crouchProgress + delta / CROUCH_SPEED);

  const scale = lerp(
    crouchStartScale,
    crouchTarget,
    1 - Math.pow(1 - crouchProgress, 3),
  );

  playerObj.geometry = new THREE.CapsuleGeometry(
    PLAYER_RADIUS,
    PLAYER_HEIGHT * scale,
    16,
    32,
  );
  playerObj.userData.debugMesh.scale.y = scale;

  playerCam.position.y = CAM_Y * scale;
  playerOffsetY = (PLAYER_HEIGHT * crouchTarget - PLAYER_HEIGHT * scale) / 2;
}

const totalStandingHeight = PLAYER_HEIGHT + PLAYER_RADIUS * 2;
const totalCrouchHeight = PLAYER_HEIGHT * CROUCH_RATIO + PLAYER_RADIUS * 2;
const HEIGHT_DELTA = totalStandingHeight - totalCrouchHeight;

export function crouchPlayer(
  crouch: boolean,
  obj: THREE.Mesh,
  camera: THREE.Camera,
): boolean {
  if (crouch === isCrouched) return false;
  if (
    !playerChar ||
    !obj.parent ||
    !movingBPFilter ||
    !movingLayerFilter ||
    !bodyFilter ||
    !shapeFilter
  )
    return false;

  const scale = crouch ? CROUCH_RATIO : 1;
  const offsetY = crouch ? -HEIGHT_DELTA / 2 : HEIGHT_DELTA / 2;

  const pos = playerChar.GetPosition();
  playerChar.SetPosition(
    new Jolt.RVec3(pos.GetX(), pos.GetY() + offsetY, pos.GetZ()),
  );

  const success = playerChar.SetShape(
    crouch ? crouchingShape : standingShape,
    0.1,
    movingBPFilter,
    movingLayerFilter,
    bodyFilter,
    shapeFilter,
    joltInterface.GetTempAllocator(),
  );
  if (!success) {
    playerChar.SetPosition(pos);
    return false;
  }

  updatePrevPos(obj.parent.userData, playerChar.GetPosition(), true);
  const startScale =
    (obj.geometry as THREE.CapsuleGeometry).parameters.height / PLAYER_HEIGHT;
  playerOffsetY = (PLAYER_HEIGHT * scale - PLAYER_HEIGHT * startScale) / 2;

  playerCam = camera;
  crouchStartScale = startScale;
  crouchTarget = scale;
  crouchProgress = 0;

  isCrouched = crouch;
  return true;
}

export async function initPhysics(scene: THREE.Scene): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    Jolt = await initJolt();

    const settings = new Jolt.JoltSettings();
    settings.mMaxWorkerThreads = 3;

    setupCollisionFiltering(settings);

    joltInterface = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);

    gravity = joltInterface.GetPhysicsSystem().GetGravity();
    respawnPos = new Jolt.RVec3(0, 2, -8.5);
    playerRespawnPos = new Jolt.RVec3(0, 2, 0.3);
    zeroVel = new Jolt.Vec3(0, 0, 0);
    tempVec3 = new Jolt.Vec3(0, 0, 0);

    scene.add(debugGroup);

    bootLog("Physics initialised");
  })();

  return initPromise;
}

export function getGravityY() {
  return joltInterface.GetPhysicsSystem().GetGravity().GetY();
}

export async function addPhysicsToObject(
  obj: THREE.Mesh,
  dynamic = false,
  showDebug = false,
  isPlayer = false,
) {
  if (initPromise) await initPromise;
  if (!obj.parent) return;

  bootLog(`Adding physics to ${obj.name}...`);

  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();
  let shape: JoltTypes.Shape;

  if (isPlayer) {
    standingShape = new Jolt.CapsuleShape(PLAYER_HEIGHT / 2, PLAYER_RADIUS);
    crouchingShape = new Jolt.CapsuleShape(
      (PLAYER_HEIGHT * CROUCH_RATIO) / 2,
      PLAYER_RADIUS,
    );
    standingShape.AddRef();
    crouchingShape.AddRef();

    shape = standingShape;
  } else {
    obj.updateMatrixWorld(true);
    const posAttr = obj.geometry.attributes.position,
      vertices = new Jolt.ArrayVec3();

    for (let i = 0; i < posAttr.count; i++) {
      const pt = new Jolt.Vec3(
        posAttr.getX(i) * obj.scale.x,
        posAttr.getY(i) * obj.scale.y,
        posAttr.getZ(i) * obj.scale.z,
      );
      vertices.push_back(pt);
      Jolt.destroy(pt);
    }

    const shapeSettings = new Jolt.ConvexHullShapeSettings();
    shapeSettings.set_mPoints(vertices);
    const shapeResult = shapeSettings.Create();
    shape = shapeResult.Get();

    Jolt.destroy(vertices);
    Jolt.destroy(shapeSettings);
  }

  const p = obj.parent.position,
    q = obj.parent.quaternion,
    pos = new Jolt.RVec3(p.x, p.y, p.z),
    rot = new Jolt.Quat(q.x, q.y, q.z, q.w);

  if (!obj.parent.userData.prevPos) {
    obj.parent.userData.prevPos = new THREE.Vector3(p.x, p.y, p.z);
    obj.parent.userData.currPos = obj.parent.userData.prevPos.clone();
    obj.parent.userData.prevQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    obj.parent.userData.currQuat = obj.parent.userData.prevQuat.clone();
  }

  if (isPlayer) {
    const settings = new Jolt.CharacterVirtualSettings();
    settings.mShape = shape;
    settings.mMass = 1;
    settings.mMaxStrength = 100;
    settings.set_mMaxSlopeAngle((45 * Math.PI) / 180);
    settings.mCharacterPadding = 0.02;
    settings.mPenetrationRecoverySpeed = 1.0;
    settings.mPredictiveContactDistance = 0.1;
    settings.mInnerBodyShape = shape;
    settings.mInnerBodyLayer = LAYER_DYNAMIC;

    playerChar = new Jolt.CharacterVirtual(
      settings,
      pos,
      rot,
      joltInterface.GetPhysicsSystem(),
    );
    obj.userData.character = playerChar;

    movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(
      joltInterface.GetObjectVsBroadPhaseLayerFilter(),
      LAYER_NOCLIP,
    );
    movingLayerFilter = new Jolt.DefaultObjectLayerFilter(
      joltInterface.GetObjectLayerPairFilter(),
      LAYER_NOCLIP,
    );
    bodyFilter = new Jolt.BodyFilter();
    shapeFilter = new Jolt.ShapeFilter();
    updateSettings = new Jolt.ExtendedUpdateSettings();
    updateSettings.mWalkStairsStepUp = new Jolt.Vec3(0, 0.15, 0);

    Jolt.destroy(settings);
  } else {
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
    bodySettings.mFriction = 0.5;

    if (dynamic) {
      bodySettings.mOverrideMassProperties =
        Jolt.EOverrideMassProperties_CalculateInertia;
      bodySettings.mMassPropertiesOverride.mMass = 10;
      obj.userData.dynamic = true;
    }

    const body = bodyInterface.CreateBody(bodySettings);
    bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    Jolt.destroy(bodySettings);

    obj.userData.body = body;
    dynamicObjects.add(obj);
  }

  Jolt.destroy(pos);
  Jolt.destroy(rot);

  if (showDebug) {
    const mat = (
      Array.isArray(obj.material) ? obj.material[0] : obj.material
    ) as THREE.MeshBasicMaterial;

    const debugMesh = createDebugMesh(
      shape,
      mat.color.clone().multiplyScalar(10),
    );
    obj.userData.debugMesh = debugMesh;
    if (isPlayer) {
      debugMesh.name = "playerDebug";
      debugMesh.visible = false;
    }
    debugGroup.add(debugMesh);
  }

  bootLog(`Added physics to ${obj.name}`);
}

export async function removePhysicsFromObject(
  obj: THREE.Mesh,
  body: JoltTypes.Body,
) {
  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();
  const id = body.GetID();
  bodyInterface.RemoveBody(id);
  bodyInterface.DestroyBody(id);
  if (obj.userData.debugMesh)
    obj.userData.debugMesh.parent.remove(obj.userData.debugMesh);
  dynamicObjects.delete(obj);
}

export async function pausePhysicsOfObject(
  obj: THREE.Mesh,
  body: JoltTypes.Body,
) {
  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();
  const id = body.GetID();
  bodyInterface.DeactivateBody(id);
  if (obj.userData.debugMesh) obj.userData.debugMesh.visible = false;
  dynamicObjects.delete(obj);
}
export function resumePhysicsOfObject(
  obj: THREE.Mesh,
  body: JoltTypes.Body,
  pos: THREE.Vector3,
  rot: THREE.Quaternion,
) {
  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();
  const id = body.GetID();

  const physData = obj.parent!.userData;
  physData.currPos = pos;
  physData.currQuat = rot;
  physData.prevPos = null;
  physData.prevQuat = null;

  const physPos = new Jolt.RVec3(pos.x, pos.y, pos.z);
  const physRot = new Jolt.Quat(rot.x, rot.y, rot.z, rot.w);
  bodyInterface.SetPositionRotationAndVelocity(
    id,
    physPos,
    physRot,
    zeroVel,
    zeroVel,
  );

  if (obj.userData.debugMesh) obj.userData.debugMesh.visible = true;
  if (obj.userData.dynamic) dynamicObjects.add(obj);
  bodyInterface.ActivateBody(id);

  Jolt.destroy(physPos);
  Jolt.destroy(physRot);
}

export function togglePhysicsDebug(isPlayer = false) {
  if (isPlayer) {
    const playerMesh = debugGroup.getObjectByName("playerDebug");
    if (!playerMesh) return;
    playerMesh.visible = !playerMesh.visible;
  } else debugGroup.visible = !debugGroup.visible;
}

function createDebugMesh(
  shape: JoltTypes.Shape,
  color: THREE.Color,
): THREE.Mesh {
  const scale = new Jolt.Vec3(1, 1, 1),
    identity = new Jolt.Quat(0, 0, 0, 1),
    center = shape.GetCenterOfMass();

  const triContext = new Jolt.ShapeGetTriangles(
    shape,
    Jolt.AABox.prototype.sBiggest(),
    center,
    identity,
    scale,
  );

  Jolt.destroy(scale);
  Jolt.destroy(identity);

  const vertices = new Float32Array(
    Jolt.HEAPF32.buffer,
    triContext.GetVerticesData(),
    triContext.GetVerticesSize() / Float32Array.BYTES_PER_ELEMENT,
  ).slice();

  Jolt.destroy(triContext);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
    }),
  );
}

let accumulator = 0;
export function updatePhysics(delta: number) {
  if (!joltInterface || delta <= 0) return;

  accumulator += delta;
  const maxAccum = FIXED_DELTA * MAX_STEPS_PER_FRAME;
  if (accumulator > maxAccum) accumulator = maxAccum;

  while (accumulator >= FIXED_DELTA) {
    doPhysicsStep(FIXED_DELTA);
    document.dispatchEvent(new CustomEvent("physics", { detail: FIXED_DELTA }));
    accumulator -= FIXED_DELTA;
  }

  updatePlayerCrouchAnimation(delta);
  lerpPhysics(accumulator / FIXED_DELTA);
}

function updatePrevPos(
  data: any,
  pos: JoltTypes.RVec3 | JoltTypes.Vec3,
  snap: boolean,
  rot?: JoltTypes.Quat,
) {
  if (data.prevPos == null) data.prevPos = new THREE.Vector3();
  if (data.prevQuat == null) data.prevQuat = new THREE.Quaternion();

  if (snap) {
    joltToVec3(pos, data.prevPos);
    if (rot) joltToQuat(rot, data.prevQuat);
  } else {
    data.prevPos.copy(data.currPos);
    if (rot) data.prevQuat.copy(data.currQuat);
  }
  joltToVec3(pos, data.currPos);
  if (rot) joltToQuat(rot, data.currQuat);
}

function doPhysicsStep(delta: number) {
  joltInterface.Step(delta, 1);

  const bodyInterface = joltInterface.GetPhysicsSystem().GetBodyInterface();

  for (const obj of dynamicObjects) {
    if (!obj.parent) continue;
    const bodyId = obj.userData.body.GetID();
    let pos = bodyInterface.GetPosition(bodyId);
    const wasReset = pos.GetY() < DEATH_HEIGHT;

    if (wasReset) {
      Jolt.destroy(pos);
      const identity = new Jolt.Quat(0, 0, 0, 1);
      bodyInterface.SetPositionAndRotation(
        bodyId,
        respawnPos,
        identity,
        Jolt.EActivation_Activate,
      );
      Jolt.destroy(identity);
      bodyInterface.SetLinearVelocity(bodyId, zeroVel);
      bodyInterface.SetAngularVelocity(bodyId, zeroVel);
      pos = bodyInterface.GetPosition(bodyId);
    }

    const rot = bodyInterface.GetRotation(bodyId);

    updatePrevPos(obj.parent.userData, pos, wasReset, rot);

    if (wasReset) {
      joltToVec3(pos, obj.parent.userData.prevPos);
      joltToQuat(rot, obj.parent.userData.prevQuat);
      obj.parent.position.set(pos.GetX(), pos.GetY(), pos.GetZ());
    }

    Jolt.destroy(pos);
  }

  if (
    !playerChar ||
    !playerObj.parent ||
    !updateSettings ||
    !movingBPFilter ||
    !movingLayerFilter ||
    !bodyFilter ||
    !shapeFilter
  )
    return;

  const playerData = getPlayerData();

  tempVec3.Set(playerData.velPosX, playerData.velPosY, playerData.velPosZ);
  playerChar.SetLinearVelocity(tempVec3);

  playerChar.ExtendedUpdate(
    delta,
    gravity,
    updateSettings,
    movingBPFilter,
    movingLayerFilter,
    bodyFilter,
    shapeFilter,
    joltInterface.GetTempAllocator(),
  );

  let charPos = playerChar.GetPosition();
  if (!playerWasReset) playerWasReset = charPos.GetY() < DEATH_HEIGHT;

  if (playerWasReset) {
    playerChar.SetPosition(playerRespawnPos);
    playerChar.SetLinearVelocity(zeroVel);

    charPos = playerChar.GetPosition();
  }

  updatePrevPos(playerObj.parent.userData, charPos, playerWasReset);

  if (playerWasReset) {
    joltToVec3(charPos, playerObj.parent.userData.prevPos);
    playerObj.parent.position.set(
      charPos.GetX(),
      charPos.GetY(),
      charPos.GetZ(),
    );
  }

  playerWasReset = false;
}

function lerpPhysics(alpha: number) {
  const updateMeshTransform = (obj: THREE.Mesh) => {
    if (!obj.parent) return;
    const uData = obj.parent.userData;

    if (uData.prevPos)
      obj.parent.position.lerpVectors(uData.prevPos, uData.currPos, alpha);
    else obj.parent.position.copy(uData.currPos);

    if (obj != playerObj)
      if (uData.prevQuat)
        obj.parent.quaternion.copy(uData.prevQuat).slerp(uData.currQuat, alpha);
      else obj.parent.quaternion.copy(uData.currQuat);

    if (obj == playerObj) obj.parent.position.y -= playerOffsetY;

    if (obj.userData.debugMesh) {
      obj.userData.debugMesh.position.copy(obj.parent.position);
      obj.userData.debugMesh.quaternion.copy(obj.parent.quaternion);
    }
  };

  for (const obj of dynamicObjects) updateMeshTransform(obj);
  updateMeshTransform(getPlayerMesh());
}

function setupCollisionFiltering(settings: JoltTypes.JoltSettings) {
  const objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
  objectFilter.EnableCollision(LAYER_STATIC, LAYER_DYNAMIC);
  objectFilter.EnableCollision(LAYER_DYNAMIC, LAYER_DYNAMIC);

  const BP_LAYER_STATIC = new Jolt.BroadPhaseLayer(0),
    BP_LAYER_DYNAMIC = new Jolt.BroadPhaseLayer(1);
  const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(
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
