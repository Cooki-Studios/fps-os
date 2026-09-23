// https://stackoverflow.com/a/37764963
export const pause = (ms = 0) => new Promise((f) => setTimeout(f, ms));
