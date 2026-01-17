import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const header = document.getElementById('main-header');
const menuToggle = document.getElementById('menu-toggle');

window.toggleMenu = function() {
    header.classList.toggle('menu-open');
    if(header.classList.contains('menu-open')) {
        menuToggle.textContent = 'CLOSE';
    } else {
        menuToggle.textContent = 'MENU +';
    }
}

window.navigate = function(percentage) {
    if(header.classList.contains('menu-open')) {
        toggleMenu();
    }
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: totalHeight * percentage, behavior: 'smooth' });
}

window.scrollToPercent = function(percentage) {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: totalHeight * percentage, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
        if(header.classList.contains('menu-open')) toggleMenu();
    }
    
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

const fileInput = document.getElementById('attachment');
const fileListDisplay = document.getElementById('file-list');
const dt = new DataTransfer();

if(fileInput) {
    fileInput.addEventListener('change', function() {
        let totalSize = 0;
        for(let i=0; i<dt.items.length; i++) totalSize += dt.items[i].getAsFile().size;
        for (let i = 0; i < this.files.length; i++) {
            let file = this.files[i];
            if (file.size + totalSize > 25 * 1024 * 1024) { alert(`Total size limit (25MB) exceeded.`); continue; }
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
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'file-remove';
        removeBtn.textContent = '×';
        removeBtn.onclick = function() {
            dt.items.remove(i);
            fileInput.files = dt.files;
            renderFileList();
        };
        item.appendChild(removeBtn);
        
        fileListDisplay.appendChild(item);
    }
}

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

loader.load('./Alianza.glb', (gltf) => {
    const ring = gltf.scene;
    const box = new THREE.Box3().setFromObject(ring);
    const center = box.getCenter(new THREE.Vector3());
    ring.position.sub(center);
    ring.traverse(c => { if(c.isMesh) { c.geometry.deleteAttribute('color'); c.material = c.material.name.includes('Material.001') ? crystalMat : silverMat; }});
    ringContainer.add(ring); ring.rotation.set(1.17, 0, -0.03); 
});

let finalRingModel = null;
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

const form = document.getElementById('contact-form');
const statusMsg = document.getElementById('form-status');
const submitBtn = form.querySelector('.submit-btn');
const modal = document.getElementById('success-modal');

window.addEventListener('click', function(event) {
    if (modal.classList.contains('visible')) {
        modal.classList.remove('visible');
    }
}, { once: false });

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "SENDING...";
    submitBtn.style.opacity = "0.5";
    submitBtn.disabled = true;
    statusMsg.style.display = "none";

    const formData = new FormData(form);

    formData.delete('attachment');
    
    for (let i = 0; i < dt.files.length; i++) {
        formData.append(`attachment-${i+1}`, dt.files[i]);
    }

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            modal.classList.add('visible');
            form.reset();
            if(dt && dt.items) dt.items.clear();
            renderFileList();
        } else {
            const data = await response.json();
            if (Object.hasOwn(data, 'errors')) {
                statusMsg.textContent = data["errors"].map(error => error["message"]).join(", ");
            } else {
                statusMsg.textContent = "Oops! There was a problem submitting your form.";
            }
            statusMsg.style.color = "#ff4444";
            statusMsg.style.display = "block";
        }
    } catch (error) {
        statusMsg.textContent = "Oops! There was a problem submitting your form.";
        statusMsg.style.color = "#ff4444";
        statusMsg.style.display = "block";
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = "1";
        submitBtn.disabled = false;
    }
});