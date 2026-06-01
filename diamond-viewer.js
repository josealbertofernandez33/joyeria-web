import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { MeshBVH, MeshBVHUniformStruct, shaderStructs, shaderIntersectFunction } from 'three-mesh-bvh';

const DIAMOND_REGEX = /\b(piedra|piedras|diam|diamond|gem|gema|stone|cristal|crystal|brillante|jewel|001)\b/i;
const METAL_REGEX = /\b(anillo|ring|aro|band|metal|gold|silver|oro|plata|platino|platinum|base|shank|montura|setting|prong|garra)\b/i;

function isDiamondByMaterial(mat) {
  if (!mat) return false;
  if (mat.metalness && mat.metalness > 0.5) return false; 
  const transmission = mat.transmission ?? 0;
  if (transmission > 0.5) return true;
  return false;
}

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

const COLOR_MAP = {
    metal: {
        'white': 0xffffff,
        'yellow': 0xe3c683, 
        'rose': 0xdfa09e,   
        'silver': 0xc0c0c0
    },
    stone: {
        'diamond': 0xffffff,
        'sapphire': 0x0f52ba,
        'emerald': 0x50c878,
        'ruby': 0xe0115f
    }
};

class DiamondViewer extends HTMLElement {
  static get observedAttributes() { 
      return ['src', 'camera-orbit', 'floor-offset', 'material-mode', 'explode-mode', 'metal-color', 'stone-color']; 
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; position: relative; overflow: hidden; background-color: transparent; transition: background-color 0.5s ease; user-select: none; -webkit-user-select: none; }
        canvas { display: block; width: 100%; height: 100%; outline: none; background-color: transparent; cursor: grab; }
        canvas:active { cursor: grabbing; }
        
        #btn-restore {
            display: none;
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 100;
            padding: 12px 24px;
            background: #1f2224;
            color: #fff;
            border: 1px solid #9c7a3c;
            cursor: pointer;
            text-transform: uppercase;
            font-size: 11px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: bold;
            letter-spacing: 1.5px;
            border-radius: 2px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            user-select: none;
            -webkit-user-select: none;
        }
        #btn-restore:hover {
            background: #9c7a3c;
            color: #fff;
        }
      </style>
      <canvas></canvas>
      <button id="btn-restore">Return to Assembly</button>
    `;
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.btnRestore = this.shadowRoot.querySelector('#btn-restore');
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isIsolated = false;
  }

  connectedCallback() {
    if (this._initStarted) return;
    this._lazyObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this._lazyObs.disconnect();
        this._initStarted = true;
        this._init().catch(err => console.error('Error 3D:', err));
      }
    }, { rootMargin: '300px' });
    this._lazyObs.observe(this);
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._ready) return;
    if (name === 'camera-orbit') this._applyOrbit(newV);
    if (name === 'material-mode') this._applyMaterialMode(newV);
    if (name === 'explode-mode') this._applyExplodeMode(newV === 'true');
    if (name === 'metal-color') this._updateColor('metal', newV);
    if (name === 'stone-color') this._updateColor('stone', newV);
  }

  async _init() {
    const IS_MOBILE = window.innerWidth <= 1024 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this._isMobile = IS_MOBILE;

    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: IS_MOBILE ? "low-power" : "high-performance" });
    renderer.setPixelRatio(IS_MOBILE ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0); 
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; 
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = null; 
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000); 

    if (!IS_MOBILE) {
      const renderScene = new RenderPass(this.scene, this.camera);
      renderScene.clearColor = new THREE.Color(0x000000);
      renderScene.clearAlpha = 0;
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.10, 1.00, 0.28);
      const mixMaterial = new THREE.ShaderMaterial({
        uniforms: { tDiffuse:  { value: null }, uExposure: { value: 0.50 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float uExposure; varying vec2 vUv;
          vec3 ACESFilm(vec3 x) { const float a = 2.51; const float b = 0.03; const float c = 2.43; const float d = 0.59; const float e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
          vec3 linearToSRGB(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
          void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            vec3 cSRGB = linearToSRGB(ACESFilm(c.rgb * uExposure));
            vec3 result = clamp(vec3(1.0) * (1.0 - c.a) + cSRGB, 0.0, 1.0);
            gl_FragColor = vec4(result, c.a);
          }
        `,
      });
      this.mixPass = new ShaderPass(mixMaterial, 'tDiffuse');
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(renderScene);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.mixPass);
    } else {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.85;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = IS_MOBILE ? 0.18 : 0.3;
    this.controls.enableZoom = true; 
    this.controls.target.set(0, 0, 0);

    this.controls.addEventListener('start', () => {
        this.targetCamPos = null;
    });

    this.scene.add(new THREE.AmbientLight(0xffffff, 5.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 10.0);
    dirLight.position.set(0.4, 1.1, 0.1);
    this.scene.add(dirLight);

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

    const srcAttr = this.getAttribute('src');
    const urls = srcAttr.split(',').map(s => s.trim());
    
    let gltfs = [];
    try {
        const loader = new GLTFLoader();
        const results = await Promise.allSettled(
            urls.map(url => new Promise((res, rej) => loader.load(encodeURI(url), res, undefined, rej)))
        );
        
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                const gltf = result.value;
                gltf.scene.userData.fileName = urls[idx].toLowerCase(); 
                gltfs.push(gltf);
            }
        });
    } catch(e) { return; }

    if (gltfs.length === 0) return;

    const root = new THREE.Group();
    gltfs.forEach(gltf => root.add(gltf.scene));

    root.updateMatrixWorld(true);

    const initialBox = new THREE.Box3().setFromObject(root);
    const initialSize = initialBox.getSize(new THREE.Vector3()).length();
    
    if (initialSize > 0) {
        const scaleFactor = 2.0 / initialSize;
        root.scale.setScalar(scaleFactor);
        root.updateMatrixWorld(true);
    }

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

    const fovRad = this.camera.fov * Math.PI / 180;
    const baseDist = (this.modelRadius || 1.0) / Math.sin(fovRad / 2) * 0.65;
    this.baseCamDist = baseDist;
    this.controls.minDistance = baseDist * 0.40; 
    this.controls.maxDistance = baseDist * 3.5;

    this.diamondMeshes = [];
    this.metalMeshes = [];
    this.allMeshes = []; 

    this.techMaterials = {
        baseMetal: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.2 }),
        baseStone: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.0 })
    };

    root.traverse(obj => {
      if (!obj.isMesh) return;
      this.allMeshes.push(obj);

      obj.userData.basePos = obj.position.clone();
      obj.userData.targetPos = obj.position.clone();
      obj.userData.isIsolated = false;

      let isDiamondContext = false;
      let p = obj;
      while(p) {
         if(p.userData && p.userData.fileName && p.userData.fileName.includes('piedra')) isDiamondContext = true;
         p = p.parent;
      }
      
      const combined = `${obj.name || ''} ${obj.material?.name || ''}`.toLowerCase();
      const isDiamond = isDiamondContext || (DIAMOND_REGEX.test(combined) || isDiamondByMaterial(obj.material));

      if (isDiamond) {
        obj.userData.isStone = true;
        obj.userData.groupId = obj.parent.uuid; 
        
        let isMainStone = false;
        let isPave = false;
        let pCheck = obj;
        while(pCheck) {
           if(pCheck.userData && pCheck.userData.fileName) {
               if(pCheck.userData.fileName.includes('principal')) isMainStone = true;
               if(pCheck.userData.fileName.includes('peque')) isPave = true;
           }
           pCheck = pCheck.parent;
        }

        if(isMainStone) {
            obj.userData.explodePos = obj.userData.basePos.clone().add(new THREE.Vector3(0, 14.0, 0));
        } else if(isPave) {
            obj.geometry.computeBoundingBox();
            const localCenter = new THREE.Vector3();
            obj.geometry.boundingBox.getCenter(localCenter);
            const radialOut = new THREE.Vector3(localCenter.x, 0, localCenter.z).normalize().multiplyScalar(0.0);
            obj.userData.explodePos = obj.userData.basePos.clone().add(new THREE.Vector3(0, 5, 0)).add(radialOut);
        } else {
            obj.userData.explodePos = obj.userData.basePos.clone().add(new THREE.Vector3(0, 0, 0));
        }

        const gemTint = (obj.material && obj.material.color) ? obj.material.color.clone() : new THREE.Color(0xffffff);
        
        if (IS_MOBILE) {
          obj.geometry.computeBoundingBox();
          const localSize = obj.geometry.boundingBox.getSize(new THREE.Vector3()).length();
          
          const mat = new THREE.MeshPhysicalMaterial({
            color: gemTint, 
            metalness: 0.0, 
            roughness: 0.0, 
            transmission: 1.0, 
            thickness: 0.8, 
            ior: 2.415,
            dispersion: 0.04,
            attenuationColor: new THREE.Color(0xffffff), 
            attenuationDistance: 2.0,
            envMap: this.envRaw,
            envMapIntensity: 4.0, 
            clearcoat: 1.0, 
            clearcoatRoughness: 0.0
          });
          
          obj.material = mat;
          obj.userData._gemSize = localSize;
          this.diamondMeshes.push(obj);
        } else {
          try {
            let geo = obj.geometry;
            geo = geo.toNonIndexed();
            geo.computeVertexNormals();
            geo.computeBoundingBox();
            const localSize = geo.boundingBox.getSize(new THREE.Vector3()).length();
            const calculatedEpsilon = localSize * 0.0005;
            const bvh = new MeshBVH(geo);
            geo.boundsTree = bvh;
            const baseIOR = 2.415;
            const disp = 0.009;
            const mat = new THREE.ShaderMaterial({
              glslVersion: THREE.GLSL3,
              uniforms: {
                bvh: { value: new MeshBVHUniformStruct() }, envMap: { value: this.envRaw }, iorR: { value: baseIOR - (disp / 2) },
                iorG: { value: baseIOR }, iorB: { value: baseIOR + (disp / 2) }, uInvModelMatrix: { value: new THREE.Matrix4() },
                uModelMatrix: { value: new THREE.Matrix4() }, uCameraPos: { value: new THREE.Vector3() },
                uExposure: { value: 1.25 }, uEpsilon: { value: calculatedEpsilon }, uColor: { value: gemTint },
              },
              vertexShader: DIAMOND_VERT, fragmentShader: buildFrag(), side: THREE.DoubleSide,
            });
            mat.uniforms.bvh.value.updateFrom(bvh);
            obj.material = mat;
            obj.geometry = geo;
            obj.userData._gemSize = localSize;
            this.diamondMeshes.push(obj);
          } catch(e) { }
        }
      } else {
          obj.userData.isStone = false;
          obj.userData.groupId = obj.parent.uuid;
          
          let isProng = false;
          let pCheck = obj;
          while(pCheck) {
             if(pCheck.userData && pCheck.userData.fileName && pCheck.userData.fileName.includes('garras')) isProng = true;
             pCheck = pCheck.parent;
          }

          if(isProng) obj.userData.explodePos = obj.userData.basePos.clone().add(new THREE.Vector3(0, -3.0, 0));
          else obj.userData.explodePos = obj.userData.basePos.clone().add(new THREE.Vector3(0, -8.0, 0)); 

          if (obj.material) {
              const newMetalMat = new THREE.MeshPhysicalMaterial({
                  color: 0xffffff, metalness: 1.0, roughness: 0.0, envMap: this.envRaw,
                  envMapIntensity: 1.71, clearcoat: 0.7, clearcoatRoughness: 1.0
              });
              obj.material = newMetalMat;
              obj.material.needsUpdate = true;
          }
          this.metalMeshes.push(obj);
      }
      obj.userData.originalMaterial = obj.material;
    });

    this.originalCamState = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

    this.canvas.addEventListener('dblclick', (event) => {
        if(this.isIsolated) return; 

        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.allMeshes, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            this.isIsolated = true;

            this.originalCamState.pos.copy(this.camera.position);
            this.originalCamState.target.copy(this.controls.target);

            this.allMeshes.forEach(m => {
                if (m.userData.groupId !== hitMesh.userData.groupId) {
                    m.visible = false;
                }
            });

            hitMesh.geometry.computeBoundingBox();
            const box = new THREE.Box3().setFromObject(hitMesh);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());

            this.controls.target.copy(center);
            
            const direction = new THREE.Vector3().subVectors(this.camera.position, center).normalize();
            const distance = size * 1.5;
            this.camera.position.copy(center).add(direction.multiplyScalar(distance));
            
            this.controls.autoRotate = true; 
            this.btnRestore.style.display = 'block';
        }
    });

    this.btnRestore.addEventListener('click', () => {
        this.isIsolated = false;
        this.btnRestore.style.display = 'none';
        this.targetCamPos = null; 
        this.allMeshes.forEach(m => m.visible = true);
        this.camera.position.copy(this.originalCamState.pos);
        this.controls.target.copy(this.originalCamState.target);
    });

    this._applyOrbit(this.getAttribute('camera-orbit') || '0deg 70deg auto');
    this._resize();
    this._ready = true;

    this._applyMaterialMode(this.getAttribute('material-mode') || 'realistic');
    this._applyExplodeMode(this.getAttribute('explode-mode') === 'true');

    this._visObs = new IntersectionObserver((entries) => {
      this._visible = entries[0].isIntersecting;
      if (this._visible && !this._rafActive) this._loop();
    }, { threshold: 0.05 });
    this._visObs.observe(this);
    this._visible = true;

    if (IS_MOBILE) {
      let last = 0; const FRAME_MS = 1000 / 30;
      this._loop = (t) => {
        if (!this._ready || !this._visible) { this._rafActive = false; return; }
        this._rafActive = true;
        requestAnimationFrame(this._loop);
        
        if(!this.isIsolated) {
            this.allMeshes.forEach(m => { if(m.userData.targetPos) m.position.lerp(m.userData.targetPos, 0.08); });
            
            if (this.targetCamPos) {
                this.camera.position.lerp(this.targetCamPos, 0.06);
                if (this.camera.position.distanceTo(this.targetCamPos) < 0.02) this.targetCamPos = null;
            }
        }

        if (t - last < FRAME_MS) return;
        last = t;
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
    } else {
      this._loop = () => {
        if (!this._ready || !this._visible) { this._rafActive = false; return; }
        this._rafActive = true;
        requestAnimationFrame(this._loop);

        if(!this.isIsolated) {
            this.allMeshes.forEach(m => { if(m.userData.targetPos) m.position.lerp(m.userData.targetPos, 0.08); });

            if (this.targetCamPos) {
                this.camera.position.lerp(this.targetCamPos, 0.06);
                if (this.camera.position.distanceTo(this.targetCamPos) < 0.02) this.targetCamPos = null;
            }
        }

        if (this.controls) this.controls.update();
        this.scene.updateMatrixWorld(true);
        for (const m of this.diamondMeshes) {
          if(m.material.uniforms && m.visible) { 
            const u = m.material.uniforms;
            u.uModelMatrix.value.copy(m.matrixWorld);
            u.uInvModelMatrix.value.copy(m.matrixWorld).invert();
            u.uCameraPos.value.copy(this.camera.position);
          }
        }
        this.composer.render();
      };
    }
    this._loop();
  }

  _applyMaterialMode(mode) {
    if (!this.allMeshes || this.allMeshes.length === 0) return;

    this.allMeshes.forEach(obj => {
        if (!obj.userData.originalMaterial) return;
        if (mode === 'base') {
            obj.material = obj.userData.isStone ? this.techMaterials.baseStone : this.techMaterials.baseMetal;
        } else {
            obj.material = obj.userData.originalMaterial;
        }
    });
  }

  _applyExplodeMode(isExploded) {
    if (!this.allMeshes || this.allMeshes.length === 0) return;

    if (this.baseCamDist) {
        const currentDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        if (isExploded) {
            this.targetCamPos = this.controls.target.clone().add(currentDir.multiplyScalar(this.baseCamDist * 1.8)); 
        } else {
            this.targetCamPos = this.controls.target.clone().add(currentDir.multiplyScalar(this.baseCamDist));
        }
    }

    this.allMeshes.forEach(obj => {
        if (isExploded) {
            obj.userData.targetPos = obj.userData.explodePos; 
        } else {
            obj.userData.targetPos = obj.userData.basePos; 
        }
    });
  }

  _updateColor(type, colorName) {
      if(!this._ready || !colorName) return;
      const hexColor = COLOR_MAP[type][colorName];
      if(hexColor === undefined) return;

      if(type === 'metal') {
          this.metalMeshes.forEach(m => {
              if(m.userData.originalMaterial && m.userData.originalMaterial.color) {
                  m.userData.originalMaterial.color.setHex(hexColor);
              }
          });
      } else if(type === 'stone') {
          this.diamondMeshes.forEach(m => {
              if(m.userData.originalMaterial) {
                  if(this._isMobile) {
                      m.userData.originalMaterial.color.setHex(hexColor);
                  } else if (m.userData.originalMaterial.uniforms) {
                      m.userData.originalMaterial.uniforms.uColor.value.setHex(hexColor);
                  }
              }
          });
      }
  }

  _applyOrbit(value) {
    if (!value || !this.camera) return;
    const parts = value.trim().split(/\s+/);
    const theta = parseFloat(parts[0] || 0) * Math.PI / 180;
    const phi = parseFloat(parts[1] || 70) * Math.PI / 180;
    const fovRad = this.camera.fov * Math.PI / 180;
    
    const dist = (this.modelRadius || 1.0) / Math.sin(fovRad / 2) * 0.65; 
    
    this.baseCamDist = dist; 

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
    const w = this.clientWidth || 1; const h = this.clientHeight || 1;
    if (w === 0 || h === 0) return; 
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.setSize(w, h);
  }
}
customElements.define('diamond-viewer', DiamondViewer);