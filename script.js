document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // REFS GLOBALES
    // =========================================================
    const theLight = document.getElementById('the-light');
    const darkRealm = document.getElementById('dark-realm');
    const lightRealm = document.getElementById('light-realm');
    const flashOverlay = document.getElementById('flash-overlay');
    const thankYou = document.getElementById('thank-you-popup');

    // =========================================================
    // DETECCION DE RETORNO TRAS ENVIO (?sent=1) -> POPUP DIRECTO
    // =========================================================
    const params = new URLSearchParams(window.location.search);
    const cameFromSubmit = params.get('sent') === '1';

    function showThankYou() {
        if (!thankYou) return;
        thankYou.classList.add('is-visible');
        thankYou.setAttribute('aria-hidden', 'false');
        const closeHandler = () => {
            thankYou.classList.remove('is-visible');
            thankYou.setAttribute('aria-hidden', 'true');
            document.removeEventListener('click', closeHandler, true);
            document.removeEventListener('touchstart', closeHandler, true);
            document.removeEventListener('keydown', keyHandler, true);
        };
        const keyHandler = (ev) => {
            if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') closeHandler();
        };
        setTimeout(() => {
            document.addEventListener('click', closeHandler, true);
            document.addEventListener('touchstart', closeHandler, true);
            document.addEventListener('keydown', keyHandler, true);
        }, 50);
    }

    if (cameFromSubmit) {
        if (darkRealm) darkRealm.classList.add('hidden');
        if (lightRealm) lightRealm.classList.remove('hidden');
        document.body.style.overflow = 'auto';
        history.replaceState({}, '', window.location.pathname + '#contact');
        setTimeout(showThankYou, 300);
    }

    // =========================================================
    // TRANSICION DARK -> LIGHT REALM
    // =========================================================
    if (theLight) {
        theLight.addEventListener('click', () => {
            if (flashOverlay) flashOverlay.classList.add('flash-in');
            setTimeout(() => {
                if (darkRealm) darkRealm.classList.add('hidden');
                if (lightRealm) lightRealm.classList.remove('hidden');
                document.body.style.overflow = 'auto';
                window.dispatchEvent(new Event('resize'));
                if (flashOverlay) {
                    flashOverlay.classList.remove('flash-in');
                    flashOverlay.classList.add('flash-out');
                }
            }, 1000);
        });
    }

    // =========================================================
    // STARFIELD
    // =========================================================
    const starfield = document.getElementById('starfield');
    if (starfield) {
        starfield.style.zIndex = '3';
        starfield.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const star = document.createElement('div');
            star.style.position = 'absolute';
            star.style.borderRadius = '50%';
            star.style.left = (Math.random() * 100) + '%';
            star.style.top = (Math.random() * 100) + '%';
            const size = Math.random() < 0.90 ? (Math.random() * 0.6 + 0.5) : (Math.random() + 0.5);
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            const colors = ['#ffffff', '#e0f7fa', '#fff3e0', '#ffd700'];
            star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            star.style.boxShadow = '0 0 ' + size + 'px ' + (size/2) + 'px ' + star.style.backgroundColor;
            star.style.animation = 'none';
            star.style.opacity = (Math.random() * 0.6 + 0.4).toString();
            starfield.appendChild(star);
        }
    }

    // =========================================================
    // HALO RODS
    // =========================================================
    const rods = document.querySelectorAll('.arrow-halo-rod');
    function randomizeRod(rod) {
        rod.style.setProperty('--rod-angle', (Math.random() * 360) + 'deg');
        rod.style.setProperty('--rod-len', (Math.floor(Math.random() * 81) + 30) + 'px');
    }
    rods.forEach(randomizeRod);
    rods.forEach(rod => rod.addEventListener('animationiteration', () => randomizeRod(rod)));

    // =========================================================
    // CARRUSEL
    // =========================================================
    const track = document.getElementById('ring-carousel');
    const ringBg = document.getElementById('ring-bg');
    const ringTitle = document.getElementById('ring-title');
    const ringDesc = document.getElementById('ring-desc');

    if (window.innerWidth <= 1024) {
        const mv = document.getElementById('main-mobile-viewer');
        if (mv) { mv.bloom = false; mv.enableBloom = false; mv.postProcessing = false; }
    }

    const ringData = [
        { title: "True Beauty Awaits", desc: "You have crossed the threshold. Now, let us forge something eternal, unique, and unconditionally yours.", img: "1.png" },
        { title: "The Celestial Cut", desc: "A masterpiece born from stardust. Its immaculate facets reflect the light of a thousand galaxies, crafted for the bold.", img: "2.png" },
        { title: "Eternal Heritage", desc: "Where classic elegance meets modern bespoke design. A timeless silhouette that carries the weight of a lifelong promise.", img: "3.png" },
        { title: "Obsidian Echo", desc: "A harmonious blend of rare metals and brilliant stones. This piece captures the quiet power and enduring grace of true craftsmanship.", img: "4.png" }
    ];

    let currentIndex = 0;
    const totalSlides = 4;

    function updateCarousel() {
        if (!track) return;
        if (window.innerWidth > 1024) {
            track.style.transition = 'none';
            track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
        } else {
            track.style.transform = 'none';
        }
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
        const dDot = document.querySelectorAll('.nav-desk .dot')[currentIndex];
        const mDot = document.querySelectorAll('.nav-mob .dot')[currentIndex];
        if (dDot) dDot.classList.add('active');
        if (mDot) mDot.classList.add('active');
        if (ringTitle) ringTitle.innerText = ringData[currentIndex].title;
        if (ringDesc) ringDesc.innerText = ringData[currentIndex].desc;
        if (ringBg) ringBg.src = ringData[currentIndex].img;
    }

    const goPrev = () => { currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalSlides - 1; updateCarousel(); };
    const goNext = () => { currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0; updateCarousel(); };

    const pD = document.querySelector('.prev-btn');
    const nD = document.querySelector('.next-btn');
    if (pD) pD.addEventListener('click', goPrev);
    if (nD) nD.addEventListener('click', goNext);

    const pM = document.querySelector('.prev-btn-mob');
    const nM = document.querySelector('.next-btn-mob');
    if (pM) pM.addEventListener('click', goPrev);
    if (nM) nM.addEventListener('click', goNext);

    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            if (!isNaN(idx) && currentIndex !== idx) { currentIndex = idx; updateCarousel(); }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 1024 && track) {
            track.style.transform = 'none';
        } else if (track) {
            track.style.transition = 'none';
            track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
        }
    });

    // =========================================================
    // SMOOTH SCROLL
    // =========================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // =========================================================
    // SCROLL ANIMATIONS
    // =========================================================
    const animElements = document.querySelectorAll('.scroll-anim');
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.2 });
    document.querySelectorAll('.process-step.scroll-anim').forEach((step, idx) => {
        step.style.transitionDelay = (idx * 0.15) + 's';
    });
    animElements.forEach(el => scrollObserver.observe(el));

    // =========================================================
    // CONFIGURAR _next DINAMICAMENTE (vuelve a esta misma URL)
    // =========================================================
    const nextInput = document.getElementById('next-input');
    if (nextInput) {
        const base = window.location.origin + window.location.pathname;
        nextInput.value = base + '?sent=1#contact';
    }

    // =========================================================
    // GESTOR DE ARCHIVOS (lista visible + eliminar)
    // FormSubmit acepta cualquier formato. Limite practico Gmail ~25 MB.
    // =========================================================
    const MAX_FILES = 5;
    const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    const formError = document.getElementById('form-error');
    const submitBtn = document.getElementById('submit-btn');
    let selectedFiles = [];

    function totalBytes() { return selectedFiles.reduce((a, f) => a + f.size, 0); }
    function fmtSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    function showError(msg) { if (formError) formError.textContent = msg; }
    function clearError() { if (formError) formError.textContent = ''; }

    function syncInputFiles() {
        if (!fileInput) return;
        const dt = new DataTransfer();
        selectedFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
    }

    function renderFileList() {
        if (!fileList) return;
        fileList.innerHTML = '';
        selectedFiles.forEach((file) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML =
                '<span class="file-name" title="' + file.name + '">' + file.name + ' <em>(' + fmtSize(file.size) + ')</em></span>' +
                '<span class="remove-file" data-name="' + file.name + '">&#10005;</span>';
            fileList.appendChild(item);
        });
        fileList.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const name = ev.currentTarget.getAttribute('data-name');
                selectedFiles = selectedFiles.filter(f => f.name !== name);
                renderFileList();
                syncInputFiles();
                clearError();
            });
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const incoming = Array.from(e.target.files);
            clearError();
            for (const f of incoming) {
                if (selectedFiles.length >= MAX_FILES) { showError('Maximum ' + MAX_FILES + ' files allowed.'); break; }
                if (selectedFiles.some(x => x.name === f.name && x.size === f.size)) continue;
                if (totalBytes() + f.size > MAX_TOTAL_BYTES) {
                    showError('Total size must stay under ' + fmtSize(MAX_TOTAL_BYTES) + '. Remove a file or use a smaller one.');
                    break;
                }
                selectedFiles.push(f);
            }
            renderFileList();
            syncInputFiles();
        });
    }

    // =========================================================
    // FEEDBACK VISUAL DURANTE EL ENVIO
    // =========================================================
    const form = document.getElementById('bespoke-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            if (!form.checkValidity()) return; // que el navegador muestre los errores nativos
            if (totalBytes() > MAX_TOTAL_BYTES) {
                e.preventDefault();
                showError('Total size must stay under ' + fmtSize(MAX_TOTAL_BYTES) + '.');
                return;
            }
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('is-loading');
                const lbl = submitBtn.querySelector('.submit-label');
                if (lbl) lbl.textContent = 'Sending...';
            }
            // El form se envia nativamente a FormSubmit y vuelve via _next
        });
    }

});
