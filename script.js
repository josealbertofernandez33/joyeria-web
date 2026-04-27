// =====================================================================
// ASCANIO JEWELRY · 3D Atelier
// Refactor: carga progresiva, móvil ligero, tone-mapping cinematográfico
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader }   from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }  from 'three/addons/loaders/DRACOLoader.js';
import { EXRLoader }    from 'three/addons/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ── DETECCIÓN DE DISPOSITIVO ─────────────────────────────────────────
const ua = navigator.userAgent || '';
let isMobile      = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(ua);
const isLowEnd    = isMobile || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── ELEMENTOS DOM ────────────────────────────────────────────────────
const loadingScreen  = document.getElementById('loading-screen');
const loadingBar     = document.getElementById('loader-bar');
const header         = document.getElementById('main-header');
const menuToggle     = document.getElementById('menu-toggle');
const homeUI         = document.getElementById('home-ui');
const aboutSection   = document.getElementById('about-section');
const contactSection = document.getElementById('contact-section');

// ── REVELADO TEMPRANO DE LA UI ───────────────────────────────────────
// La UI aparece tan pronto como el DOM/CSS están listos (no esperamos al 3D).
function revealUI() {
    document.body.classList.add('loaded');
}
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    requestAnimationFrame(revealUI);
} else {
    document.addEventListener('DOMContentLoaded', revealUI, { once: true });
}

// ── LOADING MANAGER (solo para el progreso del 3D) ───────────────────
const loadingManager = new THREE.LoadingManager();
let dismissed = false;
function dismissLoader() {
    if (dismissed || !loadingScreen) return;
    dismissed = true;
    loadingScreen.style.opacity = '0';
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 900);
}
loadingManager.onProgress = (_, loaded, total) => {
    if (loadingBar) loadingBar.style.width = (loaded / total * 100) + '%';
};
loadingManager.onLoad = dismissLoader;
loadingManager.onError = (url) => { console.warn('Asset failed', url); };
// Failsafe: si algo falla, ocultamos el loader a los 4s pase lo que pase.
setTimeout(dismissLoader, 4000);

// ── HELPERS ──────────────────────────────────────────────────────────
function setVisibility(el, opacity, clickable = false) {
    if (!el) return;
    el.style.opacity       = opacity;
    el.style.pointerEvents = clickable ? 'all' : 'none';
    el.style.visibility    = opacity <= 0 ? 'hidden' : 'visible';
}
const clamp     = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const linearMap = (v, a, b)   => clamp((v - a) / (b - a), 0, 1);

// ── MENÚ ─────────────────────────────────────────────────────────────
window.toggleMenu = function () {
    const open = header.classList.toggle('menu-open');
    menuToggle.textContent = open ? 'CLOSE' : 'MENU +';
    menuToggle.setAttribute('aria-expanded', open);
};

// ── NAVEGACIÓN POR SECCIONES ─────────────────────────────────────────
const SECTION_SP = [0.04, 0.50, 1.00];
const LERP_SPEED = prefersReducedMotion ? 0.2 : 0.032;
let targetSection = 0;
let virtualSP     = 0.04;

window.goToSection = (idx) => {
    targetSection = clamp(idx | 0, 0, 2);
    updateDots();
    updateHeader();
    updateArrows();
    if (header.classList.contains('menu-open')) toggleMenu();
};
window.nextSection = () => goToSection(targetSection + 1);
window.prevSection = () => goToSection(targetSection - 1);
window.navigate    = (idx) => goToSection(idx);

function updateDots() {
    document.querySelectorAll('.section-dot').forEach((d, i) => {
        d.classList.toggle('active', i === targetSection);
        d.setAttribute('aria-selected', i === targetSection);
    });
}
function updateHeader() {
    header.classList.toggle('scrolled', targetSection !== 0);
}
function updateArrows() {
    const up   = document.getElementById('arrow-up');
    const down = document.getElementById('arrow-down');
    if (up)   up.classList.toggle('disabled',   targetSection === 0);
    if (down) down.classList.toggle('disabled', targetSection === 2);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') nextSection();
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft'  || e.key === 'PageUp')   prevSection();
});

// ── TIMELINE 0 → 1 (HOME / ABOUT / ORDER) ────────────────────────────
function updateTimeline(sp) {
    const black = scene.background; // reutilizamos referencia, color negro fijo

    if (sp <= 0.10) {
        homeGroup.position.y = 0; aboutGroup.position.y = -60; contactGroup.position.y = -200;
        homeGroup.visible = true;
        setVisibility(homeUI, 1, true);
        setVisibility(aboutSection, 0);
        setVisibility(contactSection, 0);
        if (contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
    } else if (sp <= 0.22) {
        const p = linearMap(sp, 0.10, 0.22);
        homeGroup.position.y  = p * 80;
        aboutGroup.position.y = -60 + p * 60;
        setVisibility(homeUI, 1 - p, false);
        setVisibility(aboutSection, 0);
        setVisibility(contactSection, 0);
    } else if (sp <= 0.35) {
        homeGroup.position.y = 80; aboutGroup.position.y = 0; contactGroup.position.y = -200;
        const o = linearMap(sp, 0.22, 0.32);
        setVisibility(homeUI, 0, false);
        setVisibility(aboutSection, o);
        setVisibility(contactSection, 0);
    } else if (sp <= 0.55) {
        aboutGroup.position.y = 0; contactGroup.position.y = -200;
        setVisibility(homeUI, 0, false);
        setVisibility(aboutSection, 1);
        if (contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
    } else if (sp <= 0.65) {
        const pOut = linearMap(sp, 0.55, 0.65);
        aboutGroup.position.y = 0;
        setVisibility(homeUI, 0, false);
        setVisibility(aboutSection, 1 - pOut);
        if (contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
    } else {
        homeGroup.visible = false;
        setVisibility(homeUI, 0, false);
        setVisibility(aboutSection, 0);

        const pForm = linearMap(sp, 0.70, 1.0);
        const eased = 1 - Math.pow(1 - pForm, 5);

        if (contactSection) {
            contactSection.style.visibility    = 'visible';
            contactSection.style.opacity       = '1';
            contactSection.style.pointerEvents = pForm > 0.3 ? 'all' : 'none';
            contactSection.style.transform     = `translateY(${(1 - eased) * 180}vh)`;
            contactSection.classList.toggle('active', pForm > 0.5);
        }
        contactGroup.position.y = -200 + eased * 200;
    }
}

// ── ARCHIVOS ADJUNTOS ────────────────────────────────────────────────
const fileInput       = document.getElementById('attachment');
const fileListDisplay = document.getElementById('file-list');
const dt = new DataTransfer();
const MAX_TOTAL = 25 * 1024 * 1024;

if (fileInput) {
    fileInput.addEventListener('change', function () {
        let total = 0;
        for (let i = 0; i < dt.items.length; i++) total += dt.items[i].getAsFile().size;
        for (const f of this.files) {
            if (f.size + total > MAX_TOTAL) { alert('Total limit 25MB exceeded.'); continue; }
            dt.items.add(f); total += f.size;
        }
        this.files = dt.files;
        renderFileList();
    });
}
function renderFileList() {
    if (!fileListDisplay) return;
    fileListDisplay.innerHTML = '';
    Array.from(dt.files).forEach((f, i) => {
        const item = document.createElement('div'); item.className = 'file-item';
        const name = document.createElement('span'); name.className = 'file-name'; name.textContent = f.name;
        const btn  = document.createElement('button'); btn.type = 'button'; btn.className = 'file-remove'; btn.textContent = '×'; btn.setAttribute('aria-label', `Remove ${f.name}`);
        btn.onclick = () => { dt.items.remove(i); fileInput.files = dt.files; renderFileList(); };
        item.append(name, btn);
        fileListDisplay.appendChild(item);
    });
}

// ── THREE.JS ─────────────────────────────────────────────────────────
const params = {
    bgColor: 0x000000,
    camFOV: 45, camPos: { x: 0, y: 0, z: 90 }, camRot: { x: 0, y: 0, z: -0.2 },
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
const camera = new THREE.PerspectiveCamera(params.camFOV, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(params.camPos.x, params.camPos.y, params.camPos.z);
camera.rotation.set(params.camRot.x, params.camRot.y, params.camRot.z);

const renderer = new THREE.WebGLRenderer({
    antialias: !isLowEnd,
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowEnd ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── MATERIALES ───────────────────────────────────────────────────────
const crystalMat = new THREE.MeshPhysicalMaterial({
    color: params.cryColor,
    transmission: params.cryTrans,
    opacity: params.cryOp,
    metalness: 0,
    roughness: 0,
    ior: params.cryIOR,
    thickness: params.cryThick,
    dispersion: isLowEnd ? 0 : params.cryDisp,
    envMapIntensity: params.cryEnv,
    specularIntensity: params.crySpec,
    clearcoat: params.cryClear,
    side: THREE.DoubleSide,
    flatShading: params.cryFlat,
    attenuationColor: new THREE.Color(params.cryAttColor),
    attenuationDistance: params.cryAttDist
});
const silverMat = new THREE.MeshPhysicalMaterial({
    color: params.metalColor,
    metalness: params.metalMetal,
    roughness: params.metalRough,
    envMapIntensity: 1
});

// ── LUCES ────────────────────────────────────────────────────────────
const light1 = new THREE.PointLight(params.lightColor, params.lightInt);
light1.position.set(20, 20, 20); scene.add(light1);
const light2 = new THREE.PointLight(params.lightColor, params.lightInt);
light2.position.set(-20, -10, 20); scene.add(light2);

// ── ENVIRONMENT (estrategia adaptativa) ──────────────────────────────
// Móvil/low-end: RoomEnvironment generado en runtime (0 KB descarga).
// Desktop: studio_small.exr (410 KB) en background sin bloquear modelos.
if (isLowEnd) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = params.envInt;
} else {
    new EXRLoader().load('./studio_small.exr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.offset.x = params.envRot;
        scene.environment = texture;
        scene.environmentIntensity = params.envInt;
    }, undefined, () => {
        // Fallback si la red falla
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = params.envInt;
    });
}

// ── CARGADORES GLB CON DRACO ─────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader(dracoLoader);

// ── GRUPOS DE ESCENA ─────────────────────────────────────────────────
const homeGroup    = new THREE.Group(); scene.add(homeGroup);
const aboutGroup   = new THREE.Group(); scene.add(aboutGroup);   aboutGroup.position.y = -60;
const contactGroup = new THREE.Group(); scene.add(contactGroup); contactGroup.position.y = -200;

const ringContainer   = new THREE.Group();
const stonesContainer = new THREE.Group();
homeGroup.add(ringContainer, stonesContainer);
ringContainer.position.y = params.floatYBase;
stonesContainer.position.set(4, params.floatYBase, -1);
ringContainer.rotation.y = 0.2;
stonesContainer.rotation.y = 0.5;

const individualStones = [];

loader.load('./Alianza.glb', (gltf) => {
    const ring = gltf.scene;
    const box = new THREE.Box3().setFromObject(ring);
    ring.position.sub(box.getCenter(new THREE.Vector3()));
    ring.traverse(c => {
        if (c.isMesh) {
            c.geometry.deleteAttribute('color');
            c.material = c.material.name && c.material.name.includes('Material.001') ? crystalMat : silverMat;
            c.castShadow = false; c.receiveShadow = false;
            c.frustumCulled = true;
        }
    });
    ringContainer.add(ring);
    ring.rotation.set(1.17, 0, -0.03);
});

loader.load('./piedras.glb', (gltf) => {
    const stones = gltf.scene;
    stones.traverse(c => {
        if (c.isMesh) {
            c.material = crystalMat;
            c.userData = {
                rotSpeed: 0.003 + Math.random() * 0.005,
                axis: new THREE.Vector3(Math.random(), 1, Math.random()).normalize()
            };
            individualStones.push(c);
        }
    });
    stonesContainer.add(stones);
    stones.rotation.set(0.7, -0.2, 0);
    stones.scale.set(0.5, 0.5, 0.5);
});

// ── PARALLAX HOME / TOUCH ────────────────────────────────────────────
let mouseXNorm = 0, mouseYNorm = 0;

document.addEventListener('mousemove', (e) => {
    mouseXNorm = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseYNorm = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

document.addEventListener('touchstart', (e) => {
    if (e.touches.length) {
        mouseXNorm = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
        mouseYNorm = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (e.touches.length) {
        mouseXNorm = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
        mouseYNorm = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
}, { passive: true });

// ── SCROLL CON RUEDA (PC) ────────────────────────────────────────────
let wheelCooldown = false;
document.addEventListener('wheel', (e) => {
    if (isMobile || wheelCooldown) return;
    wheelCooldown = true;
    if (e.deltaY > 0) nextSection(); else prevSection();
    setTimeout(() => { wheelCooldown = false; }, 900);
}, { passive: true });

// ── PAUSAR ANIMACIÓN EN BACKGROUND TAB ───────────────────────────────
let pageVisible = true;
document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
});

// ── LOOP PRINCIPAL ───────────────────────────────────────────────────
const targetFPS = isLowEnd ? 40 : 60;
const frameInterval = 1000 / targetFPS;
let lastFrame = 0;

function animate(now = 0) {
    requestAnimationFrame(animate);
    if (!pageVisible) return;
    if (now - lastFrame < frameInterval) return;
    lastFrame = now;

    const time = now * 0.001;

    const targetSP = SECTION_SP[targetSection];
    virtualSP += (targetSP - virtualSP) * LERP_SPEED;
    if (Math.abs(virtualSP - targetSP) < 0.0003) virtualSP = targetSP;

    updateTimeline(virtualSP);

    if (targetSection === 0 && homeGroup.visible) {
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

// ── RESIZE (debounced) ───────────────────────────────────────────────
let resizeTO;
window.addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => {
        isMobile = window.innerWidth <= 768;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowEnd ? 1.5 : 2));
    }, 120);
});

// ── FORMULARIO PRINCIPAL ─────────────────────────────────────────────
const form      = document.getElementById('contact-form');
const statusMsg = document.getElementById('form-status');
const submitBtn = form?.querySelector('.submit-btn');
const modal     = document.getElementById('success-modal');

window.addEventListener('click', (e) => {
    if (modal?.classList.contains('visible') && !e.target.closest('.success-content')) {
        modal.classList.remove('visible');
    }
});

form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orig = submitBtn.textContent;
    submitBtn.textContent = 'SENDING...';
    submitBtn.style.opacity = '0.5';
    submitBtn.disabled = true;
    statusMsg.style.display = 'none';

    const formData = new FormData(form);
    formData.delete('attachment');
    Array.from(dt.files).forEach((f, i) => formData.append(`attachment-${i + 1}`, f));

    try {
        const res = await fetch(form.action, {
            method: form.method,
            body: formData,
            headers: { Accept: 'application/json' }
        });
        if (res.ok) {
            modal.classList.add('visible');
            form.reset();
            if (dt && dt.items) dt.items.clear();
            renderFileList();
            // Disparar conversión a GTM
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'commission_submit' });
        } else {
            const data = await res.json().catch(() => ({}));
            statusMsg.textContent = data.errors ? data.errors.map(x => x.message).join(', ') : 'Oops! Problem submitting form.';
            statusMsg.style.color = '#ff4444';
            statusMsg.style.display = 'block';
        }
    } catch {
        statusMsg.textContent = 'Network error. Please try again.';
        statusMsg.style.color = '#ff4444';
        statusMsg.style.display = 'block';
    } finally {
        submitBtn.textContent = orig;
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
    }
});

// ── PORTFOLIO FORM ───────────────────────────────────────────────────
const portfolioForm = document.getElementById('portfolio-form');
portfolioForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn   = this.querySelector('.portfolio-btn');
    const input = this.querySelector('.portfolio-input');
    btn.textContent = '...';
    try {
        const fd = new FormData(this);
        await fetch(this.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        btn.textContent = '✓';
        input.value = '';
        input.placeholder = 'REQUEST SENT';
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'portfolio_request' });
        setTimeout(() => { btn.textContent = 'REQUEST'; input.placeholder = 'Enter your email to unlock'; }, 3000);
    } catch {
        btn.textContent = 'RETRY';
    }
});
