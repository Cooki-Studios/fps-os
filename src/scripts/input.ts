const actions: { [action: string]: string } = {
  forward: "w",
  back: "s",
  left: "a",
  right: "d",
  jump: " ",
  debug: "`",
  fullscreen: "f",
};

const keys: { [key: string]: boolean } = {};
const pressEvents: { [key: string]: CustomEvent } = {};
const releaseEvents: { [key: string]: CustomEvent } = {};
export let enabled = false;

export function enableInput() {
  enabled = true;
}
export function disableInput() {
  enabled = false;
}
export function isInputEnabled() {
  return enabled;
}

export function initInput() {
  for (const [action, key] of Object.entries(actions)) {
    pressEvents[key] = new CustomEvent(`${action}:pressed`);
    releaseEvents[key] = new CustomEvent(`${action}:released`);
  }

  document.onkeydown = (e) => {
    if (e.key == actions["fullscreen"]) {
      if (!document.fullscreenElement) {
        document.body.requestFullscreen();
      } else document.exitFullscreen();
    }

    if (!enabled) return;

    const key = e.key.toLowerCase();
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

export function onActionPressed(action: string, callback: (e: Event) => void) {
  document.addEventListener(`${action}:pressed`, callback);
  return () => document.removeEventListener(`${action}:pressed`, callback);
}

export function onActionReleased(action: string, callback: (e: Event) => void) {
  document.addEventListener(`${action}:released`, callback);
  return () => document.removeEventListener(`${action}:released`, callback);
}
