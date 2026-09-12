import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { font } from "../util/fonts";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { bootLog } from "../boot";
import * as THREE from "three";
import {
  enablePlayerControl,
  getPlayerPosition,
  PLAYER_WORLD_CONTROL,
} from "./player";
import { lerp } from "three/src/math/MathUtils.js";
import { rotatePhysicsObject } from "../system/physics";

export const keypadButtons: THREE.Mesh[] = [];

const buttonGroup = new THREE.Group();
buttonGroup.rotation.x = Math.PI / 2;
buttonGroup.position.y -= 1;
buttonGroup.position.z -= 3.5;

let buttonPressed: THREE.Object3D | null = null,
  codeInput = "",
  door: THREE.Mesh,
  doorWorldPos = new THREE.Vector3(),
  doorOpen = false,
  anchorPoint: number,
  keypad: THREE.Mesh;

export function setDoor(
  mesh: THREE.Mesh | THREE.Object3D,
  part?: "base" | "keypad",
  scene?: THREE.Scene,
) {
  if (part == "base" && scene) {
    mesh.getWorldPosition(doorWorldPos);
    doorWorldPos.add(DOOR_PIVOT);
    door = mesh as THREE.Mesh;

    anchorPoint = addDebugPoint(scene);
    debugPoints[anchorPoint].position.copy(doorWorldPos);
  } else if (part == "keypad") {
    keypad = mesh as THREE.Mesh;
    if (mesh.parent) doorGroup.add(mesh.parent);
  } else if (mesh.parent) {
    doorGroup.add(mesh.parent);
  }
}

const DOOR_PIVOT = new THREE.Vector3(-1.1, 0, 0),
  doorGroup = new THREE.Group();
doorGroup.rotateX(-Math.PI / 2);

document.addEventListener(
  "physicsLerped",
  () => (doorGroup.rotation.z = door.parent!.rotation.z),
);

let canUpdateKeypad = true;
export function updateKeypad(delta: number, canvas: HTMLCanvasElement) {
  if (keypadButtons.length == 0) return;

  for (const button of buttonGroup.children) {
    if (buttonPressed != button)
      button.position.z = lerp(button.position.z, -0.92, delta * 15);
    else {
      button.position.z = lerp(button.position.z, -0.965, delta * 20);
    }
  }

  if (doorOpen && door.userData.body) {
    const exp = 1 + door.parent!.rotation.z / 1.75;

    if (canUpdateKeypad) {
      if (door.parent!.rotation.z < 2.5) {
        rotatePhysicsObject(door.userData.body, doorWorldPos, delta * exp * 2);
      }
      if (door.parent!.rotation.z > 1.5) {
        PLAYER_WORLD_CONTROL.y = -1;

        if (getPlayerPosition().z < -5) {
          canUpdateKeypad = false;
          PLAYER_WORLD_CONTROL.y = 0;
          canvas.style.cursor = "pointer";
          enablePlayerControl(canvas);
        }
      }
    } else {
      if (door.parent!.rotation.z > 0) {
        rotatePhysicsObject(door.userData.body, doorWorldPos, -delta * exp * 2);
      } else if (doorGroup.parent) {
        doorGroup.parent.remove(doorGroup);
      }
    }
  }
}

const debugPoints: THREE.Mesh[] = [];
function addDebugPoint(scene: THREE.Scene): number {
  const geometry = new THREE.SphereGeometry(0.05, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    depthTest: false,
  });
  const point = new THREE.Mesh(geometry, material);
  point.renderOrder = 999;
  point.visible = false;

  document.addEventListener(
    "toggleDebug",
    () => (point.visible = !point.visible),
  );

  scene.add(point);
  return debugPoints.push(point) - 1;
}

export function createKeypad(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
) {
  if (!keypad || !keypad.parent) return;
  bootLog("Creating keypad...");

  doorGroup.position.copy(DOOR_PIVOT);
  doorGroup.position.z = -1.1;
  debugPoints[addDebugPoint(scene)].position.copy(doorGroup.position);
  scene.add(doorGroup);

  const symbols = "123456789*0C";

  for (let i = 0; i < symbols.length; i++) {
    const geometry = new TextGeometry(symbols[i], {
      font: font,
      size: 1,
      depth: 1,
      curveSegments: ["0", "6", "9", "C"].includes(symbols[i]) ? 2 : 1,
    });

    const num = new THREE.Mesh(geometry);
    const button = keypadButtons[i];
    const material = button.material;

    const box = new THREE.Box3().setFromObject(num);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const brush1 = new Brush(button.geometry);
    brush1.matrix.copy(button.parent!.matrix);
    brush1.matrix.decompose(brush1.position, brush1.quaternion, brush1.scale);
    brush1.updateMatrixWorld(true);

    const brush2 = new Brush(num.geometry);
    brush2.matrix.copy(button.parent!.matrix);
    brush2.matrix.decompose(brush2.position, brush2.quaternion, brush2.scale);

    brush2.position.x -= center.x * 0.065;
    brush2.position.y -= center.y * 0.075;
    brush2.position.z += 0.04;

    brush2.updateMatrixWorld(true);

    brush1.material = material;
    brush2.material = new THREE.MeshStandardMaterial({ color: 0x202020 });

    const evaluator = new Evaluator();
    const result = evaluator.evaluate(brush1, brush2, SUBTRACTION);
    result.name = symbols[i];

    button.removeFromParent();
    buttonGroup.add(result);

    delete keypadButtons[i];
  }

  keypad.parent.add(buttonGroup);

  let raycaster: THREE.Raycaster | undefined = new THREE.Raycaster();

  function getMousePos(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return new THREE.Vector2(
      (x / rect.width) * 2 - 1,
      -(y / rect.height) * 2 + 1,
    );
  }

  canvas.onpointermove = (e) => {
    if (!raycaster) return;

    const mouse = getMousePos(e);
    raycaster.far = 2;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(buttonGroup);
    if (intersects.length == 0) {
      canvas.style.cursor = "default";
      return;
    }

    const button = intersects[0].object;

    if (symbols.includes(button.name)) canvas.style.cursor = "pointer";
    else canvas.style.cursor = "default";
  };

  canvas.onpointerdown = (e) => {
    if (!raycaster) return;

    const mouse = getMousePos(e);
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(buttonGroup);
    if (intersects.length == 0) return;

    const button = intersects[0].object;
    if (button.position.z <= -0.955) return;

    buttonPressed = button;

    if (buttonPressed.name == "C") codeInput = "";
    else codeInput += buttonPressed.name;
  };

  canvas.onpointerup = () => {
    buttonPressed = null;

    if (codeInput == "0000") {
      raycaster = undefined;
      canvas.style.cursor = "default";

      setTimeout(() => (doorOpen = true), 150);
    }
  };
}
