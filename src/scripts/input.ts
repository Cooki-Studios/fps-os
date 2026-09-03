import { bootLog } from "./boot";
import { isMobile } from "./player";

const actions = {
  // General
  fullscreen: "f",

  // Player
  forward: "w",
  back: "s",
  left: "a",
  right: "d",
  jump: " ",
  crouch: "c",

  speedo: "r",

  // Debug
  debug: "`",
  debugPlayer: "~",
} as const;
export type Action = keyof typeof actions;

const keys: Record<string, boolean> = {},
  pressEvents: Record<string, CustomEvent> = {},
  releaseEvents: Record<string, CustomEvent> = {};
export let enabled = false;

export function enableInput() {
  enabled = true;
}
export function disableInput() {
  enabled = false;
  resetKeys();
}
export function isInputEnabled() {
  return enabled;
}

function resetKeys() {
  for (const key of Object.keys(keys)) {
    keys[key] = false;
  }
}

export function initInput() {
  for (const [action, key] of Object.entries(actions)) {
    pressEvents[key] = new CustomEvent(`${action}:pressed`);
    releaseEvents[key] = new CustomEvent(`${action}:released`);
    bootLog(`Added input action: ${action} with key ${key}`);
  }

  window.addEventListener("blur", () => {
    resetKeys();
  });

  document.onkeydown = (e) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const key = e.key.toLowerCase();

    if (key === actions.fullscreen) {
      if (!document.fullscreenElement)
        document.body.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }

    if (!enabled) return;
    e.preventDefault();

    if (!keys[key]) {
      const event = pressEvents[key];
      if (event) document.dispatchEvent(event);
    }
    keys[key] = true;
  };

  document.onkeyup = (e) => {
    if (!enabled) return;
    e.preventDefault();

    const key = e.key.toLowerCase();
    keys[key] = false;
    const event = releaseEvents[key];
    if (event) document.dispatchEvent(event);
  };

  bootLog("Input initialised");
}

export function isActionPressed(action: Action): boolean {
  return Boolean(keys[actions[action]]);
}

export function getInputVector(
  negativeX: Action,
  positiveX: Action,
  negativeY: Action,
  positiveY: Action,
): { x: number; y: number } {
  const x =
    (isActionPressed(positiveX) ? 1 : 0) - (isActionPressed(negativeX) ? 1 : 0);
  const y =
    (isActionPressed(positiveY) ? 1 : 0) - (isActionPressed(negativeY) ? 1 : 0);
  return { x, y };
}

export function getInputAxis(
  negativeAction: Action,
  positiveAction: Action,
): number {
  return (
    Number(isActionPressed(positiveAction)) -
    Number(isActionPressed(negativeAction))
  );
}

export function onActionPressed(action: Action, callback: (e: Event) => void) {
  document.addEventListener(`${action}:pressed`, callback);
  return () => document.removeEventListener(`${action}:pressed`, callback);
}

export function onActionReleased(action: Action, callback: (e: Event) => void) {
  document.addEventListener(`${action}:released`, callback);
  return () => document.removeEventListener(`${action}:released`, callback);
}

const joystickCont = document.getElementById("joystick-cont") as HTMLDivElement,
  joystickPos = document.getElementById("joystick-pos") as HTMLDivElement,
  joystick = document.getElementById("joystick") as HTMLDivElement,
  joystick2 = document.getElementById("joystick2") as HTMLDivElement,
  joystick3 = document.getElementById("joystick3") as HTMLDivElement,
  MAX_RADIUS = 200;

let isDragging = false,
  startX = 0,
  startY = 0,
  joystickX = 0,
  joystickY = 0;

if (isMobile()) {
  joystickCont.style.display = "grid";

  joystickCont.onpointerdown = (e) => {
    isDragging = true;
    joystickCont.setPointerCapture(e.pointerId);

    startX = e.clientX;
    startY = e.clientY;
    joystickX = 0;
    joystickY = 0;

    joystickPos.style.left = `${e.offsetX}px`;
    joystickPos.style.top = `${e.offsetY}px`;

    joystick.style.visibility = "visible";
    joystick2.style.visibility = "visible";
    joystick3.style.visibility = "visible";
  };

  joystickCont.onpointermove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX,
      dy = e.clientY - startY,
      distance = Math.hypot(dx, dy);

    const clampDist = Math.min(distance, MAX_RADIUS),
      angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampDist,
      clampedY = Math.sin(angle) * clampDist;

    joystickX = clampedX / MAX_RADIUS;
    joystickY = clampedY / MAX_RADIUS;

    joystick.style.transform = `translate(${clampedX}px, ${clampedY}px) translate(-50%, -50%)`;
    joystick2.style.transform = `translate(${clampedX / 2.5}px, ${clampedY / 2.5}px) translate(-50%, -50%)`;
  };

  const handlePointerEnd = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    joystickCont.releasePointerCapture(e.pointerId);

    joystick.style.visibility = "hidden";
    joystick2.style.visibility = "hidden";
    joystick3.style.visibility = "hidden";

    startX = 0;
    startY = 0;
    joystickX = 0;
    joystickY = 0;
  };
  joystickCont.onpointerup = handlePointerEnd;
  joystickCont.onpointercancel = handlePointerEnd;
}

export function getJoystickVector(): { x: number; y: number } {
  return { x: joystickX, y: joystickY };
}

export function getJoystickX(): number {
  return joystickX;
}
export function getJoystickY(): number {
  return joystickY;
}
