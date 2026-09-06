import { FontLoader } from "three/addons/loaders/FontLoader.js";

const loader = new FontLoader();
// https://gero3.github.io/facetype.js/
// FPSO1234567890*C
export const font = await loader.loadAsync("fonts/inter.json");
