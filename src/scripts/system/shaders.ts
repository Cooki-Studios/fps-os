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
} from "three";

let composer: EffectComposer;

export function initShaders(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
) {
  composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 4,
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({ intensity: 0.5 });

  const chromatic = new ChromaticAberrationEffect({
    offset: new Vector2(0.00025, 0.00025),
    radialModulation: true,
    modulationOffset: 0.15,
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
