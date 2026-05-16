import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- IMPORTS PARA EL EFECTO BLOOM Y POST-PROCESADO ---
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
const METAL_REGEX = /\b(anillo|ring|aro|band|metal|gold|silver|oro|plata|platino|platinum|base|shank|montura|setting|prong|garra)\b/i;

function isDiamondByMaterial(mat) {
  if (!mat) return false;
  if (mat.metalness && mat.metalness > 0.5) return false; 
  const transmission = mat.transmission ?? 0;
  if (transmission > 0.5) return true;
  return false;
}

// Calculadora del Suelo Efectivo (Ignora salientes inferiores)
function computeEffectiveFloorY(root) {
  root.updateMatrixWorld(true);
  const ys = [];
  const v = new THREE.Vector3();
  root.traverse(obj => {
    if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes?.position) return;
    const pos = obj.geometry.attributes.position;
    const m = obj.matrixWorld;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      ys.push(v.y);
    }
  });
  if (ys.length === 0) return 0;
  ys.sort((a, b) => a - b);

  const totalRange = ys[ys.length - 1] - ys[0];
  const sampleSize = Math.min(ys.length, Math.max(100, Math.floor(ys.length * 0.05)));
  let maxGap = 0;
  let gapIdx = -1;
  for (let i = 1; i < sampleSize; i++) {
    const gap = ys[i] - ys[i - 1];
    if (gap > maxGap) { maxGap = gap; gapIdx = i; }
  }
  if (gapIdx > 0 && maxGap > totalRange * 0.03) return ys[gapIdx];
  return ys[0];
}

function makeContactShadowTexture(size = 256) {
  const cnv = document.createElement('canvas');
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.95);
  g.addColorStop(0.00, 'rgba(0,0,0,0.30)');
  g.addColorStop(0.25, 'rgba(0,0,0,0.18)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.06)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
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

const buildFrag = () => `
precision highp float;
precision highp isampler2D;
precision highp usampler2D;

${shaderStructs}
${shaderIntersectFunction}

#define PI 3.14159265359

// OPTIMIZACIÓN DE RENDIMIENTO: 6 Rebotes (Calidad extrema sin matar la GPU)
#define MAX_BOUNCES 6 

uniform BVH bvh;
uniform sampler2D envMap;
uniform float iorR, iorG, iorB;
uniform mat4 uInvModelMatrix;
uniform mat4 uModelMatrix;
uniform vec3 uCameraPos;
uniform float uExposure;
uniform float uEpsilon;
uniform vec3 uColor; 

in vec3 vWorldPos;
in vec3 vWorldNormal;
out vec4 fragColor;

vec3 sampleEnv(vec3 dir) {
  dir = normalize(dir);
  vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
  return texture(envMap, uv).rgb;
}

float fresnelSchlick(float cosTheta, float n1, float n2) {
  float r0 = (n1 - n2) / (n1 + n2);
  r0 *= r0;
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

  float r = traceChannel(lro, lrR, iorR, 0);
  float g = traceChannel(lro, lrG, iorG, 1);
  float b = traceChannel(lro, lrB, iorB, 2);

  vec3 col = mix(vec3(r, g, b) * uColor, reflectSample, Fext) * uExposure;
  fragColor = vec4(col, 1.0);
}
`;

const hdrCache = new Map();
async function loadHDR(url, renderer) {
  // OPTIMIZACIÓN DE MEMORIA: Solo se cachean los datos crudos del HDR.
  // Evita colisiones de texturas entre diferentes anillos cargados.
  let rawHDR;
  if (hdrCache.has(url)) {
    rawHDR = hdrCache.get(url);
  } else {
    rawHDR = await new Promise((res, rej) => new RGBELoader().load(url, res, undefined, rej));
    rawHDR.mapping = THREE.EquirectangularReflectionMapping;
    hdrCache.set(url, rawHDR);
  }
  
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(rawHDR).texture;
  pmrem.dispose();
  
  return { rawHDR, pmremEnv: env };
}

class DiamondViewer extends HTMLElement {
  static get observedAttributes() { return ['src', 'camera-orbit', 'floor-offset']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; position: relative; overflow: hidden; background-color: #ffffff; }
        canvas { display: block; width: 100%; height: 100%; outline: none; background-color: transparent; }
      </style>
      <canvas></canvas>
    `;
    this.canvas = this.shadowRoot.querySelector('canvas');
  }

  connectedCallback() {
    if (this._initStarted) return;
    
    // OPTIMIZACIÓN CRÍTICA: CARGA DIFERIDA (LAZY LOAD)
    // El visor no hace absolutamente NADA (cero consumo de RAM o GPU)
    // hasta que el usuario hace scroll o swipe cerca de este anillo.
    this._lazyObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this._lazyObs.disconnect();
        this._initStarted = true;
        this._init().catch(err => console.error('Error 3D:', err));
      }
    }, { rootMargin: '300px' }); // Despierta 300px antes de aparecer
    this._lazyObs.observe(this);
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._ready) return;
    if (name === 'camera-orbit') this._applyOrbit(newV);
  }

  async _init() {
    // Rendimiento: Priorizar performance y quitar Alpha para un canvas sólido
    const renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: true, 
        alpha: false,
        powerPreference: "high-performance"
    });
    
    // Rendimiento: Limitar la densidad de píxeles máxima a 1.5
    // Salva a los iPhones y pantallas de alta densidad de cálculos innecesarios.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0xffffff, 1);

    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; 
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = null; 
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000); 

    const renderScene = new RenderPass(this.scene, this.camera);
    renderScene.clearColor = new THREE.Color(0x000000);
    renderScene.clearAlpha = 0;

    // Configuración exacta del laboratorio
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.10, 1.00, 0.28);

    const mixMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse:  { value: null },
        uExposure: { value: 0.50 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uExposure;
        varying vec2 vUv;

        vec3 ACESFilm(vec3 x) {
          const float a = 2.51;
          const float b = 0.03;
          const float c = 2.43;
          const float d = 0.59;
          const float e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }

        vec3 linearToSRGB(vec3 c) {
          return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
        }

        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          vec3 cSRGB = linearToSRGB(ACESFilm(c.rgb * uExposure));
          vec3 result = clamp(vec3(1.0) * (1.0 - c.a) + cSRGB, 0.0, 1.0);
          gl_FragColor = vec4(result, 1.0);
        }
      `,
    });
    this.mixPass = new ShaderPass(mixMaterial, 'tDiffuse');

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.mixPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true; 
    this.controls.autoRotateSpeed = 0.3; 
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 10;
    this.controls.enableZoom = false; 
    this.controls.target.set(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 5.0));
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 10.0);
    dirLight.position.set(0.4, 1.1, 0.1);
    this.scene.add(dirLight);

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      map: makeContactShadowTexture(256),
      transparent: true,
      depthWrite: false, 
      toneMapped: false, 
    });
    this.shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadowPlane);

    this._resizeObs = new ResizeObserver(() => this._resize());
    this._resizeObs.observe(this);

    try {
      const { rawHDR, pmremEnv } = await loadHDR('studio_v2.hdr', renderer);
      this.scene.environment = pmremEnv;
      this.envRaw = rawHDR;
    } catch(e) {
      const dataTex = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat);
      dataTex.needsUpdate = true;
      this.envRaw = dataTex;
    }

    const src = this.getAttribute('src');
    let gltf;
    try {
        gltf = await new Promise((res, rej) => new GLTFLoader().load(src, res, undefined, rej));
    } catch(e) { return; }
    
    const root = gltf.scene;

    const initialBox = new THREE.Box3().setFromObject(root);
    const initialSize = initialBox.getSize(new THREE.Vector3()).length();
    
    const scaleFactor = 2.0 / (initialSize || 1);
    root.scale.setScalar(scaleFactor);

    const scaledBox = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    const effectiveFloorY = computeEffectiveFloorY(root);
    root.position.set(-center.x, -effectiveFloorY, -center.z);

    this.scene.add(root);

    const finalBox = new THREE.Box3().setFromObject(root);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    this._modelCenterY = Math.max(0, finalBox.max.y) / 2;
    this.modelRadius = finalSize.length() / 2;

    const planeSize = Math.max(finalSize.x, finalSize.z) * 2.2;
    this.shadowPlane.scale.set(planeSize, planeSize, 1);
    
    const floorOffset = parseFloat(this.getAttribute('floor-offset') || '0');
    this.shadowPlane.position.set(0, floorOffset - 0.001, 0);

    this.diamondMeshes = [];

    root.traverse(obj => {
      if (!obj.isMesh) return;
      
      const combined = `${obj.name || ''} ${obj.material?.name || ''}`.toLowerCase();
      const isMetal = METAL_REGEX.test(combined);
      const isDiamond = !isMetal && (DIAMOND_REGEX.test(combined) || isDiamondByMaterial(obj.material));

      if (isDiamond) {
        try {
          let geo = obj.geometry;
          geo = geo.toNonIndexed(); 
          geo.computeVertexNormals();
          
          geo.computeBoundingBox();
          const localSize = geo.boundingBox.getSize(new THREE.Vector3()).length();
          const calculatedEpsilon = localSize * 0.0005; 

          const gemTint = (obj.material && obj.material.color)
            ? obj.material.color.clone()
            : new THREE.Color(0xffffff);

          const bvh = new MeshBVH(geo);
          geo.boundsTree = bvh;

          const baseIOR = 2.415;
          const disp = 0.009;

          const mat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
              bvh: { value: new MeshBVHUniformStruct() },
              envMap: { value: this.envRaw },
              iorR: { value: baseIOR - (disp / 2) },
              iorG: { value: baseIOR },
              iorB: { value: baseIOR + (disp / 2) },
              uInvModelMatrix: { value: new THREE.Matrix4() },
              uModelMatrix: { value: new THREE.Matrix4() },
              uCameraPos: { value: new THREE.Vector3() },
              uExposure: { value: 1.25 },
              uEpsilon: { value: calculatedEpsilon },
              uColor: { value: gemTint },
            },
            vertexShader: DIAMOND_VERT,
            fragmentShader: buildFrag(),
            side: THREE.DoubleSide,
          });
          mat.uniforms.bvh.value.updateFrom(bvh);
          obj.material = mat;
          obj.geometry = geo;
          obj.userData._gemSize = localSize;
          this.diamondMeshes.push(obj);
        } catch(e) { }
      } else {
          if (obj.material) {
              const newMetalMat = new THREE.MeshPhysicalMaterial({
                  color: 0xffffff,
                  metalness: 1.0,
                  roughness: 0.0,
                  envMap: this.envRaw,
                  envMapIntensity: 1.71, 
                  clearcoat: 0.7,
                  clearcoatRoughness: 1.0
              });
              obj.material = newMetalMat;
              obj.material.needsUpdate = true;
          }
      }
    });

    const gemColorAttr = this.getAttribute('gem-color');
    if (gemColorAttr && this.diamondMeshes.length > 0) {
      let largest = this.diamondMeshes[0];
      for (const m of this.diamondMeshes) {
        if ((m.userData._gemSize || 0) > (largest.userData._gemSize || 0)) largest = m;
      }
      const c = largest.material.uniforms.uColor.value;
      const distFromWhite = Math.abs(c.r - 1) + Math.abs(c.g - 1) + Math.abs(c.b - 1);
      if (distFromWhite < 0.15) {
        largest.material.uniforms.uColor.value.set(gemColorAttr);
      }
    }

    this._applyOrbit(this.getAttribute('camera-orbit') || '0deg 70deg auto');
    this._resize();
    this._ready = true;

    // OPTIMIZACIÓN 4: Pausado agresivo de gráficas fuera de pantalla.
    // Solo actualiza el 3D si la caja está altamente visible.
    this._visObs = new IntersectionObserver((entries) => {
      this._visible = entries[0].isIntersecting;
      if (this._visible && !this._rafActive) this._loop();
    }, { threshold: 0.05 });
    this._visObs.observe(this);
    this._visible = true;

    this._loop = () => {
      if (!this._ready || !this._visible) { 
          this._rafActive = false; 
          return; 
      }
      this._rafActive = true;
      requestAnimationFrame(this._loop);
      
      if (this.controls) this.controls.update();
      
      this.scene.updateMatrixWorld(true);
      for (const m of this.diamondMeshes) {
        const u = m.material.uniforms;
        u.uModelMatrix.value.copy(m.matrixWorld);
        u.uInvModelMatrix.value.copy(m.matrixWorld).invert();
        u.uCameraPos.value.copy(this.camera.position);
      }
      
      this.composer.render();
    };
    this._loop();
  }

  _applyOrbit(value) {
    if (!value || !this.camera) return;
    const parts = value.trim().split(/\s+/);
    const theta = parseFloat(parts[0] || 0) * Math.PI / 180;
    const phi = parseFloat(parts[1] || 70) * Math.PI / 180;

    const fovRad = this.camera.fov * Math.PI / 180;
    const dist = (this.modelRadius || 1.0) / Math.sin(fovRad / 2) * 0.85; 

    const ty = this._modelCenterY || 0;
    const camPos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist, phi, theta));
    camPos.y += ty;
    this.camera.position.copy(camPos);
    this.camera.lookAt(0, ty, 0); 
    
    if(this.controls) {
        this.controls.target.set(0, ty, 0);
        this.controls.update();
    }
  }

  _resize() {
    if (!this.renderer) return;
    const w = this.clientWidth || 1;
    const h = this.clientHeight || 1;
    if (w === 0 || h === 0) return; 
    
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    
    if (this.composer) this.composer.setSize(w, h);
  }
}

customElements.define('diamond-viewer', DiamondViewer);