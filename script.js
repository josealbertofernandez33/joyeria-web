import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

window.scrollToPercent = function(percentage) {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: totalHeight * percentage, behavior: 'smooth' });
}

const fileInput = document.getElementById('attachment');
const fileListDisplay = document.getElementById('file-list');
const dt = new DataTransfer();

if(fileInput) {
    fileInput.addEventListener('change', function() {
        let totalSize = 0;
        for(let i=0; i<dt.items.length; i++) totalSize += dt.items[i].getAsFile().size;
        for (let i = 0; i < this.files.length; i++) {
            let file = this.files[i];
            if (file.size > 25 * 1024 * 1024) { alert(`File too big.`); continue; }
            dt.items.add(file); totalSize += file.size;
        }
        this.files = dt.files; renderFileList();
    });
}

function renderFileList() {
    if(!fileListDisplay) return;
    fileListDisplay.innerHTML = ''; if (dt.files.length === 0) return;
    for (let i = 0; i < dt.files.length; i++) {
        const file = dt.files[i];
        const item = document.createElement('div'); item.className = 'file-item';
        const name = document.createElement('span'); name.className = 'file-name'; name.textContent = file.name; item.appendChild(name);
        fileListDisplay.appendChild(item);
    }
}

// --- PARÁMETROS ---
const params = {
    bgColor: 0x000000, floorColor: 0x998133, maskOpacity: 1.0,
    camFOV: 45, camPos: { x: 0, y: 0, z: 90 }, camRot: { x: 0, y: 0, z: -0.2 },
    lightInt: 600, lightColor: 0xffffff, lightSpeed: 0.5, 
    envInt: 0.4, envRot: 0.2,   
    cryFlat: false, cryTrans: 1.0, cryOp: 1.0, cryIOR: 2.463, cryThick: 0.41, 
    cryDisp: 0.8, crySpec: 4.105, cryClear: 0.0, cryEnv: 1.5, cryAttDist: 6.74, 
    cryAttColor: 0xededed, cryColor: 0xffffff, metalColor: 0xffffff, metalRough: 0.086, metalMetal: 1.0,
    floatYBase: 1.5, floatSpeed: 0.8, floatAmp: 0.15,
    diaScale: 0.7, diaPosX: 0.0, diaPosY: 0.0, diaPosZ: 4.8,       
    diaRotX: 0.0, diaRotY: 1.6, diaRotZ: 0.911061, diaAnimSpeed: 0.208, 
    diaFloatSpeed: 0.438, diaFloatAmp: 0.3, d_Thick: 0.0, d_AbsDist: 5.88, 
    d_Env: 1.5, d_Spec: 4.1, d_Tint: 0xffffff, d_AbsColor: 0xededed, 
    d_Trans: 1.0, d_IOR: 2.626, d_Disp: 0.8
};

const aboutSection = document.getElementById('about-section');
const customSection = document.getElementById('custom-section');
const contactSection = document.getElementById('contact-section'); 
const configUI = document.getElementById('config-ui'); 
const layer1 = document.getElementById('l1');
const layer2 = document.getElementById('l2');
const layer3 = document.getElementById('l3');
const layer4 = document.getElementById('l4');

const scene = new THREE.Scene();
scene.background = new THREE.Color(params.bgColor); 
const camera = new THREE.PerspectiveCamera(params.camFOV, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(params.camPos.x, params.camPos.y, params.camPos.z); 
camera.rotation.set(params.camRot.x, params.camRot.y, params.camRot.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; 
document.body.appendChild(renderer.domElement);

const crystalMat = new THREE.MeshPhysicalMaterial({ color: params.cryColor, transmission: params.cryTrans, opacity: params.cryOp, metalness: 0.0, roughness: 0.0, ior: params.cryIOR, thickness: params.cryThick, dispersion: params.cryDisp, envMapIntensity: params.cryEnv, specularIntensity: params.crySpec, clearcoat: params.cryClear, side: THREE.DoubleSide, flatShading: params.cryFlat, attenuationColor: new THREE.Color(params.cryAttColor), attenuationDistance: params.cryAttDist });
const diamondMat = new THREE.MeshPhysicalMaterial({ color: params.d_Tint, transmission: params.d_Trans, opacity: 1.0, metalness: 0.0, roughness: 0.0, ior: params.d_IOR, thickness: params.d_Thick, dispersion: params.d_Disp, envMapIntensity: params.d_Env, specularIntensity: params.d_Spec, side: THREE.DoubleSide, flatShading: false, attenuationColor: new THREE.Color(params.d_AbsColor), attenuationDistance: params.d_AbsDist, transparent: true });
const silverMat = new THREE.MeshPhysicalMaterial({ color: params.metalColor, metalness: params.metalMetal, roughness: params.metalRough, envMapIntensity: 1.0 });

function createGemMaterial(colorHex, attColorHex, iorVal) {
    return new THREE.MeshPhysicalMaterial({ 
        color: colorHex, transmission: 0.98, opacity: 1.0, metalness: 0.0, roughness: 0.0, 
        ior: iorVal, thickness: 2.5, dispersion: 0.6, envMapIntensity: 2.0, specularIntensity: 1.0,
        clearcoat: 1.0, side: THREE.DoubleSide, attenuationColor: new THREE.Color(attColorHex), attenuationDistance: 5.0 
    });
}

const emeraldMat = createGemMaterial(0x00ff00, 0x003300, 1.57); 
const rubyMat = createGemMaterial(0xff0000, 0x440000, 1.76);    
const sapphireMat = createGemMaterial(0x0000ff, 0x000044, 1.76); 
const diamondStoneMat = new THREE.MeshPhysicalMaterial({ 
    color: params.cryColor, transmission: params.cryTrans, opacity: params.cryOp, metalness: 0.0, roughness: 0.0, ior: params.cryIOR, thickness: params.cryThick, dispersion: params.cryDisp, envMapIntensity: params.cryEnv, specularIntensity: params.crySpec, clearcoat: params.cryClear, side: THREE.DoubleSide, flatShading: params.cryFlat, attenuationColor: new THREE.Color(params.cryAttColor), attenuationDistance: params.cryAttDist 
});

const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xFFC96F, metalness: 1.0, roughness: 0.1, envMapIntensity: 2.5, clearcoat: 0.8, clearcoatRoughness: 0.1 });
const stoneOptions = { 'diamond': diamondStoneMat, 'ruby': rubyMat, 'sapphire': sapphireMat, 'emerald': emeraldMat };
const metalOptions = { 'silver': silverMat, 'gold': goldMat };

const light1 = new THREE.PointLight(params.lightColor, params.lightInt);
light1.position.set(20, 20, 20); scene.add(light1);
const light2 = new THREE.PointLight(params.lightColor, params.lightInt);
light2.position.set(-20, -10, 20); scene.add(light2);

// RUTA ./studio_v2.exr
new EXRLoader().load('./studio_v2.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.offset.x = params.envRot;
    scene.environment = texture; scene.environmentIntensity = params.envInt;
});

const homeGroup = new THREE.Group(); scene.add(homeGroup);
const aboutGroup = new THREE.Group(); scene.add(aboutGroup); aboutGroup.position.y = -60;
const contactGroup = new THREE.Group(); scene.add(contactGroup); contactGroup.position.y = -200; 

const finalRingGroup = new THREE.Group(); 
scene.add(finalRingGroup); finalRingGroup.visible = false; 

const ringContainer = new THREE.Group();
const stonesContainer = new THREE.Group(); 
homeGroup.add(ringContainer); homeGroup.add(stonesContainer);
ringContainer.position.y = params.floatYBase; stonesContainer.position.y = params.floatYBase; stonesContainer.position.x = -10; 
ringContainer.rotation.y = 0.2; stonesContainer.rotation.y = 0.2;

const loader = new GLTFLoader();
const individualStones = []; 
const contactStones = [];    

// RUTA ./Alianza.glb
loader.load('./Alianza.glb', (gltf) => {
    const ring = gltf.scene;
    const box = new THREE.Box3().setFromObject(ring);
    const center = box.getCenter(new THREE.Vector3());
    ring.position.sub(center);
    ring.traverse(c => { if(c.isMesh) { c.geometry.deleteAttribute('color'); c.material = c.material.name.includes('Material.001') ? crystalMat : silverMat; }});
    ringContainer.add(ring); ring.rotation.set(1.17, 0, -0.03); 
});

let finalRingModel = null;
// RUTA ./anillofotos.glb
loader.load('./anillofotos.glb', (gltf) => {
    finalRingModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(finalRingModel);
    const center = box.getCenter(new THREE.Vector3());
    finalRingModel.position.sub(center);
    finalRingModel.traverse(c => { 
        if(c.isMesh) { 
            c.material.transparent = true; c.material.opacity = 0; 
            if(c.material.name.includes('Material.003')) { c.userData.isMainStone = true; c.material = emeraldMat.clone(); } 
            else if(c.material.name.includes('Material.004')) { c.userData.isSideStone = true; c.material = diamondStoneMat.clone(); } 
            else if(c.material.name.includes('Material2')) { c.userData.isMetal = true; c.material = silverMat.clone(); }
            c.material.transparent = true; 
        }
    });
    finalRingModel.rotation.set(0.96, 0, 0.61); 
    finalRingModel.scale.set(0.8, 0.8, 0.8); 
    finalRingGroup.add(finalRingModel);
});

// --- LÓGICA UI Y CONFIGURACIÓN ---
const displayLabel = document.getElementById('selection-display');
let displayTimeout;

window.updateRingConfig = function(type, value, element, displayName) {
    if(!finalRingModel) return;
    let newMat;
    if(type === 'main' || type === 'side') newMat = stoneOptions[value];
    if(type === 'metal') newMat = metalOptions[value];
    if(!newMat) return;

    finalRingModel.traverse(c => {
        if(c.isMesh) {
            let shouldChange = false;
            if(type === 'main' && c.userData.isMainStone) shouldChange = true;
            if(type === 'side' && c.userData.isSideStone) shouldChange = true;
            if(type === 'metal' && c.userData.isMetal) shouldChange = true;
            if(shouldChange) { const currentOp = c.material.opacity; c.material = newMat.clone(); c.material.transparent = true; c.material.opacity = currentOp; }
        }
    });

    if(element) {
        const siblings = element.parentNode.children;
        for(let i=0; i<siblings.length; i++) siblings[i].classList.remove('active');
        element.classList.add('active');
    }

    if(displayLabel && displayName) {
        displayLabel.textContent = displayName;
        displayLabel.classList.add('visible');
        clearTimeout(displayTimeout);
        displayTimeout = setTimeout(() => {
            displayLabel.classList.remove('visible');
        }, 3000);
    }
};

// RUTA ./piedras.glb
loader.load('./piedras.glb', (gltf) => {
    const stones = gltf.scene;
    stones.traverse(c => { if(c.isMesh) { c.material = crystalMat; c.userData = { rotSpeed: 0.003 + Math.random()*0.005, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() }; individualStones.push(c); }});
    stonesContainer.add(stones); stones.rotation.set(0.7, -0.2, 0); stones.scale.set(0.5, 0.5, 0.5);
    const stonesClone = stones.clone();
    stonesClone.traverse(c => { if(c.isMesh) { c.material = crystalMat; c.userData = { rotSpeed: 0.001 + Math.random()*0.004, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() }; contactStones.push(c); }});
    stonesClone.position.set(0, 0, -15); stonesClone.scale.set(0.8, 0.8, 0.8); stonesClone.rotation.set(0.5, 0.5, 0); contactGroup.add(stonesClone);
});

const isMobile = window.innerWidth < 768;

if (!isMobile) {
    const groundMirror = new Reflector(new THREE.PlaneGeometry(800, 800), { clipBias: 0.003, textureWidth: window.innerWidth*window.devicePixelRatio, textureHeight: window.innerHeight*window.devicePixelRatio, color: params.floorColor });
    groundMirror.rotation.x = -Math.PI/2; groundMirror.position.y = -7; 
    homeGroup.add(groundMirror);

    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024; const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(512, 512, 0, 512, 512, 512); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.12, 'rgba(0,0,0,1)'); 
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 1024); 
    const maskPlane = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: params.maskOpacity }));
    maskPlane.rotation.x = -Math.PI/2; maskPlane.position.y = -6.99; homeGroup.add(maskPlane);
}

let diamondBase = null;
// RUTA ./diamante.glb
loader.load('./diamante.glb', (gltf) => {
    const diamond = gltf.scene;
    const box = new THREE.Box3().setFromObject(diamond);
    const center = box.getCenter(new THREE.Vector3());
    diamond.position.sub(center); 
    diamond.traverse(c => { if(c.isMesh) c.material = diamondMat; });
    aboutGroup.add(diamond); diamondBase = diamond;
});

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const interactionZone = document.getElementById('custom-section');

window.addEventListener('mousedown', (e) => { 
    if (e.target.closest('.config-dot')) return;
    if(finalRingGroup.visible) { isDragging = true; interactionZone.classList.add('grabbing'); previousMousePosition = { x: e.clientX, y: e.clientY }; }
});
window.addEventListener('mouseup', () => { isDragging = false; interactionZone.classList.remove('grabbing'); });
window.addEventListener('mousemove', (e) => {
    if (isDragging && finalRingGroup.visible && finalRingModel) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        finalRingModel.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
        finalRingModel.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

interactionZone.addEventListener('touchstart', (e) => { 
    if (e.target.closest('.config-dot')) return;
    const touchX = e.touches[0].clientX;
    const width = window.innerWidth;
    const margin = width * 0.15; 
    if (touchX < margin || touchX > width - margin) { isDragging = false; return; }
    if(finalRingGroup.visible) { isDragging = true; previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
}, { passive: false });

window.addEventListener('touchend', () => isDragging = false);

interactionZone.addEventListener('touchmove', (e) => {
    if (isDragging && finalRingGroup.visible && finalRingModel) {
        e.preventDefault(); 
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        finalRingModel.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
        finalRingModel.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
}, { passive: false });

function setVisibility(element, opacity, blur, clickable = false) {
    if(!element) return;
    element.style.opacity = opacity; element.style.filter = `blur(${blur}px)`; element.style.pointerEvents = clickable ? "all" : "none";
}
function resetLayer(element, baseZ) { if(element) { element.style.transform = `rotateZ(-90deg) translateZ(${baseZ}px)`; element.style.opacity = 1; element.style.display = 'block'; } }
function liftLayerDone(element) { if(element) { element.style.transform = `rotateZ(-90deg) translateZ(500px)`; element.style.opacity = 0; } }
function updateLuxuryLayer(element, progress, baseZ) {
    if(element) { const lift = baseZ + (progress * 450); const opacity = 1 - Math.pow(progress, 2); element.style.transform = `rotateZ(-90deg) translateZ(${lift}px)`; element.style.opacity = opacity; }
}

resetLayer(layer1, 90); resetLayer(layer2, 60); resetLayer(layer3, 30); resetLayer(layer4, 0);

window.addEventListener('scroll', () => {
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    
    if (scrollPercent > 0.60 && scrollPercent < 0.92) { 
        if(customSection) customSection.classList.add('active-interaction');
        if(layer4) layer4.style.opacity = 0; 
    } else { 
        if(customSection) customSection.classList.remove('active-interaction'); 
        if(layer4) layer4.style.opacity = 1;
    }

    if (scrollPercent <= 0.10) {
        const p = scrollPercent / 0.10; camera.position.z = params.camPos.z - (p * 10); ringContainer.rotation.y = 0.2 + (p * 0.3);
        homeGroup.position.y = 0; aboutGroup.position.y = -60; contactGroup.position.y = -200; 
        finalRingGroup.visible = false; homeGroup.visible = true; if(configUI) { configUI.style.opacity = 0; configUI.style.pointerEvents = "none"; }
        setVisibility(aboutSection, 0, 20); setVisibility(customSection, 0, 0); setVisibility(contactSection, 0, 30);
        if(contactSection) contactSection.classList.remove('active'); 
        if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true; 
    } else if (scrollPercent > 0.10 && scrollPercent <= 0.25) {
        const p = (scrollPercent - 0.10) / 0.15; homeGroup.position.y = p * 80; aboutGroup.position.y = -60 + (p * 60); 
        setVisibility(aboutSection, 0, 20); setVisibility(customSection, 0, 0); if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true;
    } else if (scrollPercent > 0.25 && scrollPercent <= 0.40) {
        homeGroup.position.y = 80; aboutGroup.position.y = 0; contactGroup.position.y = -200;
        const pText = (scrollPercent - 0.25) / 0.05; let o = pText; if(o>1) o=1; let b = 20 - (pText * 20); if(b<0) b=0;
        setVisibility(aboutSection, o, b); setVisibility(customSection, 0, 0); if(diamondMat) diamondMat.opacity = 1; if(diamondBase) diamondBase.visible = true;
    } else if (scrollPercent > 0.40 && scrollPercent <= 0.50) {
        const pOut = (scrollPercent - 0.40) / 0.10; aboutGroup.position.y = 0; 
        setVisibility(aboutSection, 1 - pOut, pOut * 20); if(diamondMat) diamondMat.opacity = 1 - pOut; if(diamondBase) diamondBase.visible = true;
        if(customSection) customSection.style.opacity = 0; if(configUI) configUI.style.opacity = 0;
        resetLayer(layer1, 90); resetLayer(layer2, 60); resetLayer(layer3, 30); resetLayer(layer4, 0);
        setVisibility(contactSection, 0, 30); contactGroup.position.y = -200; finalRingGroup.visible = false;
    } else if (scrollPercent > 0.50 && scrollPercent <= 0.60) {
        aboutGroup.position.y = 0; if(diamondMat) diamondMat.opacity = 0; if(diamondBase) diamondBase.visible = false; 
        setVisibility(aboutSection, 0, 20); const pIn = (scrollPercent - 0.50) / 0.10; if(customSection) customSection.style.opacity = pIn;
        resetLayer(layer1, 90); resetLayer(layer2, 60); resetLayer(layer3, 30); resetLayer(layer4, 0); finalRingGroup.visible = false; homeGroup.visible = false;
    } else if (scrollPercent > 0.60 && scrollPercent <= 0.92) {
        if(diamondMat) diamondMat.opacity = 0; if(diamondBase) diamondBase.visible = false; homeGroup.visible = false; 
        if(customSection) customSection.style.opacity = 1; if(interactionZone) interactionZone.classList.add('interactive');
        setVisibility(contactSection, 0, 30); contactGroup.position.y = -200;
        if(contactSection) contactSection.classList.remove('active'); 
        
        const pCustom = (scrollPercent - 0.60) / 0.20; 
        if(pCustom <= 1.0) {
            const step = 1 / 4; 
            if(configUI) { configUI.style.opacity = 0; configUI.style.pointerEvents = "none"; }
            if (pCustom <= step) { let p = pCustom / step; updateLuxuryLayer(layer1, p, 90); resetLayer(layer2, 60); resetLayer(layer3, 30); finalRingGroup.visible = false; } 
            else if (pCustom <= step * 2) { liftLayerDone(layer1); let p = (pCustom - step) / step; updateLuxuryLayer(layer2, p, 60); resetLayer(layer3, 30); finalRingGroup.visible = false; } 
            else if (pCustom <= step * 3) { liftLayerDone(layer1); liftLayerDone(layer2); let p = (pCustom - step*2) / step; updateLuxuryLayer(layer3, p, 30); finalRingGroup.visible = false; }
            else { liftLayerDone(layer1); liftLayerDone(layer2); liftLayerDone(layer3); let p = (pCustom - step*3) / step; if(finalRingModel) { finalRingGroup.visible = true; finalRingModel.traverse(c => { if(c.isMesh) c.material.opacity = p; }); let scale = 0.8 + (p * 0.2); finalRingModel.scale.set(scale, scale, scale); } }
            if(layer4) layer4.style.opacity = 0;
        } else {
            liftLayerDone(layer1); liftLayerDone(layer2); liftLayerDone(layer3); if(layer4) layer4.style.opacity = 0;
            if(configUI) { configUI.style.opacity = 1; configUI.style.pointerEvents = "auto"; }
            if(finalRingModel) { finalRingGroup.visible = true; finalRingModel.traverse(c => { if(c.isMesh) c.material.opacity = 1; }); finalRingModel.scale.set(1, 1, 1); }
        }
    } else {
        homeGroup.position.y = 200; aboutGroup.position.y = 200; homeGroup.visible = false; if(diamondBase) diamondBase.visible = false;
        if(interactionZone) interactionZone.classList.remove('interactive');
        if(configUI) { configUI.style.opacity = 0; configUI.style.pointerEvents = "none"; }
        const pForm = (scrollPercent - 0.92) / 0.08; 
        if(customSection) customSection.style.opacity = 1 - pForm; 
        if(finalRingModel) { finalRingModel.traverse(c => { if(c.isMesh) c.material.opacity = 1 - pForm; }); }
        const blurVal = 30 - (pForm * 30); setVisibility(contactSection, pForm, blurVal, true); contactGroup.position.y = -200 + (pForm * 200); 
        if(pForm > 0.5 && contactSection) contactSection.classList.add('active'); 
    }
});

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    ringContainer.position.y = params.floatYBase + Math.sin(time * params.floatSpeed) * params.floatAmp;
    if (diamondBase) { diamondBase.rotation.x = params.diaRotX + (Math.sin(time * 0.2) * 0.05); diamondBase.rotation.y = params.diaRotY + (time * params.diaAnimSpeed); diamondBase.rotation.z = params.diaRotZ; diamondBase.position.y = params.diaPosY + Math.sin(time * params.diaFloatSpeed) * params.diaFloatAmp; }
    individualStones.forEach(s => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));
    contactStones.forEach(s => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));
    light1.position.x = Math.sin(time * 0.5) * 30; light1.position.z = Math.cos(time * 0.5) * 30;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});