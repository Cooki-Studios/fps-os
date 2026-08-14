const actions = {
  // General
  fullscreen: "f",

  // Player
  forward: "w",
  back: "s",
  left: "a",
  right: "d",
  jump: " ",
  sprint: "shift",
  sourceMovement: "r",

  // Debug
  debug: "`",
  debugPlayer: "~",
} as const;
export type Action = keyof typeof actions;

const keys: Record<string, boolean> = {};
const pressEvents: Record<string, CustomEvent> = {};
const releaseEvents: Record<string, CustomEvent> = {};
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

    if (!keys[key]) {
      const event = pressEvents[key];
      if (event) document.dispatchEvent(event);
    }
    keys[key] = true;
  };

  document.onkeyup = (e) => {
    if (!enabled) return;

    const key = e.key.toLowerCase();
    keys[key] = false;
    const event = releaseEvents[key];
    if (event) document.dispatchEvent(event);
  };
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

export function onActionPressed(action: Action, callback: (e: Event) => void) {
  document.addEventListener(`${action}:pressed`, callback);
  return () => document.removeEventListener(`${action}:pressed`, callback);
}

export function onActionReleased(action: Action, callback: (e: Event) => void) {
  document.addEventListener(`${action}:released`, callback);
  return () => document.removeEventListener(`${action}:released`, callback);
}
