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
  resetPlayerVelRot,
} from "./player";
import { lerp } from "three/src/math/MathUtils.js";
import { bootLog } from "./boot";
import { isMobile } from "./mobile";

const { default: initJolt } = await import("jolt-physics/wasm");

let Jolt: typeof initJolt,
  joltInterface: JoltTypes.JoltInterface,
  initPromise: Promise<void> | null = null;

const dynamicObjects: THREE.Mesh[] = [],
  LAYER_STATIC = 0,
  LAYER_DYNAMIC = 1,
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

let playerObj: THREE.Mesh | undefined,
  playerCam: THREE.Camera | undefined,
  crouchProgress = 1,
  crouchTarget = 1,
  crouchStartScale = 1;

const FIXED_DELTA = isMobile ? 1 / 15 : 1 / 30,
  MAX_STEPS_PER_FRAME = 5,
  DEATH_HEIGHT = -50,
  RESPAWN_HEIGHT = 5;

let gravity: JoltTypes.Vec3,
  tempVec3: JoltTypes.Vec3,
  tempQuat: JoltTypes.Quat,
  respawnPos: JoltTypes.RVec3,
  zeroVel: JoltTypes.Vec3;

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

  updatePrevPos(
    obj.parent.userData,
    playerChar.GetPosition(),
    playerChar.GetRotation(),
    true,
  );
  const startScale =
    (obj.geometry as THREE.CapsuleGeometry).parameters.height / PLAYER_HEIGHT;
  playerOffsetY = (PLAYER_HEIGHT * scale - PLAYER_HEIGHT * startScale) / 2;

  playerObj = obj;
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
    respawnPos = new Jolt.RVec3(0, RESPAWN_HEIGHT, 0);
    zeroVel = new Jolt.Vec3(0, 0, 0);
    tempVec3 = new Jolt.Vec3(0, 0, 0);
    tempQuat = new Jolt.Quat(0, 0, 0, 1);

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
  scene?: THREE.Scene,
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
      LAYER_DYNAMIC,
    );
    movingLayerFilter = new Jolt.DefaultObjectLayerFilter(
      joltInterface.GetObjectLayerPairFilter(),
      LAYER_DYNAMIC,
    );
    bodyFilter = new Jolt.BodyFilter();
    shapeFilter = new Jolt.ShapeFilter();
    updateSettings = new Jolt.ExtendedUpdateSettings();

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
    }

    const body = bodyInterface.CreateBody(bodySettings);
    bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    Jolt.destroy(bodySettings);

    obj.userData.body = body;
    dynamicObjects.push(obj);
  }

  Jolt.destroy(pos);
  Jolt.destroy(rot);

  if (showDebug && scene) {
    const debugMesh = createDebugMesh(shape, isPlayer);
    obj.userData.debugMesh = debugMesh;
    if (isPlayer) {
      debugMesh.name = "playerDebug";
      debugMesh.visible = false;
    }
    debugGroup.add(debugMesh);
  }

  bootLog(`Added physics to ${obj.name}`);
}

export function togglePhysicsDebug(isPlayer = false) {
  if (isPlayer) {
    const playerMesh = debugGroup.getObjectByName("playerDebug");
    if (!playerMesh) return;
    playerMesh.visible = !playerMesh.visible;
  } else debugGroup.visible = !debugGroup.visible;
}

function createDebugMesh(shape: JoltTypes.Shape, isPlayer = false): THREE.Mesh {
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
      color: isPlayer ? 0xf000ff : 0x00f0ff,
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
  rot: JoltTypes.Quat,
  snap: boolean,
) {
  if (snap) {
    joltToVec3(pos, data.prevPos);
    joltToQuat(rot, data.prevQuat);
  } else {
    data.prevPos.copy(data.currPos);
    data.prevQuat.copy(data.currQuat);
  }
  joltToVec3(pos, data.currPos);
  joltToQuat(rot, data.currQuat);
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

    updatePrevPos(obj.parent.userData, pos, rot, wasReset);

    if (wasReset) {
      joltToVec3(pos, obj.parent.userData.prevPos);
      joltToQuat(rot, obj.parent.userData.prevQuat);
      obj.parent.position.set(pos.GetX(), pos.GetY(), pos.GetZ());
    }

    Jolt.destroy(pos);
  }

  const playerObj = getPlayerMesh();
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

  if (playerData.velRotY !== 0) {
    playerObj.parent.rotateY(playerData.velRotY);
    const q = playerObj.parent.quaternion;
    tempQuat.Set(q.x, q.y, q.z, q.w);

    playerChar.SetRotation(tempQuat);

    playerObj.userData.debugMesh?.quaternion.copy(q);
  }

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

  let charPos = playerChar.GetPosition(),
    charRot = playerChar.GetRotation();
  const playerWasReset = charPos.GetY() < DEATH_HEIGHT;

  if (playerWasReset) {
    playerChar.SetPosition(respawnPos);
    playerChar.SetLinearVelocity(zeroVel);

    charPos = playerChar.GetPosition();
    charRot = playerChar.GetRotation();
  }

  updatePrevPos(playerObj.parent.userData, charPos, charRot, playerWasReset);

  if (playerWasReset) {
    joltToVec3(charPos, playerObj.parent.userData.prevPos);
    joltToQuat(charRot, playerObj.parent.userData.prevQuat);
    playerObj.parent.position.set(
      charPos.GetX(),
      charPos.GetY(),
      charPos.GetZ(),
    );
  }

  resetPlayerVelRot();
}

function lerpPhysics(alpha: number) {
  const updateMeshTransform = (obj: THREE.Mesh) => {
    if (!obj.parent?.userData.currPos) return;
    const uData = obj.parent.userData;

    obj.parent.position.lerpVectors(uData.prevPos, uData.currPos, alpha);
    obj.parent.quaternion.copy(uData.prevQuat).slerp(uData.currQuat, alpha);

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
