import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

// --- CARGA ---
const loadingScreen = document.getElementById('loading-screen');
const loadingBar    = document.getElementById('loader-bar');
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, loaded, total) => {
    if(loadingBar) loadingBar.style.width = (loaded/total*100) + '%';
};
loadingManager.onLoad = () => {
    if(loadingScreen) {
        loadingScreen.style.opacity = '0';
        document.body.classList.add('loaded');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 1500);
    }
};

const header     = document.getElementById('main-header');
const menuToggle = document.getElementById('menu-toggle');

window.toggleMenu = function() {
    header.classList.toggle('menu-open');
    menuToggle.textContent = header.classList.contains('menu-open') ? 'CLOSE' : 'MENU +';
};
window.navigate = function(pct) {
    if(header.classList.contains('menu-open')) toggleMenu();
    window.scrollTo({ top: (document.documentElement.scrollHeight - window.innerHeight) * pct, behavior: 'smooth' });
};
window.scrollToPercent = function(pct) {
    window.scrollTo({ top: (document.documentElement.scrollHeight - window.innerHeight) * pct, behavior: 'smooth' });
};

// --- HELPERS ---
function setVisibility(el, opacity, blur, clickable = false) {
    if(!el) return;
    el.style.opacity       = opacity;
    el.style.filter        = `blur(${blur}px)`;
    el.style.pointerEvents = clickable ? 'all' : 'none';
    el.style.visibility    = opacity <= 0 ? 'hidden' : 'visible';
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function linearMap(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }

// --- REFERENCIAS DOM ---
const aboutSection   = document.getElementById('about-section');
const customSection  = document.getElementById('custom-section');
const contactSection = document.getElementById('contact-section');
const configUI       = document.getElementById('config-ui');
const displayLabel   = document.getElementById('selection-display');
let   displayTimeout = null;

const processGallery    = document.getElementById('process-gallery');
const scrollIndicator   = document.getElementById('scroll-indicator');
const card1 = document.getElementById('l1');
const card2 = document.getElementById('l2');
const card3 = document.getElementById('l3');

function applyFan(fanP) {
    const p = clamp(fanP, 0, 1);
    if(card1) {
        card1.style.transform = `translateX(${-300*p}px) translateY(${35*p}px) rotate(${-20*p}deg)`;
        card1.style.opacity   = String(clamp(p * 3, 0, 1));
    }
    if(card2) {
        card2.style.transform = `translateX(0px) translateY(${-15*p}px) rotate(0deg)`;
        card2.style.opacity   = String(clamp(p * 3, 0, 1));
    }
    if(card3) {
        card3.style.transform = `translateX(${300*p}px) translateY(${35*p}px) rotate(${20*p}deg)`;
        card3.style.opacity   = String(clamp(p * 3, 0, 1));
    }
}

function closeFan() {
    [card1, card2, card3].forEach(c => {
        if(c) { c.style.transform = 'translateX(0) translateY(0) rotate(0deg)'; c.style.opacity = '0'; }
    });
    if(processGallery) { processGallery.style.opacity = '0'; processGallery.classList.remove('fan-active'); }
}

// --- SCROLL ---
window.addEventListener('scroll', () => {
    if(window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
        if(header.classList.contains('menu-open')) toggleMenu();
    }

    const sp = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

    if(sp > 0.65 && sp < 0.74) {
        if(customSection) customSection.classList.add('active-interaction');
    } else {
        if(customSection) customSection.classList.remove('active-interaction');
    }

    // Scroll indicator: solo visible antes del ORDER
    if(scrollIndicator) scrollIndicator.style.opacity = sp > 0.54 ? '0' : '';

    // ─────────────── TIMELINE ───────────────
    //  HOME      0.00 – 0.08
    //  ABOUT     0.08 – 0.42
    //  CUSTOM    0.47 – 0.65  (3 imágenes)
    //  SAMPLE    0.65 – 0.74  (anillo configurador)
    //  ORDER     0.74 – 1.00  (salida anillo + formulario)

    if(sp <= 0.08) {
        homeGroup.position.y = 0; aboutGroup.position.y = -60; contactGroup.position.y = -200;
        finalRingGroup.visible = false; homeGroup.visible = true;
        if(configUI) { configUI.style.opacity = '0'; configUI.style.pointerEvents = 'none'; configUI.style.transform = 'translateY(0)'; }
        setVisibility(aboutSection,  0, 20);
        setVisibility(customSection, 0, 0);
        setVisibility(contactSection,0, 30);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);
        closeFan();
        const scrollIndicator = document.getElementById('scroll-indicator');
        if(scrollIndicator) scrollIndicator.style.opacity = '0';

    } else if(sp > 0.08 && sp <= 0.18) {
        const p = linearMap(sp, 0.08, 0.18);
        homeGroup.position.y  =  p * 80;
        aboutGroup.position.y = -60 + p * 60;
        setVisibility(aboutSection,  0, 20);
        setVisibility(customSection, 0, 0);
        if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);
        closeFan();

    } else if(sp > 0.18 && sp <= 0.30) {
        homeGroup.position.y = 80; aboutGroup.position.y = 0; contactGroup.position.y = -200;
        const o = clamp(linearMap(sp, 0.18, 0.24), 0, 1);
        setVisibility(aboutSection, o, Math.max(20 - o*20, 0));
        setVisibility(customSection, 0, 0);
        if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);
        closeFan();

    } else if(sp > 0.30 && sp <= 0.42) {
        aboutGroup.position.y = 0;
        setVisibility(aboutSection, 1, 0);
        if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true;
        if(customSection) { customSection.style.opacity = '0'; customSection.style.visibility = 'hidden'; }
        if(configUI) configUI.style.opacity = '0';
        setVisibility(contactSection, 0, 30);
        contactGroup.position.y = -200; finalRingGroup.visible = false;
        scene.background = new THREE.Color(0x000000);
        closeFan();

    } else if(sp > 0.42 && sp <= 0.47) {
        const pOut = linearMap(sp, 0.42, 0.47);
        aboutGroup.position.y = 0;
        setVisibility(aboutSection, 1 - pOut, pOut * 20);
        if(diamondMat) diamondMat.opacity = 1 - pOut; if(diamondBase) diamondBase.visible = true;
        if(customSection) { customSection.style.opacity = '0'; customSection.style.visibility = 'hidden'; }
        if(configUI) configUI.style.opacity = '0';
        setVisibility(contactSection, 0, 30);
        contactGroup.position.y = -200; finalRingGroup.visible = false;
        scene.background = new THREE.Color(0x000000);
        closeFan();

    } else if(sp > 0.47 && sp <= 0.54) {
        setVisibility(aboutSection, 0, 0);
        if(diamondMat) diamondMat.opacity = 0; if(diamondBase) diamondBase.visible = false;
        if(customSection) { customSection.style.opacity = '0'; customSection.style.visibility = 'hidden'; }
        if(configUI) configUI.style.opacity = '0';
        finalRingGroup.visible = false; homeGroup.visible = false;
        scene.background = new THREE.Color(0x000000);
        closeFan();

    } else if(sp > 0.54 && sp <= 0.65) {
        // ─── CUSTOM: ABANICO DE IMÁGENES ───
        scene.background = new THREE.Color(0x000000);
        if(diamondMat) diamondMat.opacity = 0; if(diamondBase) diamondBase.visible = false;
        homeGroup.visible = false;
        if(customSection) { customSection.style.opacity = '1'; customSection.style.visibility = 'visible'; }
        setVisibility(contactSection, 0, 30); contactGroup.position.y = -200;
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        if(configUI) { configUI.style.opacity = '0'; configUI.style.pointerEvents = 'none'; }
        finalRingGroup.visible = false;
        setVisibility(aboutSection, 0, 0);

        const fadeIn  = linearMap(sp, 0.54, 0.58);
        const fadeOut = 1 - linearMap(sp, 0.61, 0.65);
        const galleryOpacity = Math.min(fadeIn, fadeOut);
        if(processGallery) {
            processGallery.style.opacity    = String(galleryOpacity);
            processGallery.style.visibility = galleryOpacity > 0 ? 'visible' : 'hidden';
            if(fadeIn > 0.3) processGallery.classList.add('fan-active');
        }
        applyFan(linearMap(sp, 0.54, 0.62));

    } else if(sp > 0.65 && sp <= 0.74) {
        // ─── SAMPLE: ANILLO CONFIGURADOR ───
        if(diamondMat) diamondMat.opacity = 0; if(diamondBase) diamondBase.visible = false;
        homeGroup.visible = false;
        if(customSection) { customSection.style.opacity = '1'; customSection.style.visibility = 'visible'; }
        setVisibility(contactSection, 0, 30); contactGroup.position.y = -200;
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        setVisibility(aboutSection, 0, 0);
        closeFan();

        const bgP = linearMap(sp, 0.65, 0.68) * 0.15;
        scene.background = new THREE.Color(bgP, bgP, bgP);

        if(finalRingModel) {
            finalRingGroup.visible = true;
            finalRingGroup.position.y = 0;
            finalRingModel.traverse(c => { if(c.isMesh) c.material.opacity = 1; });
            finalRingModel.scale.set(1, 1, 1);
        }
        if(configUI) {
            configUI.style.opacity       = '1';
            configUI.style.pointerEvents = 'auto';
            configUI.style.transform     = 'translateY(0)';
        }

    } else {
        // ─── ORDER: SALIDA ANILLO + ENTRADA FORMULARIO ───
        homeGroup.visible = false; if(diamondBase) diamondBase.visible = false;
        closeFan();
        const scrollIndicator = document.getElementById('scroll-indicator');
        if(scrollIndicator) scrollIndicator.style.opacity = '0';

        const pExit = linearMap(sp, 0.74, 0.88);
        const pForm = linearMap(sp, 0.80, 1.0);

        // Anillo sube y se desvanece
        if(finalRingGroup) {
            finalRingGroup.visible = pExit < 1;
            finalRingGroup.position.y = pExit * 90;
        }
        if(finalRingModel) {
            finalRingModel.traverse(c => { if(c.isMesh) c.material.opacity = clamp(1 - pExit * 1.3, 0, 1); });
        }

        // Botones desaparecen rápido
        if(configUI) {
            configUI.style.opacity       = String(clamp(1 - pExit * 3.5, 0, 1));
            configUI.style.transform     = `translateY(${-pExit * 70}vh)`;
            configUI.style.pointerEvents = pExit > 0.05 ? 'none' : 'auto';
        }

        if(customSection) {
            const csOp = clamp(1 - pExit * 1.3, 0, 1);
            customSection.style.opacity    = String(csOp);
            customSection.style.visibility = csOp <= 0 ? 'hidden' : 'visible';
        }

        // Fondo gris → negro
        const bgVal = clamp((1 - pExit * 1.2) * 0.15, 0, 1);
        scene.background = new THREE.Color(bgVal, bgVal, bgVal);

        // Formulario y piedras suben juntos con easing
        if(contactSection) {
            contactSection.style.visibility    = 'visible';
            contactSection.style.opacity       = '1';
            contactSection.style.filter        = 'none';
            contactSection.style.pointerEvents = pForm > 0.3 ? 'all' : 'none';
            const eased   = 1 - Math.pow(1 - pForm, 5);
            const slideUp = (1 - eased) * 180;
            contactSection.style.transform = `translateY(${slideUp}vh)`;
            if(pForm > 0.5) contactSection.classList.add('active');
            else contactSection.classList.remove('active');
        }
        const easedGroup = 1 - Math.pow(1 - pForm, 5);
        contactGroup.position.y = -200 + easedGroup * 200;
    }
});

// --- ARCHIVOS ---
const fileInput       = document.getElementById('attachment');
const fileListDisplay = document.getElementById('file-list');
const dt = new DataTransfer();

if(fileInput) {
    fileInput.addEventListener('change', function() {
        let totalSize = 0;
        for(let i=0; i<dt.items.length; i++) totalSize += dt.items[i].getAsFile().size;
        for(let i=0; i<this.files.length; i++) {
            if(this.files[i].size + totalSize > 25*1024*1024) { alert('Total limit 25MB exceeded.'); continue; }
            dt.items.add(this.files[i]); totalSize += this.files[i].size;
        }
        this.files = dt.files; renderFileList();
    });
}

function renderFileList() {
    if(!fileListDisplay) return;
    fileListDisplay.innerHTML = '';
    for(let i=0; i<dt.files.length; i++) {
        const item = document.createElement('div'); item.className = 'file-item';
        const name = document.createElement('span'); name.className = 'file-name'; name.textContent = dt.files[i].name;
        const btn  = document.createElement('span'); btn.className = 'file-remove'; btn.textContent = '×';
        btn.onclick = () => { dt.items.remove(i); fileInput.files = dt.files; renderFileList(); };
        item.appendChild(name); item.appendChild(btn);
        fileListDisplay.appendChild(item);
    }
}

// --- THREE.JS ---
const params = {
    bgColor: 0x000000,
    camFOV: 45, camPos: { x:0, y:0, z:90 }, camRot: { x:0, y:0, z:-0.2 },
    lightInt: 600, lightColor: 0xffffff,
    envInt: 0.4, envRot: 0.2,
    cryFlat: false, cryTrans: 1.0, cryOp: 1.0, cryIOR: 2.463, cryThick: 0.41,
    cryDisp: 0.8, crySpec: 4.105, cryClear: 0.0, cryEnv: 1.5, cryAttDist: 6.74,
    cryAttColor: 0xededed, cryColor: 0xffffff,
    metalColor: 0xffffff, metalRough: 0.086, metalMetal: 1.0,
    floatYBase: 1.5, floatSpeed: 0.8, floatAmp: 0.15,
    diaPosX: 0, diaPosY: 0, diaPosZ: 4.8,
    diaRotX: 0, diaRotY: 1.6, diaRotZ: 0.911061, diaAnimSpeed: 0.208,
    diaFloatSpeed: 0.438, diaFloatAmp: 0.3,
    d_Thick: 0, d_AbsDist: 5.88, d_Env: 1.5, d_Spec: 4.1,
    d_Tint: 0xffffff, d_AbsColor: 0xededed, d_Trans: 1.0, d_IOR: 2.626, d_Disp: 0.8
};

const scene    = new THREE.Scene();
scene.background = new THREE.Color(params.bgColor);
const camera   = new THREE.PerspectiveCamera(params.camFOV, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(params.camPos.x, params.camPos.y, params.camPos.z);
camera.rotation.set(params.camRot.x, params.camRot.y, params.camRot.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const crystalMat = new THREE.MeshPhysicalMaterial({ color: params.cryColor, transmission: params.cryTrans, opacity: params.cryOp, metalness: 0, roughness: 0, ior: params.cryIOR, thickness: params.cryThick, dispersion: params.cryDisp, envMapIntensity: params.cryEnv, specularIntensity: params.crySpec, clearcoat: params.cryClear, side: THREE.DoubleSide, flatShading: params.cryFlat, attenuationColor: new THREE.Color(params.cryAttColor), attenuationDistance: params.cryAttDist });
const diamondMat = new THREE.MeshPhysicalMaterial({ color: params.d_Tint, transmission: params.d_Trans, opacity: 1, metalness: 0, roughness: 0, ior: params.d_IOR, thickness: params.d_Thick, dispersion: params.d_Disp, envMapIntensity: params.d_Env, specularIntensity: params.d_Spec, side: THREE.DoubleSide, flatShading: false, attenuationColor: new THREE.Color(params.d_AbsColor), attenuationDistance: params.d_AbsDist, transparent: true });
const silverMat  = new THREE.MeshPhysicalMaterial({ color: params.metalColor, metalness: params.metalMetal, roughness: params.metalRough, envMapIntensity: 1 });

function createGemMaterial(colorHex, attColorHex, iorVal) {
    return new THREE.MeshPhysicalMaterial({ color: colorHex, transmission: 0.98, opacity: 1, metalness: 0, roughness: 0, ior: iorVal, thickness: 2.5, dispersion: 0.6, envMapIntensity: 2, specularIntensity: 1, clearcoat: 1, side: THREE.DoubleSide, attenuationColor: new THREE.Color(attColorHex), attenuationDistance: 5 });
}
const emeraldMat      = createGemMaterial(0x00ff00, 0x003300, 1.57);
const rubyMat         = createGemMaterial(0xff0000, 0x440000, 1.76);
const sapphireMat     = createGemMaterial(0x0000ff, 0x000044, 1.76);
const diamondStoneMat = new THREE.MeshPhysicalMaterial({ color: params.cryColor, transmission: params.cryTrans, opacity: params.cryOp, metalness: 0, roughness: 0, ior: params.cryIOR, thickness: params.cryThick, dispersion: params.cryDisp, envMapIntensity: params.cryEnv, specularIntensity: params.crySpec, clearcoat: params.cryClear, side: THREE.DoubleSide, attenuationColor: new THREE.Color(params.cryAttColor), attenuationDistance: params.cryAttDist });
const goldMat         = new THREE.MeshPhysicalMaterial({ color: 0xFFC96F, metalness: 1, roughness: 0.1, envMapIntensity: 2.5, clearcoat: 0.8, clearcoatRoughness: 0.1 });

const stoneOptions = { diamond: diamondStoneMat, ruby: rubyMat, sapphire: sapphireMat, emerald: emeraldMat };
const metalOptions = { silver: silverMat, gold: goldMat };

const light1 = new THREE.PointLight(params.lightColor, params.lightInt);
light1.position.set(20, 20, 20); scene.add(light1);
const light2 = new THREE.PointLight(params.lightColor, params.lightInt);
light2.position.set(-20, -10, 20); scene.add(light2);

const loader = new GLTFLoader(loadingManager);

new EXRLoader(loadingManager).load('./studio_v2.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.offset.x = params.envRot;
    scene.environment = texture; scene.environmentIntensity = params.envInt;
});

const homeGroup      = new THREE.Group(); scene.add(homeGroup);
const aboutGroup     = new THREE.Group(); scene.add(aboutGroup); aboutGroup.position.y = -60;
const contactGroup   = new THREE.Group(); scene.add(contactGroup); contactGroup.position.y = -200;
const finalRingGroup = new THREE.Group(); scene.add(finalRingGroup); finalRingGroup.visible = false;

const ringContainer   = new THREE.Group();
const stonesContainer = new THREE.Group();
homeGroup.add(ringContainer); homeGroup.add(stonesContainer);
ringContainer.position.y = params.floatYBase;
stonesContainer.position.set(4, params.floatYBase, -1);
ringContainer.rotation.y = 0.2; stonesContainer.rotation.y = 0.5;

const individualStones = [];
const contactStones    = [];

loader.load('./Alianza.glb', (gltf) => {
    const ring = gltf.scene;
    const box = new THREE.Box3().setFromObject(ring);
    ring.position.sub(box.getCenter(new THREE.Vector3()));
    ring.traverse(c => { if(c.isMesh) { c.geometry.deleteAttribute('color'); c.material = c.material.name.includes('Material.001') ? crystalMat : silverMat; }});
    ringContainer.add(ring); ring.rotation.set(1.17, 0, -0.03);
});

let finalRingModel = null;
loader.load('./anillofotos.glb', (gltf) => {
    finalRingModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(finalRingModel);
    finalRingModel.position.sub(box.getCenter(new THREE.Vector3()));
    finalRingModel.traverse(c => {
        if(c.isMesh) {
            c.material.transparent = true; c.material.opacity = 0;
            if(c.material.name.includes('Material.003'))      { c.userData.isMainStone = true; c.material = emeraldMat.clone(); }
            else if(c.material.name.includes('Material.004')) { c.userData.isSideStone = true; c.material = diamondStoneMat.clone(); }
            else if(c.material.name.includes('Material2'))    { c.userData.isMetal = true;     c.material = silverMat.clone(); }
            c.material.transparent = true;
        }
    });
    finalRingModel.rotation.set(0.96, 0, 0.61);
    finalRingModel.scale.set(0.8, 0.8, 0.8);
    finalRingGroup.add(finalRingModel);

    // Materiales por defecto: plata + rubí
    finalRingModel.traverse(c => {
        if(!c.isMesh) return;
        if(c.userData.isMainStone || c.userData.isSideStone) {
            const op = c.material.opacity;
            c.material = rubyMat.clone();
            c.material.transparent = true;
            c.material.opacity = op;
        }
        if(c.userData.isMetal) {
            const op = c.material.opacity;
            c.material = silverMat.clone();
            c.material.transparent = true;
            c.material.opacity = op;
        }
    });
});

let diamondBase = null;
loader.load('./diamante.glb', (gltf) => {
    const diamond = gltf.scene;
    const box = new THREE.Box3().setFromObject(diamond);
    diamond.position.sub(box.getCenter(new THREE.Vector3()));
    diamond.traverse(c => { if(c.isMesh) c.material = diamondMat; });
    aboutGroup.add(diamond); diamondBase = diamond;
});

window.updateRingConfig = function(type, value, element, displayName) {
    if(!finalRingModel) return;
    const newMat = type === 'metal' ? metalOptions[value] : stoneOptions[value];
    if(!newMat) return;
    finalRingModel.traverse(c => {
        if(!c.isMesh) return;
        const match = (type === 'main'  && c.userData.isMainStone) ||
                      (type === 'side'  && c.userData.isSideStone) ||
                      (type === 'metal' && c.userData.isMetal);
        if(match) { const op = c.material.opacity; c.material = newMat.clone(); c.material.transparent = true; c.material.opacity = op; }
    });
    if(element) { [...element.parentNode.children].forEach(s => s.classList.remove('active')); element.classList.add('active'); }
    if(displayLabel && displayName) {
        displayLabel.textContent = displayName;
        displayLabel.classList.add('visible');
        clearTimeout(displayTimeout);
        displayTimeout = setTimeout(() => displayLabel.classList.remove('visible'), 3000);
    }
};

loader.load('./piedras.glb', (gltf) => {
    const stones = gltf.scene;
    stones.traverse(c => { if(c.isMesh) { c.material = crystalMat; c.userData = { rotSpeed: 0.003 + Math.random()*0.005, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() }; individualStones.push(c); }});
    stonesContainer.add(stones); stones.rotation.set(0.7, -0.2, 0); stones.scale.set(0.5, 0.5, 0.5);
    const clone = stones.clone();
    clone.traverse(c => { if(c.isMesh) { c.material = crystalMat; c.userData = { rotSpeed: 0.001 + Math.random()*0.004, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() }; contactStones.push(c); }});
    clone.position.set(0, 0, -15); clone.scale.set(0.8, 0.8, 0.8); clone.rotation.set(0.5, 0.5, 0);
    contactGroup.add(clone);
});

// --- PARALLAX HOME ---
let mouseXNorm = 0, mouseYNorm = 0;
document.addEventListener('mousemove', (e) => {
    mouseXNorm = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseYNorm = (e.clientY / window.innerHeight) * 2 - 1;
});
document.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        mouseXNorm = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
        mouseYNorm = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
}, { passive: true });

// --- DRAG EN CONFIGURADOR ---
let isDragging = false, prevMouse = { x:0, y:0 };

window.addEventListener('mousedown', (e) => {
    if(e.target.closest('.config-dot')) return;
    if(finalRingGroup.visible && finalRingModel) { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; }
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => {
    if(!isDragging || !finalRingGroup.visible || !finalRingModel) return;
    finalRingModel.rotateOnWorldAxis(new THREE.Vector3(0,1,0), (e.clientX - prevMouse.x) * 0.005);
    finalRingModel.rotateOnWorldAxis(new THREE.Vector3(1,0,0), (e.clientY - prevMouse.y) * 0.005);
    prevMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('touchstart', (e) => {
    if(e.target.closest('.config-dot')) return;
    const tx = e.touches[0].clientX, w = window.innerWidth;
    if(finalRingGroup.visible && finalRingModel && tx >= w*0.15 && tx <= w*0.85) {
        isDragging = true; prevMouse = { x: tx, y: e.touches[0].clientY };
    }
}, { passive: false });
window.addEventListener('touchend', () => { isDragging = false; });
window.addEventListener('touchmove', (e) => {
    if(!isDragging || !finalRingGroup.visible || !finalRingModel) return;
    finalRingModel.rotateOnWorldAxis(new THREE.Vector3(0,1,0), (e.touches[0].clientX - prevMouse.x) * 0.005);
    finalRingModel.rotateOnWorldAxis(new THREE.Vector3(1,0,0), (e.touches[0].clientY - prevMouse.y) * 0.005);
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: false });

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    const sp   = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

    if(sp < 0.15 && homeGroup.visible) {
        homeGroup.rotation.y += (mouseXNorm * 0.12 - homeGroup.rotation.y) * 0.04;
        homeGroup.rotation.x += (mouseYNorm * 0.07 - homeGroup.rotation.x) * 0.04;
    } else {
        homeGroup.rotation.y += (0 - homeGroup.rotation.y) * 0.08;
        homeGroup.rotation.x += (0 - homeGroup.rotation.x) * 0.08;
    }

    ringContainer.position.y = params.floatYBase + Math.sin(time * params.floatSpeed) * params.floatAmp;

    if(diamondBase) {
        diamondBase.rotation.x = params.diaRotX + Math.sin(time * 0.2) * 0.05;
        diamondBase.rotation.y = params.diaRotY + time * params.diaAnimSpeed;
        diamondBase.rotation.z = params.diaRotZ;
        diamondBase.position.y = params.diaPosY + Math.sin(time * params.diaFloatSpeed) * params.diaFloatAmp;
    }

    individualStones.forEach(s => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));
    contactStones.forEach(s    => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));
    light1.position.x = Math.sin(time * 0.5) * 30;
    light1.position.z = Math.cos(time * 0.5) * 30;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- FORMULARIO PRINCIPAL ---
const form      = document.getElementById('contact-form');
const statusMsg = document.getElementById('form-status');
const submitBtn = form.querySelector('.submit-btn');
const modal     = document.getElementById('success-modal');

window.addEventListener('click', () => { if(modal.classList.contains('visible')) modal.classList.remove('visible'); });

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const orig = submitBtn.textContent;
    submitBtn.textContent = 'SENDING...'; submitBtn.style.opacity = '0.5'; submitBtn.disabled = true;
    statusMsg.style.display = 'none';
    const formData = new FormData(form);
    formData.delete('attachment');
    for(let i=0; i<dt.files.length; i++) formData.append(`attachment-${i+1}`, dt.files[i]);
    try {
        const res = await fetch(form.action, { method: form.method, body: formData, headers: { Accept: 'application/json' }});
        if(res.ok) {
            modal.classList.add('visible'); form.reset();
            if(dt && dt.items) dt.items.clear(); renderFileList();
        } else {
            const data = await res.json();
            statusMsg.textContent = data.errors ? data.errors.map(e => e.message).join(', ') : 'Oops! Problem submitting form.';
            statusMsg.style.color = '#ff4444'; statusMsg.style.display = 'block';
        }
    } catch(err) {
        statusMsg.textContent = 'Oops! Problem submitting form.';
        statusMsg.style.color = '#ff4444'; statusMsg.style.display = 'block';
    } finally {
        submitBtn.textContent = orig; submitBtn.style.opacity = '1'; submitBtn.disabled = false;
    }
});

// --- PORTFOLIO FORM ---
const portfolioForm = document.getElementById('portfolio-form');
if(portfolioForm) {
    portfolioForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn   = this.querySelector('.portfolio-btn');
        const input = this.querySelector('.portfolio-input');
        btn.textContent = '...';
        try {
            const fd = new FormData(this);
            await fetch(this.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' }});
            btn.textContent = '✓';
            input.value = '';
            input.placeholder = 'REQUEST SENT';
            setTimeout(() => { btn.textContent = 'SEND'; input.placeholder = 'Your email address'; }, 3000);
        } catch(err) {
            btn.textContent = 'SEND';
        }
    });
}