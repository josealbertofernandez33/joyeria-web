import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// --- CARGA ---
const loadingScreen  = document.getElementById('loading-screen');
const loadingBar     = document.getElementById('loader-bar');
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

// --- HELPERS ---
function setVisibility(el, opacity, clickable = false) {
    if(!el) return;
    el.style.opacity       = opacity;
    el.style.pointerEvents = clickable ? 'all' : 'none';
    el.style.visibility    = opacity <= 0 ? 'hidden' : 'visible';
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function linearMap(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }

// --- DOM ---
const aboutSection   = document.getElementById('about-section');
const contactSection = document.getElementById('contact-section');

// ─────────────────────────────────────────────────────────────────
// NAVEGACIÓN POR SECCIONES
// HOME=0  ABOUT=1  ORDER=2
// ─────────────────────────────────────────────────────────────────
const SECTION_SP  = [0.04, 0.50, 1.00];
const LERP_SPEED  = 0.032;
let targetSection = 0;
let virtualSP     = 0.04;
let isTransitioning = false;

window.goToSection = function(idx) {
    idx = Math.max(0, Math.min(2, idx));
    targetSection = idx;
    updateDots();
    updateHeader();
    updateArrows();
    if(header.classList.contains('menu-open')) toggleMenu();
};
window.nextSection = function() { goToSection(targetSection + 1); };
window.prevSection = function() { goToSection(targetSection - 1); };
window.navigate    = function(idx) { goToSection(idx); };

function updateDots() {
    document.querySelectorAll('.section-dot').forEach((d, i) => {
        d.classList.toggle('active', i === targetSection);
    });
}
function updateHeader() {
    if(targetSection === 0) header.classList.remove('scrolled');
    else header.classList.add('scrolled');
}
function updateArrows() {
    const up   = document.getElementById('arrow-up');
    const down = document.getElementById('arrow-down');
    if(up)   up.classList.toggle('disabled',  targetSection === 0);
    if(down) down.classList.toggle('disabled', targetSection === 2);
}

// Teclado
document.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowDown' || e.key === 'ArrowRight') nextSection();
    if(e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  prevSection();
});

// ─────────────────────────────────────────────────────────────────
// TIMELINE  (sp: 0 → 1)
//  HOME   0.00 – 0.10
//  ABOUT  0.10 – 0.60
//  ORDER  0.60 – 1.00
// ─────────────────────────────────────────────────────────────────
function updateTimeline(sp) {

    if(sp <= 0.10) {
        // HOME
        homeGroup.position.y = 0; aboutGroup.position.y = -60; contactGroup.position.y = -200;
        homeGroup.visible = true;
        setVisibility(aboutSection,  0);
        setVisibility(contactSection, 0);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.10 && sp <= 0.22) {
        // HOME → ABOUT (transición)
        const p = linearMap(sp, 0.10, 0.22);
        homeGroup.position.y  = p * 80;
        aboutGroup.position.y = -60 + p * 60;
        setVisibility(aboutSection, 0);
        setVisibility(contactSection, 0);
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.22 && sp <= 0.35) {
        // ABOUT aparece
        homeGroup.position.y = 80; aboutGroup.position.y = 0; contactGroup.position.y = -200;
        const o = linearMap(sp, 0.22, 0.32);
        setVisibility(aboutSection, o);
        setVisibility(contactSection, 0);
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.35 && sp <= 0.55) {
        // ABOUT fijo
        aboutGroup.position.y = 0; contactGroup.position.y = -200;
        setVisibility(aboutSection, 1);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.55 && sp <= 0.65) {
        // ABOUT sale
        const pOut = linearMap(sp, 0.55, 0.65);
        aboutGroup.position.y = 0;
        setVisibility(aboutSection, 1 - pOut);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        scene.background = new THREE.Color(0x000000);

    } else {
        // ORDER
        homeGroup.visible = false;
        setVisibility(aboutSection, 0);

        const pForm = linearMap(sp, 0.70, 1.0);
        const eased = 1 - Math.pow(1 - pForm, 5);

        scene.background = new THREE.Color(0x000000);

        if(contactSection) {
            contactSection.style.visibility    = 'visible';
            contactSection.style.opacity       = '1';
            contactSection.style.pointerEvents = pForm > 0.3 ? 'all' : 'none';
            const slideUp = (1 - eased) * 180;
            contactSection.style.transform = `translateY(${slideUp}vh)`;
            if(pForm > 0.5) contactSection.classList.add('active');
            else contactSection.classList.remove('active');
        }
        contactGroup.position.y = -200 + eased * 200;
    }
}

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
    floatYBase: 1.5, floatSpeed: 0.8, floatAmp: 0.15
};

const scene  = new THREE.Scene();
scene.background = new THREE.Color(params.bgColor);
const camera = new THREE.PerspectiveCamera(params.camFOV, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(params.camPos.x, params.camPos.y, params.camPos.z);
camera.rotation.set(params.camRot.x, params.camRot.y, params.camRot.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const crystalMat = new THREE.MeshPhysicalMaterial({ color: params.cryColor, transmission: params.cryTrans, opacity: params.cryOp, metalness: 0, roughness: 0, ior: params.cryIOR, thickness: params.cryThick, dispersion: params.cryDisp, envMapIntensity: params.cryEnv, specularIntensity: params.crySpec, clearcoat: params.cryClear, side: THREE.DoubleSide, flatShading: params.cryFlat, attenuationColor: new THREE.Color(params.cryAttColor), attenuationDistance: params.cryAttDist });
const silverMat  = new THREE.MeshPhysicalMaterial({ color: params.metalColor, metalness: params.metalMetal, roughness: params.metalRough, envMapIntensity: 1 });

const light1 = new THREE.PointLight(params.lightColor, params.lightInt);
light1.position.set(20, 20, 20); scene.add(light1);
const light2 = new THREE.PointLight(params.lightColor, params.lightInt);
light2.position.set(-20, -10, 20); scene.add(light2);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader(dracoLoader);

new EXRLoader().load('./studio_v2.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.offset.x = params.envRot;
    scene.environment = texture; scene.environmentIntensity = params.envInt;
});

const homeGroup    = new THREE.Group(); scene.add(homeGroup);
const aboutGroup   = new THREE.Group(); scene.add(aboutGroup); aboutGroup.position.y = -60;
const contactGroup = new THREE.Group(); scene.add(contactGroup); contactGroup.position.y = -200;

const ringContainer   = new THREE.Group();
const stonesContainer = new THREE.Group();
homeGroup.add(ringContainer); homeGroup.add(stonesContainer);
ringContainer.position.y = params.floatYBase;
stonesContainer.position.set(4, params.floatYBase, -1);
ringContainer.rotation.y = 0.2; stonesContainer.rotation.y = 0.5;

const individualStones  = [];

loader.load('./Alianza.glb', (gltf) => {
    const ring = gltf.scene;
    const box = new THREE.Box3().setFromObject(ring);
    ring.position.sub(box.getCenter(new THREE.Vector3()));
    ring.traverse(c => { if(c.isMesh) { c.geometry.deleteAttribute('color'); c.material = c.material.name.includes('Material.001') ? crystalMat : silverMat; }});
    ringContainer.add(ring); ring.rotation.set(1.17, 0, -0.03);
});

loader.load('./piedras.glb', (gltf) => {
    const stones = gltf.scene;
    stones.traverse(c => {
        if(c.isMesh) {
            c.material = crystalMat;
            c.userData = { rotSpeed: 0.003 + Math.random()*0.005, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() };
            individualStones.push(c);
        }
    });
    stonesContainer.add(stones);
    stones.rotation.set(0.7, -0.2, 0);
    stones.scale.set(0.5, 0.5, 0.5);
});

// --- PARALLAX HOME Y SWIPE MÓVIL ---
let mouseXNorm = 0, mouseYNorm = 0;
let touchStartY = 0;

// Parallax con el ratón
document.addEventListener('mousemove', (e) => {
    mouseXNorm = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseYNorm = (e.clientY / window.innerHeight) * 2 - 1;
});

// Parallax con el dedo (y registro de inicio para swipe)
document.addEventListener('touchstart', (e) => { 
    if(e.touches.length > 0) {
        touchStartY = e.touches[0].clientY; 
        mouseXNorm = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
        mouseYNorm = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        mouseXNorm = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
        mouseYNorm = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
}, { passive: true });

// Deslizar (Swipe) para cambiar de sección
document.addEventListener('touchend', (e) => {
    if (targetSection === 0) return; // Bloquear swipe si estamos en la sección Home
    
    const diff = touchStartY - e.changedTouches[0].clientY;
    if(Math.abs(diff) > 60) {
        if(diff > 0) nextSection();
        else prevSection();
    }
}, { passive: true });


// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    // Lerp virtualSP
    const targetSP = SECTION_SP[targetSection];
    virtualSP += (targetSP - virtualSP) * LERP_SPEED;
    if(Math.abs(virtualSP - targetSP) < 0.0003) {
        virtualSP = targetSP;
        isTransitioning = false;
    } else {
        isTransitioning = true;
    }

    updateTimeline(virtualSP);

    // Parallax home
    if(targetSection === 0 && homeGroup.visible) {
        homeGroup.rotation.y += (mouseXNorm * 0.12 - homeGroup.rotation.y) * 0.04;
        homeGroup.rotation.x += (mouseYNorm * 0.07 - homeGroup.rotation.x) * 0.04;
    } else {
        homeGroup.rotation.y += (0 - homeGroup.rotation.y) * 0.08;
        homeGroup.rotation.x += (0 - homeGroup.rotation.x) * 0.08;
    }

    ringContainer.position.y = params.floatYBase + Math.sin(time * params.floatSpeed) * params.floatAmp;

    individualStones.forEach(s => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));

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