import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { font } from "../util/fonts";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { bootLog } from "../boot";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import {
  enablePlayerControl,
  getPlayerPosition,
  PLAYER_WORLD_CONTROL,
  setCutscene,
} from "./player";
import { setPlayerCollision } from "../system/physics";

export const keypadButtons: THREE.Mesh[] = [];

const buttonGroup = new THREE.Group();
buttonGroup.rotation.x = Math.PI / 2;
buttonGroup.position.y -= 1;
buttonGroup.position.z -= 3.5;

const doorGroup = new THREE.Group();
doorGroup.rotation.x = Math.PI / 2;
doorGroup.position.x -= 1.1;
doorGroup.position.z -= 1.2;

let buttonPressed: THREE.Object3D | null = null,
  codeInput = "",
  doorStage = 0,
  anchorPoint: number,
  keypad: THREE.Mesh,
  mainDoorGroup: THREE.Object3D,
  doorRot = 0;

export function setKeypad(mesh: THREE.Mesh, scene: THREE.Scene) {
  keypad = mesh;

  mainDoorGroup = mesh.parent!.parent!;
  doorGroup.attach(mesh);
  scene.attach(doorGroup);

  anchorPoint = addDebugPoint(scene);
  debugPoints[anchorPoint].position.copy(doorGroup.position);
}

export function updateKeypad(delta: number, canvas: HTMLCanvasElement) {
  if (keypadButtons.length == 0) return;

  for (const button of buttonGroup.children) {
    if (buttonPressed != button)
      button.position.z = lerp(button.position.z, -0.92, delta * 15);
    else {
      button.position.z = lerp(button.position.z, -0.965, delta * 20);
    }
  }

  if (doorStage == 3) return;
  const exp = 2 + doorRot / 2;
  if (getPlayerPosition().z < -5) {
    PLAYER_WORLD_CONTROL.y = 0;
    setCutscene(false);
    setPlayerCollision(true);
    enablePlayerControl(canvas);
  }
  switch (doorStage) {
    case 1:
      if (doorRot < -1.5) {
        PLAYER_WORLD_CONTROL.y = -1;
      }
      if (doorRot > -2.5) {
        doorRot -= delta * exp;
        doorGroup.rotation.z = doorRot;
        mainDoorGroup.rotation.z = -doorRot;
      } else doorStage = 2;
      break;
    case 2:
      if (doorRot < 0) {
        doorRot += delta * exp;
        doorGroup.rotation.z = doorRot;
        mainDoorGroup.rotation.z = -doorRot;
      } else if (doorGroup.parent && mainDoorGroup.parent) {
        doorGroup.rotation.z = 0;
        mainDoorGroup.rotation.z = 0;

        doorGroup.parent.remove(doorGroup);
        for (const doorPart of mainDoorGroup.children)
          if (doorPart.name != "Base") mainDoorGroup.remove(doorPart);

        setPlayerCollision(true);
        doorStage = 3;
      }
      break;
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
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
) {
  if (!keypad || !keypad.parent) return;
  bootLog("Creating keypad...");

  const symbols = "123456789*0C";
  const evaluator = new Evaluator();

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

    const result = evaluator.evaluate(brush1, brush2, SUBTRACTION);
    result.name = symbols[i];

    button.removeFromParent();
    buttonGroup.add(result);

    button.geometry.dispose();
    num.geometry.dispose();
    delete keypadButtons[i];
  }

  keypad.add(buttonGroup);

  let raycaster: THREE.Raycaster | undefined = new THREE.Raycaster();

  const mousePos = new THREE.Vector2();
  function getMousePos(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePos.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);

    return mousePos;
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
      codeInput = "";
      raycaster = undefined;
      canvas.style.cursor = "default";

      setTimeout(() => (doorStage = 1), 150);
    }
  };
}
