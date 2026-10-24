import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import {
  type WebGLRenderer,
  type Scene,
  type Camera,
  HalfFloatType,
  Vector2,
  NoToneMapping,
} from "three";

let composer: EffectComposer,
  shadersLoaded: Scene[] = [];

export function initShaders(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
) {
  if (shadersLoaded.includes(scene)) return;
  shadersLoaded.push(scene);

  renderer.toneMapping = NoToneMapping;

  composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 4,
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({ intensity: 0.5 });

  const chromatic = new ChromaticAberrationEffect({
    offset: new Vector2(0.0005, 0.0005),
    radialModulation: true,
    modulationOffset: 0.5,
  });

  const vignette = new VignetteEffect({ darkness: 0.25 });

  const toneMap = new ToneMappingEffect({
    mode: ToneMappingMode.ACES_FILMIC,
  });

  composer.addPass(new EffectPass(camera, bloom, chromatic, vignette, toneMap));
}

export function renderWithShaders() {
  composer.render();
}

export function resizeShaders(width: number, height: number) {
  if (composer) composer.setSize(width, height);
}
