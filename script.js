import * as THREE from 'three'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
function setVisibility(el, opacity, blur, clickable = false) {
    if(!el) return;
    el.style.opacity       = opacity;
    el.style.filter        = `blur(${blur}px)`;
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

// Swipe móvil
let touchStartY = 0;
document.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', (e) => {
    const diff = touchStartY - e.changedTouches[0].clientY;
    if(Math.abs(diff) > 60) {
        if(diff > 0) nextSection();
        else prevSection();
    }
}, { passive: true });

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
        setVisibility(aboutSection,  0, 20);
        setVisibility(contactSection, 0, 30);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        if(diamondMat) diamondMat.opacity = 1;
        if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.10 && sp <= 0.22) {
        // HOME → ABOUT (transición)
        const p = linearMap(sp, 0.10, 0.22);
        homeGroup.position.y  = p * 80;
        aboutGroup.position.y = -60 + p * 60;
        setVisibility(aboutSection, 0, 20);
        setVisibility(contactSection, 0, 30);
        if(diamondMat) diamondMat.opacity = 1;
        if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.22 && sp <= 0.35) {
        // ABOUT aparece
        homeGroup.position.y = 80; aboutGroup.position.y = 0; contactGroup.position.y = -200;
        const o = linearMap(sp, 0.22, 0.32);
        setVisibility(aboutSection, o, Math.max(20 - o*20, 0));
        setVisibility(contactSection, 0, 30);
        if(diamondMat) diamondMat.opacity = 1;
        if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.35 && sp <= 0.55) {
        // ABOUT fijo
        aboutGroup.position.y = 0; contactGroup.position.y = -200;
        setVisibility(aboutSection, 1, 0);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        if(diamondMat) diamondMat.opacity = 1;
        if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);

    } else if(sp > 0.55 && sp <= 0.65) {
        // ABOUT sale
        const pOut = linearMap(sp, 0.55, 0.65);
        aboutGroup.position.y = 0;
        setVisibility(aboutSection, 1 - pOut, pOut * 20);
        if(contactSection) { contactSection.classList.remove('active'); contactSection.style.transform = 'translateY(100vh)'; }
        if(diamondMat) diamondMat.opacity = 1 - pOut;
        if(diamondBase) diamondBase.visible = true;
        scene.background = new THREE.Color(0x000000);

    } else {
        // ORDER
        homeGroup.visible = false;
        if(diamondBase) diamondBase.visible = false;
        setVisibility(aboutSection, 0, 0);

        const pForm = linearMap(sp, 0.70, 1.0);
        const eased = 1 - Math.pow(1 - pForm, 5);

        scene.background = new THREE.Color(0x000000);

        if(contactSection) {
            contactSection.style.visibility    = 'visible';
            contactSection.style.opacity       = '1';
            contactSection.style.filter        = 'none';
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
    floatYBase: 1.5, floatSpeed: 0.8, floatAmp: 0.15,
    diaPosY: 0, diaRotX: 0, diaRotY: 1.6, diaRotZ: 0.911061,
    diaAnimSpeed: 0.208, diaFloatSpeed: 0.438, diaFloatAmp: 0.3,
    d_Thick: 0, d_AbsDist: 5.88, d_Env: 1.5, d_Spec: 4.1,
    d_Tint: 0xffffff, d_AbsColor: 0xededed, d_Trans: 1.0, d_IOR: 2.626, d_Disp: 0.8
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
const diamondMat = new THREE.MeshPhysicalMaterial({ color: params.d_Tint, transmission: params.d_Trans, opacity: 1, metalness: 0, roughness: 0, ior: params.d_IOR, thickness: params.d_Thick, dispersion: params.d_Disp, envMapIntensity: params.d_Env, specularIntensity: params.d_Spec, side: THREE.DoubleSide, flatShading: false, attenuationColor: new THREE.Color(params.d_AbsColor), attenuationDistance: params.d_AbsDist, transparent: true });
const silverMat  = new THREE.MeshPhysicalMaterial({ color: params.metalColor, metalness: params.metalMetal, roughness: params.metalRough, envMapIntensity: 1 });

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
const contactStones     = [];
const interactiveMeshes = [];
const PORTFOLIO_URLS    = ['./portfolio-1.html', './portfolio-2.html', './portfolio-3.html'];

// Textura placeholder generada con canvas
function makePlaceholderTexture(colorA, colorB, label) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(212,175,55,0.7)'; ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 16px serif'; ctx.textAlign = 'center';
    ctx.fillText('PORTFOLIO', 128, 114);
    ctx.font = '13px serif';
    ctx.fillText(label, 128, 140);
    return new THREE.CanvasTexture(canvas);
}

const placeholderTextures = [
    makePlaceholderTexture('rgba(212,175,55,0.95)', 'rgba(60,35,5,0.98)',  '— I —'),
    makePlaceholderTexture('rgba(160,210,255,0.95)','rgba(5,20,70,0.98)',  '— II —'),
    makePlaceholderTexture('rgba(255,160,160,0.95)','rgba(70,5,15,0.98)',  '— III —'),
];

function makeInteractiveMat() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfff8e0,
        transmission: params.cryTrans, opacity: params.cryOp,
        metalness: 0, roughness: 0,
        ior: params.cryIOR, thickness: params.cryThick,
        dispersion: params.cryDisp,
        envMapIntensity: params.cryEnv * 1.5,
        specularIntensity: params.crySpec,
        clearcoat: 0.6,
        side: THREE.DoubleSide,
        attenuationColor: new THREE.Color(0xffe090),
        attenuationDistance: params.cryAttDist * 0.6,
        emissive: new THREE.Color(0xd4af37),
        emissiveIntensity: 0.10,
    });
}

loader.load('./Alianza.glb', (gltf) => {
    const ring = gltf.scene;
    const box = new THREE.Box3().setFromObject(ring);
    ring.position.sub(box.getCenter(new THREE.Vector3()));
    ring.traverse(c => { if(c.isMesh) { c.geometry.deleteAttribute('color'); c.material = c.material.name.includes('Material.001') ? crystalMat : silverMat; }});
    ringContainer.add(ring); ring.rotation.set(1.17, 0, -0.03);
});

let diamondBase = null;
loader.load('./diamante.glb', (gltf) => {
    const diamond = gltf.scene;
    const box = new THREE.Box3().setFromObject(diamond);
    diamond.position.sub(box.getCenter(new THREE.Vector3()));
    diamond.traverse(c => { if(c.isMesh) c.material = diamondMat; });
    aboutGroup.add(diamond); diamondBase = diamond;
});

loader.load('./piedras.glb', (gltf) => {
    const stones = gltf.scene;
    const allMeshes = [];
    stones.traverse(c => {
        if(c.isMesh) {
            c.material = crystalMat;
            c.userData = { rotSpeed: 0.003 + Math.random()*0.005, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() };
            individualStones.push(c);
            allMeshes.push(c);
        }
    });
    stonesContainer.add(stones);
    stones.rotation.set(0.7, -0.2, 0);
    stones.scale.set(0.5, 0.5, 0.5);

    // Seleccionar 3 meshes repartidos
    const cnt = allMeshes.length;
    const picks = cnt >= 3
        ? [allMeshes[0], allMeshes[Math.floor(cnt/2)], allMeshes[cnt-1]]
        : allMeshes.slice(0, Math.min(3, cnt));

    picks.forEach((mesh, i) => {
        mesh.material = makeInteractiveMat();
        mesh.userData.isInteractive = true;
        mesh.userData.portfolioIndex = i;
        interactiveMeshes.push(mesh);

        // Calcular tamaño del mesh para el plano interior
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        const sz = bb.getSize(new THREE.Vector3());
        const planeSize = Math.min(sz.x, sz.y, sz.z) * 0.85;

        const imgPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(planeSize, planeSize),
            new THREE.MeshBasicMaterial({
                map: placeholderTextures[i],
                transparent: true,
                opacity: 0.80,
                depthWrite: false,
            })
        );
        const center = bb.getCenter(new THREE.Vector3());
        imgPlane.position.copy(center);
        mesh.add(imgPlane);
        mesh.userData.imgPlane = imgPlane;
    });

    // Clone para contact group
    const clone = stones.clone();
    clone.traverse(c => {
        if(c.isMesh) {
            c.material = crystalMat;
            c.userData = { rotSpeed: 0.001 + Math.random()*0.004, axis: new THREE.Vector3(Math.random(),1,Math.random()).normalize() };
            contactStones.push(c);
        }
    });
    clone.position.set(0, 0, -15); clone.scale.set(0.8, 0.8, 0.8); clone.rotation.set(0.5, 0.5, 0);
    contactGroup.add(clone);
});

// ─── RAYCASTING ───
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();
let   hoveredMesh = null;

renderer.domElement.addEventListener('mousemove', (e) => {
    if(targetSection !== 0) return;
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if(hits.length > 0) {
        const h = hits[0].object;
        if(hoveredMesh !== h) {
            if(hoveredMesh) hoveredMesh.material.emissiveIntensity = 0.10;
            hoveredMesh = h;
            hoveredMesh.material.emissiveIntensity = 0.35;
            renderer.domElement.style.cursor = 'pointer';
        }
    } else {
        if(hoveredMesh) { hoveredMesh.material.emissiveIntensity = 0.10; hoveredMesh = null; }
        renderer.domElement.style.cursor = 'default';
    }
});

renderer.domElement.addEventListener('click', (e) => {
    if(targetSection !== 0) return;
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if(hits.length > 0) {
        window.open(PORTFOLIO_URLS[hits[0].object.userData.portfolioIndex], '_blank');
    }
});

renderer.domElement.addEventListener('touchend', (e) => {
    if(targetSection !== 0) return;
    const t = e.changedTouches[0];
    mouse.x =  (t.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if(hits.length > 0) {
        window.open(PORTFOLIO_URLS[hits[0].object.userData.portfolioIndex], '_blank');
    }
}, { passive: true });

// --- PARALLAX HOME ---
let mouseXNorm = 0, mouseYNorm = 0;
document.addEventListener('mousemove', (e) => {
    mouseXNorm = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseYNorm = (e.clientY / window.innerHeight) * 2 - 1;
});

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

    if(diamondBase) {
        diamondBase.rotation.x = params.diaRotX + Math.sin(time * 0.2) * 0.05;
        diamondBase.rotation.y = params.diaRotY + time * params.diaAnimSpeed;
        diamondBase.rotation.z = params.diaRotZ;
        diamondBase.position.y = params.diaPosY + Math.sin(time * params.diaFloatSpeed) * params.diaFloatAmp;
    }

    individualStones.forEach(s => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));
    contactStones.forEach(s    => s.rotateOnAxis(s.userData.axis, s.userData.rotSpeed));

    // Pulso de brillo en los 3 diamantes interactivos
    interactiveMeshes.forEach((m, i) => {
        if(m === hoveredMesh) return;
        m.material.emissiveIntensity = 0.06 + Math.abs(Math.sin(time * 0.8 + i * 1.2)) * 0.10;
    });
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