import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- IMPORTS PARA EL EFECTO BLOOM (DESTELLOS) ---
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

// (Bloom selectivo por capas eliminado: con render transparente, las zonas vacías ya quedan
//  por debajo del umbral del bloom y no participan; un solo compositor es suficiente.)

const DIAMOND_REGEX = /\b(piedra|piedras|diam|diamond|gem|gema|stone|cristal|crystal|brillante|jewel|001)\b/i;
const METAL_REGEX = /\b(anillo|ring|aro|band|metal|gold|silver|oro|plata|platino|platinum|base|shank|montura|setting|prong|garra)\b/i;

// Detecta automáticamente el "suelo efectivo" del modelo: la Y por encima de la cual reside
// el cuerpo principal de la geometría, descartando vértices outliers (prongs sueltos, soportes
// internos, gas, etc., que cuelgan por debajo del aro visible). Heurística:
//   1) Recoge todas las Y en espacio mundial.
//   2) Ordena ascendentemente y mira el 5% inferior.
//   3) Si hay un salto grande (> 3% del rango total) entre dos Y consecutivas en ese tramo,
//      es la frontera entre outliers y cuerpo → devuelve la Y por encima del salto.
//   4) Si no, devuelve el mínimo absoluto (AABB ya era correcto).
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

// Genera una textura procedural de sombra de contacto: gradiente radial suave,
// que insinúa que la joya descansa sobre una superficie SIN dibujar la silueta del anillo.
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

function isDiamondByMaterial(mat) {
  if (!mat) return false;
  if (mat.metalness && mat.metalness > 0.5) return false; 
  const transmission = mat.transmission ?? 0;
  if (transmission > 0.5) return true;
  return false;
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

  vec3 col = mix(vec3(r, g, b), reflectSample, Fext) * uExposure;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
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

class DiamondViewer extends HTMLElement {
  static get observedAttributes() { return ['src', 'camera-orbit']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; position: relative; overflow: hidden; background-color: #ffffff; }
        canvas { display: block; width: 100%; height: 100%; outline: none; background-color: transparent; }
        
        /* Panel de controles oculto en producción. Para reactivarlo, cambiar display a flex. */
        .debug-panel {
          display: none;
          position: absolute; top: 10px; right: 10px; background: rgba(0, 0, 0, 0.85);
          color: white; padding: 15px; border-radius: 8px; font-family: monospace;
          font-size: 11px; z-index: 9999; flex-direction: column;
          gap: 12px; width: 260px; border: 1px solid #d4af37; pointer-events: auto;
        }
        .debug-panel h3 { margin: 0; color: #d4af37; text-align: center; font-size: 13px; }
        .control-group { display: flex; justify-content: space-between; align-items: center; }
        .control-group label { width: 40%; }
        .control-group input[type="range"] { width: 45%; cursor: pointer;}
        .control-group span { width: 15%; text-align: right; font-weight: bold; }
        .btn-log { background: #d4af37; color: #000; border: none; padding: 8px; cursor: pointer; font-weight: bold; border-radius: 4px; margin-top: 5px; }
        .btn-log:hover { background: #fff; }
      </style>
      <canvas></canvas>

      <div class="debug-panel" id="debug-panel">
        <h3>CONTROLES 3D</h3>
        <div class="control-group">
          <label>Exposición</label>
          <input type="range" id="ctrl-exp" min="0.1" max="3.0" step="0.05" value="0.70">
          <span id="val-exp">0.70</span>
        </div>
        <div class="control-group">
          <label>Brillo Metal</label>
          <input type="range" id="ctrl-metal" min="0.1" max="10.0" step="0.1" value="1.6">
          <span id="val-metal">1.6</span>
        </div>
        <div class="control-group">
          <label>Fuerza Bloom</label>
          <input type="range" id="ctrl-bst" min="0.0" max="3.0" step="0.05" value="0.00">
          <span id="val-bst">0.00</span>
        </div>
        <div class="control-group">
          <label>Radio Bloom</label>
          <input type="range" id="ctrl-brad" min="0.0" max="1.0" step="0.01" value="0.46">
          <span id="val-brad">0.46</span>
        </div>
        <div class="control-group">
          <label>Umbral Bloom</label>
          <input type="range" id="ctrl-bth" min="0.0" max="1.0" step="0.01" value="1.00">
          <span id="val-bth">1.00</span>
        </div>
        <div class="control-group">
          <label>Dispersión</label>
          <input type="range" id="ctrl-disp" min="0.0" max="0.05" step="0.001" value="0.050">
          <span id="val-disp">0.050</span>
        </div>
        <button class="btn-log" id="btn-log">🖨️ IMPRIMIR CONFIG</button>
      </div>
    `;
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.metalMaterials = []; 
  }

  connectedCallback() {
    if (this._inited) return;
    this._inited = true;
    this._init().catch(err => { console.error('❌ ERROR FATAL AL INICIAR 3D:', err); });
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._ready) return;
    if (name === 'camera-orbit') this._applyOrbit(newV);
  }

  async _init() {
    // Canvas opaco: el blanco se inyecta manualmente en el shader final, no depende del canal alfa.
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);

    // Sin shadow map: usamos una sombra de contacto procedural (más rápido y más limpio
    // visualmente para producto/joyería que una sombra literal del modelo).
    renderer.shadowMap.enabled = false;

    // Sin tone mapping en el renderer: lo hacemos manualmente en el mixPass para poder
    // componer sobre un blanco puro sin que ACES lo aplane a gris.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // El mixPass escribe ya en sRGB.
    this.renderer = renderer;

    // Exposición efectiva (la usaremos en el mixPass; el slider la conecta más abajo).
    this._exposure = 0.70;

    this.scene = new THREE.Scene();
    this.scene.background = null; // El fondo blanco lo pinta el mixPass.
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);

    // Render único de escena con fondo transparente (clear alpha = 0). Las zonas vacías quedan
    // con rgb=0,a=0; el bloom las ignora (están por debajo del umbral) y el mixPass las detecta
    // por el alfa para pintar blanco puro detrás.
    const renderScene = new RenderPass(this.scene, this.camera);
    renderScene.clearColor = new THREE.Color(0x000000);
    renderScene.clearAlpha = 0;

    // Defaults: strength=0, radius=0.46, threshold=1.00 (config fija pedida — bloom efectivamente off).
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.00, 0.46, 1.00);

    // ---------- MIX PASS: tone mapping + composición sobre BLANCO PURO ----------
    // Lee una sola textura (la salida del bloom). En píxeles con alpha=0 (fondo), pinta blanco
    // + la contribución de bloom clamp(0..1) → el fondo nunca se oscurece.
    const mixMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse:  { value: null },
        uExposure: { value: this._exposure },
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

          // Composición sobre blanco:
          //   result = white * (1 - alpha) + cSRGB
          // - alpha=1 (anillo opaco): result = cSRGB (anillo tone-mapeado + su bloom).
          // - alpha=0 (fondo vacío): result = white + cSRGB. Clampeado a 1 -> SIEMPRE blanco
          //   si cSRGB es 0, o blanco + halo de bloom clampeado.
          vec3 result = clamp(vec3(1.0) * (1.0 - c.a) + cSRGB, 0.0, 1.0);

          gl_FragColor = vec4(result, 1.0);
        }
      `,
    });
    this.mixPass = new ShaderPass(mixMaterial, 'tDiffuse');

    // Un solo compositor: render + bloom + mix. Mismo coste que el setup original.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.mixPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true; 
    this.controls.autoRotateSpeed = 1.0;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 10;
    this.controls.enableZoom = false; // Zoom bloqueado
    this.controls.target.set(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight.position.set(3, 5, 3);
    // Sin castShadow: no proyectamos sombra real, usamos una sombra de contacto procedural.
    this.scene.add(dirLight);

    // Sombra de contacto: plano con textura radial suave, NO recibe sombras reales.
    // Su tamaño y posición se ajustan tras cargar el modelo.
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      map: makeContactShadowTexture(256),
      transparent: true,
      depthWrite: false, // No tape al anillo al escribir profundidad.
      toneMapped: false, // Ya estamos en sRGB; evita doble tone-mapping.
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

    // Normalizamos diagonal a 2 unidades (misma escala visual entre joyas).
    const initialBox = new THREE.Box3().setFromObject(root);
    const initialSize = initialBox.getSize(new THREE.Vector3()).length();
    const scaleFactor = 2.0 / (initialSize || 1);
    root.scale.setScalar(scaleFactor);

    // Pegamos la BASE EFECTIVA de cada anillo al plano y=0, centramos en XZ.
    // computeEffectiveFloorY descarta geometría outlier (prongs/soportes que cuelgan
    // por debajo del aro visible), evitando el "anillo flotando" sobre la sombra.
    const scaledBox = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    const effectiveFloorY = computeEffectiveFloorY(root);
    root.position.set(-center.x, -effectiveFloorY, -center.z);

    this.scene.add(root);

    // Recalcular tras la traslación. Para el target de cámara usamos el centro VISIBLE
    // (desde el suelo efectivo hasta el techo del modelo), no el centro del AABB completo,
    // así los outliers que quedaron por debajo de y=0 no descuadran el encuadre.
    const finalBox = new THREE.Box3().setFromObject(root);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    this._modelCenterY = Math.max(0, finalBox.max.y) / 2;
    this.modelRadius = finalSize.length() / 2;

    // Sombra de contacto sobre y=0 (la base del anillo). Tamaño proporcional a la huella XZ
    // con margen para el falloff suave. Un único `floor` para todos los anillos.
    const planeSize = Math.max(finalSize.x, finalSize.z) * 2.2;
    this.shadowPlane.scale.set(planeSize, planeSize, 1);

    // floor-offset (atributo HTML, opcional): sube el suelo para compensar geometría suelta
    // que cuelgue por debajo del aro visible (prongs, soportes, gas internas). Solo es un
    // parche; lo limpio sería ajustar el origen del modelo en Blender al punto de contacto.
    const floorOffset = parseFloat(this.getAttribute('floor-offset') || '0');
    this.shadowPlane.position.set(0, floorOffset - 0.001, 0);

    this.diamondMeshes = [];
    this.metalMaterials = [];

    root.traverse(obj => {
      if (!obj.isMesh) return;
      // Sin shadow maps: dejamos castShadow/receiveShadow en false (default) y nos ahorramos
      // el pase de sombras del renderer cada frame.

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

          const bvh = new MeshBVH(geo);
          geo.boundsTree = bvh;

          const mat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
              bvh: { value: new MeshBVHUniformStruct() },
              envMap: { value: this.envRaw },
              // Dispersión inicial = 0.05 (iorR = base - 0.025, iorB = base + 0.025).
              iorR: { value: 2.3920 },
              iorG: { value: 2.4170 },
              iorB: { value: 2.4420 },
              uInvModelMatrix: { value: new THREE.Matrix4() },
              uModelMatrix: { value: new THREE.Matrix4() },
              uCameraPos: { value: new THREE.Vector3() },
              uExposure: { value: 0.70 },
              uEpsilon: { value: calculatedEpsilon }
            },
            vertexShader: DIAMOND_VERT,
            fragmentShader: buildFrag(),
            side: THREE.DoubleSide,
          });
          mat.uniforms.bvh.value.updateFrom(bvh);
          obj.material = mat;
          obj.geometry = geo;
          this.diamondMeshes.push(obj);
        } catch(e) { }
      } else {
          if (obj.material) {
              const newMetalMat = new THREE.MeshPhysicalMaterial({
                  color: 0xffffff,
                  metalness: 1.0,
                  roughness: 0.0,
                  envMap: this.envRaw,
                  envMapIntensity: 1.6,
                  clearcoat: 1.0,
                  clearcoatRoughness: 0.0
              });
              obj.material = newMetalMat;
              obj.material.needsUpdate = true;
              this.metalMaterials.push(newMetalMat);
          }
      }
    });

    this._applyOrbit(this.getAttribute('camera-orbit') || '0deg 70deg auto');
    this._resize();
    this._ready = true;

    this._setupUI();

    this._visObs = new IntersectionObserver((entries) => {
      this._visible = entries[0].isIntersecting;
      if (this._visible && !this._rafActive) this._loop();
    }, { threshold: 0.01 });
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
      
      if (this.composer) {
          this.composer.render();
      } else {
          this.renderer.render(this.scene, this.camera);
      }
    };
    this._loop();
  }

  _setupUI() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    
    $('ctrl-exp').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      $('val-exp').innerText = v.toFixed(2);
      this._exposure = v;
      // Tone mapping ahora se hace en el mixPass; actualizamos su uniform.
      if (this.mixPass) this.mixPass.uniforms.uExposure.value = v;
      // Mantenemos uExposure de los diamantes (shader propio) para no romper su look.
      for (const m of this.diamondMeshes) m.material.uniforms.uExposure.value = v;
    });

    $('ctrl-metal').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      $('val-metal').innerText = v.toFixed(1);
      for (const mat of this.metalMaterials) {
        mat.envMapIntensity = v;
        mat.needsUpdate = true;
      }
    });

    $('ctrl-bst').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      $('val-bst').innerText = v.toFixed(2);
      this.bloomPass.strength = v;
    });

    $('ctrl-brad').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      $('val-brad').innerText = v.toFixed(2);
      this.bloomPass.radius = v;
    });

    $('ctrl-bth').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      $('val-bth').innerText = v.toFixed(2);
      this.bloomPass.threshold = v;
    });

    $('ctrl-disp').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      $('val-disp').innerText = v.toFixed(3);
      const baseIOR = 2.4170;
      for (const m of this.diamondMeshes) {
        m.material.uniforms.iorR.value = baseIOR - (v / 2);
        m.material.uniforms.iorG.value = baseIOR;
        m.material.uniforms.iorB.value = baseIOR + (v / 2);
      }
    });

    $('btn-log').addEventListener('click', () => {
      const config = {
        Exposicion: parseFloat($('ctrl-exp').value),
        BrilloMetal: parseFloat($('ctrl-metal').value),
        BloomFuerza: parseFloat($('ctrl-bst').value),
        BloomRadio: parseFloat($('ctrl-brad').value),
        BloomUmbral: parseFloat($('ctrl-bth').value),
        Dispersion: parseFloat($('ctrl-disp').value)
      };
      console.log("================================");
      console.log("💎 TU CONFIGURACIÓN PERFECTA 💎");
      console.log(JSON.stringify(config, null, 2));
      console.log("================================");
      alert("¡Configuración impresa en la Consola! Pulsa F12 para verla.");
    });
  }

  _applyOrbit(value) {
    if (!value || !this.camera) return;
    const parts = value.trim().split(/\s+/);
    const theta = parseFloat(parts[0] || 0) * Math.PI / 180;
    const phi = parseFloat(parts[1] || 70) * Math.PI / 180;

    const fovRad = this.camera.fov * Math.PI / 180;
    const dist = (this.modelRadius || 1.0) / Math.sin(fovRad / 2) * 0.85;

    // La órbita se levanta al centro vertical del modelo (base anclada en y=0).
    const ty = this._modelCenterY || 0;
    const camPos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist, phi, theta));
    camPos.y += ty;
    this.camera.position.copy(camPos);
    this.camera.lookAt(0, ty, 0);

    if (this.controls) {
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
    if (this.bloomPass) this.bloomPass.setSize(w, h);
  }
}

customElements.define('diamond-viewer', DiamondViewer);