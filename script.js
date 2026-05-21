document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // REFS
    // =========================================================
    const theLight = document.getElementById('the-light');
    const darkRealm = document.getElementById('dark-realm');
    const lightRealm = document.getElementById('light-realm');
    const flashOverlay = document.getElementById('flash-overlay');
    const thankYou = document.getElementById('thank-you-popup');

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
            star.style.boxShadow = '0 0 ' + size + 'px ' + (size / 2) + 'px ' + star.style.backgroundColor;
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
    // POPUP DE AGRADECIMIENTO
    // =========================================================
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

    // =========================================================
    // GESTIÓN DE ARCHIVOS
    // =========================================================
    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    let selectedFiles = [];

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (selectedFiles.length + files.length > 5) {
                alert("Maximum 5 files allowed.");
                return;
            }
            files.forEach(file => {
                selectedFiles.push(file);
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `<span>${file.name}</span><span class="remove-file" onclick="removeFile(this, '${file.name}')">✕</span>`;
                fileList.appendChild(item);
            });
            syncFiles();
        });
    }

    window.removeFile = (element, fileName) => {
        selectedFiles = selectedFiles.filter(f => f.name !== fileName);
        element.parentElement.remove();
        syncFiles();
    };

    function syncFiles() {
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        if (fileInput) fileInput.files = dataTransfer.files;
    }

    // =========================================================
    // ENVIO DEL FORMULARIO (TRADICIONAL WEB3FORMS / FORMSUBMIT)
    // =========================================================
    const form = document.getElementById('bespoke-form');
    const submitBtn = document.getElementById('submit-btn');
    const submitLabel = submitBtn ? submitBtn.querySelector('.submit-label') : null;
    const formError = document.getElementById('form-error');

    function showError(msg) { if (formError) formError.textContent = msg; }
    function clearError() { if (formError) formError.textContent = ''; }

    function setSubmitting(isSubmitting) {
        if (!submitBtn) return;
        submitBtn.disabled = isSubmitting;
        submitBtn.classList.toggle('is-loading', isSubmitting);
        if (submitLabel) submitLabel.textContent = isSubmitting ? 'Sending...' : 'Send Request';
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const emailField = document.getElementById('email');
            const messageField = document.getElementById('message');
            const emailVal = emailField.value.trim();
            const messageVal = messageField.value.trim();

            if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                showError('Please enter a valid email address.');
                emailField.focus();
                return;
            }
            if (!messageVal) {
                showError('Please tell me about your idea.');
                messageField.focus();
                return;
            }

            const fd = new FormData();
            fd.append('access_key', form.querySelector('[name="access_key"]').value);
            fd.append('subject', form.querySelector('[name="subject"]').value);
            fd.append('from_name', form.querySelector('[name="from_name"]').value);
            fd.append('email', emailVal);
            fd.append('message', messageVal);
            fd.append('botcheck', form.querySelector('[name="botcheck"]').checked ? 'true' : '');
            
            // Añadir archivos a la carga
            if (fileInput && fileInput.files.length > 0) {
                Array.from(fileInput.files).forEach(file => {
                    fd.append('attachment', file);
                });
            }

            setSubmitting(true);

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: fd
                });

                let data = null;
                try { data = await res.json(); } catch (_) {}

                if (res.ok && data && data.success) {
                    form.reset();
                    selectedFiles = []; // Limpiar lista
                    if(fileList) fileList.innerHTML = '';
                    showThankYou();
                } else {
                    const msg = (data && (data.message || data.error)) || ('Submission failed (HTTP ' + res.status + ').');
                    showError(msg);
                }
            } catch (err) {
                console.error('[contact form] submit error:', err);
                showError('Network error. Please check your connection and try again.');
            } finally {
                setSubmitting(false);
            }
        });
    }

});