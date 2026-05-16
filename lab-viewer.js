// =============================================================================
// LAB-VIEWER — visor de joyería con TODOS los parámetros de luz y material
// expuestos. La web de producción (diamond-viewer.js) NO se toca: cuando los
// valores del lab estén afinados, se copian con "Copiar Config" y se aplican
// al visor de producción.
// =============================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  MeshBVH,
  MeshBVHUniformStruct,
  shaderStructs,
  shaderIntersectFunction,
} from 'three-mesh-bvh';

const DIAMOND_REGEX = /\b(piedra|piedras|diam|diamond|gem|gema|stone|cristal|crystal|brillante|jewel|001)\b/i;
const METAL_REGEX   = /\b(anillo|ring|aro|band|metal|gold|silver|oro|plata|platino|platinum|base|shank|montura|setting|prong|garra)\b/i;

function isDiamondByMaterial(mat) {
  if (!mat) return false;
  if (mat.metalness && mat.metalness > 0.5) return false;
  if ((mat.transmission ?? 0) > 0.5) return true;
  return false;
}

// Detección de suelo efectivo (descarta outliers de geometría).
function computeEffectiveFloorY(root) {
  root.updateMatrixWorld(true);
  const ys = [];
  const v = new THREE.Vector3();
  root.traverse(obj => {
    if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
    const pos = obj.geometry.attributes.position;
    const m = obj.matrixWorld;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      ys.push(v.y);
    }
  });
  if (!ys.length) return 0;
  ys.sort((a, b) => a - b);
  const totalRange = ys[ys.length - 1] - ys[0];
  const sampleSize = Math.min(ys.length, Math.max(100, Math.floor(ys.length * 0.05)));
  let maxGap = 0, gapIdx = -1;
  for (let i = 1; i < sampleSize; i++) {
    const gap = ys[i] - ys[i - 1];
    if (gap > maxGap) { maxGap = gap; gapIdx = i; }
  }
  if (gapIdx > 0 && maxGap > totalRange * 0.03) return ys[gapIdx];
  return ys[0];
}

function makeContactShadowTexture(size = 256) {
  const cnv = document.createElement('canvas');
  cnv.width = size; cnv.height = size;
  const ctx = cnv.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.95);
  g.addColorStop(0.00, 'rgba(0,0,0,0.30)');
  g.addColorStop(0.25, 'rgba(0,0,0,0.18)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.06)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.00)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const DIAMOND_VERT = `
out vec3 vWorldPos;
out vec3 vWorldNormal;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const buildDiamondFrag = () => `
precision highp float;
precision highp isampler2D;
precision highp usampler2D;
${shaderStructs}
${shaderIntersectFunction}
#define PI 3.14159265359
#define MAX_BOUNCES 5
uniform BVH bvh;
uniform sampler2D envMap;
uniform float iorR, iorG, iorB;
uniform mat4 uInvModelMatrix;
uniform mat4 uModelMatrix;
uniform vec3 uCameraPos;
uniform float uExposure;
uniform float uEpsilon;
in vec3 vWorldPos;
in vec3 vWorldNormal;
out vec4 fragColor;
vec3 sampleEnv(vec3 dir) {
  dir = normalize(dir);
  vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
  return texture(envMap, uv).rgb;
}
float fresnelSchlick(float cosTheta, float n1, float n2) {
  float r0 = (n1 - n2) / (n1 + n2); r0 *= r0;
  return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}
float traceChannel(vec3 lro, vec3 lrd, float ior, int ch) {
  vec3 pos = lro + lrd * uEpsilon;
  vec3 dir = lrd;
  vec3 exitColor = vec3(0.0);
  for (int b = 0; b < MAX_BOUNCES; b++) {
    uvec4 fi; vec3 fn; vec3 bc; float side; float dist;
    bool h = bvhIntersectFirstHit(bvh, pos, dir, fi, fn, bc, side, dist);
    if (!h) { exitColor = vec3(0.0); break; }
    vec3 q = pos + dir * dist;
    vec3 nb = normalize(fn);
    if (dot(nb, dir) > 0.0) nb = -nb;
    vec3 refrOut = refract(dir, nb, ior);
    if (length(refrOut) < 1e-4) {
      dir = reflect(dir, nb);
      pos = q + dir * uEpsilon;
      continue;
    }
    vec3 wOut = normalize((uModelMatrix * vec4(refrOut, 0.0)).xyz);
    exitColor = sampleEnv(wOut);
    break;
  }
  return ch == 0 ? exitColor.r : (ch == 1 ? exitColor.g : exitColor.b);
}
void main() {
  vec3 rd = normalize(vWorldPos - uCameraPos);
  vec3 n = normalize(vWorldNormal);
  if (dot(n, rd) > 0.0) n = -n;
  float cosI = max(-dot(rd, n), 0.0);
  float iorAvg = (iorR + iorG + iorB) / 3.0;
  float Fext = fresnelSchlick(cosI, 1.0, iorAvg);
  vec3 reflectSample = sampleEnv(reflect(rd, n));
  vec3 refrR = refract(rd, n, 1.0 / iorR);
  vec3 refrG = refract(rd, n, 1.0 / iorG);
  vec3 refrB = refract(rd, n, 1.0 / iorB);
  vec3 lro = (uInvModelMatrix * vec4(vWorldPos, 1.0)).xyz;
  vec3 lrR = normalize((uInvModelMatrix * vec4(refrR, 0.0)).xyz);
  vec3 lrG = normalize((uInvModelMatrix * vec4(refrG, 0.0)).xyz);
  vec3 lrB = normalize((uInvModelMatrix * vec4(refrB, 0.0)).xyz);
  float r = traceChannel(lro, lrR, iorR / 1.0, 0);
  float g = traceChannel(lro, lrG, iorG / 1.0, 1);
  float b = traceChannel(lro, lrB, iorB / 1.0, 2);
  vec3 col = mix(vec3(r, g, b), reflectSample, Fext) * uExposure;
  fragColor = vec4(col, 1.0);
}
`;

const hdrCache = new Map();
async function loadHDR(url, renderer) {
  if (hdrCache.has(url)) return hdrCache.get(url);
  const hdr = await new Promise((res, rej) => new RGBELoader().load(url, res, undefined, rej));
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();
  const entry = { rawHDR: hdr, pmremEnv: env };
  hdrCache.set(url, entry);
  return entry;
}

// =============================================================================
// CONFIG DE PRODUCCIÓN — afinada por el usuario en el lab.
// Cambiar aquí, y tanto el lab como el visor de producción la usan.
// =============================================================================
export const PRODUCTION_CONFIG = Object.freeze({
  // Iluminación
  ambientIntensity: 5.0,
  dirIntensity: 10.0,
  dirX: 0.4, dirY: 1.1, dirZ: 0.1,
  envIntensity: 0.9,
  // Metal
  metalColor: 0xffffff,
  metalness: 1.0,
  roughness: 0.0,
  envMapIntensity: 1.9,
  clearcoat: 0.7,
  clearcoatRoughness: 1.0,
  // Diamante
  diamondExposure: 1.25,
  iorBase: 2.415,
  dispersion: 0.009,
  // Post
  exposure: 0.50,
  bloomStrength: 0.10,
  bloomRadius: 1.00,
  bloomThreshold: 0.28,
  // Cámara
  autoRotate: true,
  autoRotateSpeed: 0.3,
});

// =============================================================================
// CLASE
// =============================================================================
export class LabViewer {
  constructor(canvas, customConfig = {}) {
    this.canvas = canvas;
    this.diamondMeshes = [];
    this.metalMaterials = [];
    this.cfg = { ...PRODUCTION_CONFIG, ...customConfig };
    this._running = true;

    this._readyPromise = this._init();
  }

  async _init() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);

    // RenderPass + BloomPass + mixPass (igual que producción).
    const renderScene = new RenderPass(this.scene, this.camera);
    renderScene.clearColor = new THREE.Color(0x000000);
    renderScene.clearAlpha = 0;

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.cfg.bloomStrength, this.cfg.bloomRadius, this.cfg.bloomThreshold
    );

    const mixMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse:  { value: null },
        uExposure: { value: this.cfg.exposure },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uExposure; varying vec2 vUv;
        vec3 ACES(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
          return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
        vec3 toSRGB(vec3 c){ return pow(max(c,vec3(0.0)),vec3(1.0/2.2)); }
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          vec3 srgb = toSRGB(ACES(c.rgb * uExposure));
          vec3 result = clamp(vec3(1.0)*(1.0-c.a) + srgb, 0.0, 1.0);
          gl_FragColor = vec4(result, 1.0);
        }
      `,
    });
    this.mixPass = new ShaderPass(mixMaterial, 'tDiffuse');

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.mixPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = this.cfg.autoRotate;
    this.controls.autoRotateSpeed = this.cfg.autoRotateSpeed;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0, 0);

    // Luces
    this.ambient = new THREE.AmbientLight(0xffffff, this.cfg.ambientIntensity);
    this.scene.add(this.ambient);
    this.dirLight = new THREE.DirectionalLight(0xffffff, this.cfg.dirIntensity);
    this.dirLight.position.set(this.cfg.dirX, this.cfg.dirY, this.cfg.dirZ);
    this.scene.add(this.dirLight);

    // Plano de sombra
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      map: makeContactShadowTexture(256),
      transparent: true, depthWrite: false, toneMapped: false,
    });
    this.shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadowPlane);

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.canvas);
    this._resize();

    // HDR
    try {
      const { rawHDR, pmremEnv } = await loadHDR('studio_v2.hdr', renderer);
      this.scene.environment = pmremEnv;
      this.envRaw = rawHDR;
    } catch (e) {
      const data = new Uint8Array([255, 255, 255, 255]);
      this.envRaw = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      this.envRaw.needsUpdate = true;
    }

    this._raf = () => {
      requestAnimationFrame(this._raf);
      this.controls.update();
      this.scene.updateMatrixWorld(true);
      for (const m of this.diamondMeshes) {
        const u = m.material.uniforms;
        u.uModelMatrix.value.copy(m.matrixWorld);
        u.uInvModelMatrix.value.copy(m.matrixWorld).invert();
        u.uCameraPos.value.copy(this.camera.position);
      }
      this.composer.render();
    };
    this._raf();
  }

  // -----------------------------------------------------------
  // Cargar modelo (cambia el GLB visible)
  // -----------------------------------------------------------
  async loadModel(src) {
    await this._readyPromise; // garantiza que el HDR y el pipeline ya están listos.
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      this.modelRoot.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    this.diamondMeshes = [];
    this.metalMaterials = [];

    let gltf;
    try { gltf = await new Promise((res, rej) => new GLTFLoader().load(src, res, undefined, rej)); }
    catch (e) { console.error('No cargó', src, e); return; }

    const root = gltf.scene;
    const initialBox = new THREE.Box3().setFromObject(root);
    const initialSize = initialBox.getSize(new THREE.Vector3()).length();
    root.scale.setScalar(2.0 / (initialSize || 1));

    const scaledBox = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    const effectiveFloorY = computeEffectiveFloorY(root);
    root.position.set(-center.x, -effectiveFloorY, -center.z);

    this.scene.add(root);
    this.modelRoot = root;

    const finalBox = new THREE.Box3().setFromObject(root);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    this._modelCenterY = Math.max(0, finalBox.max.y) / 2;
    this.modelRadius = finalSize.length() / 2;

    const planeSize = Math.max(finalSize.x, finalSize.z) * 2.2;
    this.shadowPlane.scale.set(planeSize, planeSize, 1);
    this.shadowPlane.position.set(0, -0.001, 0);

    root.traverse(obj => {
      if (!obj.isMesh) return;
      const combined = `${obj.name || ''} ${obj.material?.name || ''}`.toLowerCase();
      const isMetal = METAL_REGEX.test(combined);
      const isDiamond = !isMetal && (DIAMOND_REGEX.test(combined) || isDiamondByMaterial(obj.material));

      if (isDiamond) {
        try {
          let geo = obj.geometry.toNonIndexed();
          geo.computeVertexNormals();
          geo.computeBoundingBox();
          const localSize = geo.boundingBox.getSize(new THREE.Vector3()).length();
          const calculatedEpsilon = localSize * 0.0005;
          const bvh = new MeshBVH(geo);
          geo.boundsTree = bvh;

          const ior = this.cfg.iorBase;
          const d = this.cfg.dispersion;
          const mat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
              bvh: { value: new MeshBVHUniformStruct() },
              envMap: { value: this.envRaw },
              iorR: { value: ior - d / 2 },
              iorG: { value: ior },
              iorB: { value: ior + d / 2 },
              uInvModelMatrix: { value: new THREE.Matrix4() },
              uModelMatrix: { value: new THREE.Matrix4() },
              uCameraPos: { value: new THREE.Vector3() },
              uExposure: { value: this.cfg.diamondExposure },
              uEpsilon: { value: calculatedEpsilon },
            },
            vertexShader: DIAMOND_VERT,
            fragmentShader: buildDiamondFrag(),
            side: THREE.DoubleSide,
          });
          mat.uniforms.bvh.value.updateFrom(bvh);
          obj.material = mat;
          obj.geometry = geo;
          this.diamondMeshes.push(obj);
        } catch (e) { console.warn('No se pudo procesar diamante:', e); }
      } else if (obj.material) {
        const m = new THREE.MeshPhysicalMaterial({
          color: this.cfg.metalColor,
          metalness: this.cfg.metalness,
          roughness: this.cfg.roughness,
          envMap: this.envRaw,
          envMapIntensity: this.cfg.envMapIntensity,
          clearcoat: this.cfg.clearcoat,
          clearcoatRoughness: this.cfg.clearcoatRoughness,
        });
        obj.material = m;
        this.metalMaterials.push(m);
      }
    });

    this._applyOrbit();
  }

  _applyOrbit() {
    if (!this.camera) return;
    const fovRad = this.camera.fov * Math.PI / 180;
    const dist = (this.modelRadius || 1.0) / Math.sin(fovRad / 2) * 0.85;
    const ty = this._modelCenterY || 0;
    const sph = new THREE.Spherical(dist, 70 * Math.PI / 180, 0);
    const camPos = new THREE.Vector3().setFromSpherical(sph);
    camPos.y += ty;
    this.camera.position.copy(camPos);
    this.camera.lookAt(0, ty, 0);
    this.controls.target.set(0, ty, 0);
    this.controls.update();
  }

  _resize() {
    if (!this.renderer) return;
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  }

  // -----------------------------------------------------------
  // Setters — el panel los llama en respuesta a sliders.
  // -----------------------------------------------------------
  set(name, value) {
    this.cfg[name] = value;
    switch (name) {
      case 'ambientIntensity':   this.ambient.intensity = value; break;
      case 'dirIntensity':       this.dirLight.intensity = value; break;
      case 'dirX':               this.dirLight.position.x = value; break;
      case 'dirY':               this.dirLight.position.y = value; break;
      case 'dirZ':               this.dirLight.position.z = value; break;
      case 'envIntensity':
        // envIntensity es un multiplicador global; el efectivo en metales es envMapIntensity * envIntensity.
        for (const m of this.metalMaterials) m.envMapIntensity = this.cfg.envMapIntensity * value;
        break;
      case 'metalColor':
        for (const m of this.metalMaterials) m.color.setHex(value);
        break;
      case 'metalness':          for (const m of this.metalMaterials) m.metalness = value; break;
      case 'roughness':          for (const m of this.metalMaterials) m.roughness = value; break;
      case 'envMapIntensity':    for (const m of this.metalMaterials) m.envMapIntensity = value * this.cfg.envIntensity; break;
      case 'clearcoat':          for (const m of this.metalMaterials) m.clearcoat = value; break;
      case 'clearcoatRoughness': for (const m of this.metalMaterials) m.clearcoatRoughness = value; break;
      case 'diamondExposure':    for (const m of this.diamondMeshes) m.material.uniforms.uExposure.value = value; break;
      case 'iorBase':
      case 'dispersion': {
        const ior = this.cfg.iorBase;
        const d = this.cfg.dispersion;
        for (const m of this.diamondMeshes) {
          m.material.uniforms.iorR.value = ior - d / 2;
          m.material.uniforms.iorG.value = ior;
          m.material.uniforms.iorB.value = ior + d / 2;
        }
        break;
      }
      case 'exposure':           this.mixPass.uniforms.uExposure.value = value; break;
      case 'bloomStrength':      this.bloomPass.strength = value; break;
      case 'bloomRadius':        this.bloomPass.radius = value; break;
      case 'bloomThreshold':     this.bloomPass.threshold = value; break;
      case 'autoRotate':         this.controls.autoRotate = !!value; break;
      case 'autoRotateSpeed':    this.controls.autoRotateSpeed = value; break;
    }
  }

  getConfig() {
    // Devuelve solo lo que importa, en un orden legible.
    const c = this.cfg;
    return {
      iluminacion: {
        ambient: round(c.ambientIntensity, 2),
        direccional: { intensidad: round(c.dirIntensity, 2), pos: [round(c.dirX, 2), round(c.dirY, 2), round(c.dirZ, 2)] },
        envIntensity: round(c.envIntensity, 2),
      },
      metal: {
        color: '#' + c.metalColor.toString(16).padStart(6, '0'),
        metalness: round(c.metalness, 3),
        roughness: round(c.roughness, 3),
        envMapIntensity: round(c.envMapIntensity, 2),
        clearcoat: round(c.clearcoat, 2),
        clearcoatRoughness: round(c.clearcoatRoughness, 3),
      },
      diamante: {
        exposure: round(c.diamondExposure, 2),
        iorBase: round(c.iorBase, 4),
        dispersion: round(c.dispersion, 3),
      },
      post: {
        exposicion: round(c.exposure, 2),
        bloom: { strength: round(c.bloomStrength, 3), radius: round(c.bloomRadius, 2), threshold: round(c.bloomThreshold, 2) },
      },
    };
  }
}

function round(v, n) { const k = 10 ** n; return Math.round(v * k) / k; }
