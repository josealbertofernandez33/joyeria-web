document.addEventListener('DOMContentLoaded', () => {

    const theLight = document.getElementById('the-light');
    const darkRealm = document.getElementById('dark-realm');
    const lightRealm = document.getElementById('light-realm');
    const flashOverlay = document.getElementById('flash-overlay');

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

    const starfield = document.getElementById('starfield');
    if (starfield) {
        starfield.style.zIndex = '3';
        starfield.innerHTML = '';

        const totalStars = 30;
        const sizeBase = 1;

        for (let i = 0; i < totalStars; i++) {
            const star = document.createElement('div');
            star.style.position = 'absolute';
            star.style.borderRadius = '50%';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;

            const size = Math.random() < 0.90 ? (Math.random() * sizeBase * 0.6 + 0.5) : (Math.random() * sizeBase + sizeBase/2);
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;

            const colors = ['#ffffff', '#e0f7fa', '#fff3e0', '#ffd700'];
            star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            star.style.boxShadow = `0 0 ${size}px ${size/2}px ${star.style.backgroundColor}`;

            star.style.animation = 'none';
            star.style.opacity = (Math.random() * 0.6 + 0.4).toString();

            starfield.appendChild(star);
        }
    }

    const rods = document.querySelectorAll('.arrow-halo-rod');
    const maxRodLen = 110;
    const minRodLen = 30;

    function randomizeRod(rod) {
        const newAngle = Math.random() * 360;
        const newLen = Math.floor(Math.random() * (maxRodLen - minRodLen + 1)) + minRodLen;
        rod.style.setProperty('--rod-angle', `${newAngle}deg`);
        rod.style.setProperty('--rod-len', `${newLen}px`);
    }

    rods.forEach(randomizeRod);

    rods.forEach(rod => {
        rod.addEventListener('animationiteration', () => {
            randomizeRod(rod);
        });
    });

    const track = document.getElementById('ring-carousel');
    const ringBg = document.getElementById('ring-bg');
    const ringTitle = document.getElementById('ring-title');
    const ringDesc = document.getElementById('ring-desc');

    if (window.innerWidth <= 1024) {
        const mobileViewer = document.getElementById('main-mobile-viewer');
        if(mobileViewer) {
            mobileViewer.bloom = false;
            mobileViewer.enableBloom = false;
            mobileViewer.postProcessing = false;
        }
    }

    const ringData = [
        {
            title: "True Beauty Awaits",
            desc: "You have crossed the threshold. Now, let us forge something eternal, unique, and unconditionally yours.",
            img: "1.png"
        },
        {
            title: "The Celestial Cut",
            desc: "A masterpiece born from stardust. Its immaculate facets reflect the light of a thousand galaxies, crafted for the bold.",
            img: "2.png"
        },
        {
            title: "Eternal Heritage",
            desc: "Where classic elegance meets modern bespoke design. A timeless silhouette that carries the weight of a lifelong promise.",
            img: "3.png"
        },
        {
            title: "Obsidian Echo",
            desc: "A harmonious blend of rare metals and brilliant stones. This piece captures the quiet power and enduring grace of true craftsmanship.",
            img: "4.png"
        }
    ];

    let currentIndex = 0;
    const totalSlides = 4;

    function updateCarousel() {
        if (!track) return;

        if (window.innerWidth > 1024) {
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
        } else {
            track.style.transform = 'none';
        }

        document.querySelectorAll('.dot').forEach(dot => dot.classList.remove('active'));
        document.querySelectorAll('.nav-desk .dot')[currentIndex]?.classList.add('active');
        document.querySelectorAll('.nav-mob .dot')[currentIndex]?.classList.add('active');

        if (ringTitle) ringTitle.innerText = ringData[currentIndex].title;
        if (ringDesc) ringDesc.innerText = ringData[currentIndex].desc;
        if (ringBg) ringBg.src = ringData[currentIndex].img;
    }

    function goPrev() {
        if (currentIndex > 0) currentIndex--;
        else currentIndex = totalSlides - 1;
        updateCarousel();
    }

    function goNext() {
        if (currentIndex < totalSlides - 1) currentIndex++;
        else currentIndex = 0;
        updateCarousel();
    }

    const prevBtnDesk = document.querySelector('.prev-btn');
    const nextBtnDesk = document.querySelector('.next-btn');
    if (prevBtnDesk) prevBtnDesk.addEventListener('click', goPrev);
    if (nextBtnDesk) nextBtnDesk.addEventListener('click', goNext);

    const prevBtnMob = document.querySelector('.prev-btn-mob');
    const nextBtnMob = document.querySelector('.next-btn-mob');
    if (prevBtnMob) prevBtnMob.addEventListener('click', goPrev);
    if (nextBtnMob) nextBtnMob.addEventListener('click', goNext);

    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            if (!isNaN(idx) && currentIndex !== idx) {
                currentIndex = idx;
                updateCarousel();
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 1024 && track) {
            track.style.transform = 'none';
        } else if (track) {
            track.style.transition = 'none';
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    const animElements = document.querySelectorAll('.scroll-anim');
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.2 });

    document.querySelectorAll('.process-step.scroll-anim').forEach((step, index) => {
        step.style.transitionDelay = `${index * 0.15}s`;
    });
    animElements.forEach(el => scrollObserver.observe(el));

    // =========================================================
    // GESTOR DE ARCHIVOS (selección y validación)
    // =========================================================
    const MAX_FILES = 5;
    const MAX_TOTAL_BYTES = 9 * 1024 * 1024; // 9 MB de margen, Web3Forms tope 10 MB
    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    const formError = document.getElementById('form-error');
    let selectedFiles = [];

    function totalBytes() {
        return selectedFiles.reduce((acc, f) => acc + f.size, 0);
    }

    function fmtSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function renderFileList() {
        if (!fileList) return;
        fileList.innerHTML = '';
        selectedFiles.forEach((file) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <span class="file-name" title="${file.name}">${file.name} <em>(${fmtSize(file.size)})</em></span>
                <span class="remove-file" data-name="${file.name}">&#10005;</span>
            `;
            fileList.appendChild(item);
        });
        fileList.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const name = ev.currentTarget.getAttribute('data-name');
                selectedFiles = selectedFiles.filter(f => f.name !== name);
                renderFileList();
                syncFiles();
                clearError();
            });
        });
    }

    function syncFiles() {
        if (!fileInput) return;
        const dt = new DataTransfer();
        selectedFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
    }

    function showError(msg) {
        if (formError) formError.textContent = msg;
    }
    function clearError() {
        if (formError) formError.textContent = '';
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const incoming = Array.from(e.target.files);
            clearError();

            for (const f of incoming) {
                if (selectedFiles.some(x => x.name === f.name && x.size === f.size)) continue;
                if (selectedFiles.length >= MAX_FILES) {
                    showError(`Maximum ${MAX_FILES} files allowed.`);
                    break;
                }
                if (totalBytes() + f.size > MAX_TOTAL_BYTES) {
                    showError(`Total attachment size must stay under ${fmtSize(MAX_TOTAL_BYTES)}.`);
                    break;
                }
                selectedFiles.push(f);
            }
            renderFileList();
            syncFiles();
        });
    }

    // =========================================================
    // ENVÍO DEL FORMULARIO VÍA AJAX (Web3Forms)
    // =========================================================
    const form = document.getElementById('bespoke-form');
    const submitBtn = document.getElementById('submit-btn');
    const thankYou = document.getElementById('thank-you-popup');

    function setSubmitting(isSubmitting) {
        if (!submitBtn) return;
        submitBtn.disabled = isSubmitting;
        submitBtn.classList.toggle('is-loading', isSubmitting);
    }

    function showThankYou() {
        if (!thankYou) return;
        thankYou.classList.add('is-visible');
        thankYou.setAttribute('aria-hidden', 'false');

        // Cierre al tocar/click en cualquier punto de la pantalla
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
        // Capturamos para que cualquier click cierre sin disparar otras acciones
        setTimeout(() => {
            document.addEventListener('click', closeHandler, true);
            document.addEventListener('touchstart', closeHandler, true);
            document.addEventListener('keydown', keyHandler, true);
        }, 50);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            // Validación nativa
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Verificación rápida de tamaño total
            if (totalBytes() > MAX_TOTAL_BYTES) {
                showError(`Total attachment size must stay under ${fmtSize(MAX_TOTAL_BYTES)}.`);
                return;
            }

            // Construir FormData manualmente para controlar el campo de archivos
            const fd = new FormData();
            fd.append('access_key', form.querySelector('[name="access_key"]').value);
            fd.append('subject', form.querySelector('[name="subject"]').value);
            fd.append('from_name', form.querySelector('[name="from_name"]').value);
            fd.append('email', form.querySelector('#email').value.trim());
            fd.append('message', form.querySelector('#message').value.trim());
            fd.append('botcheck', form.querySelector('[name="botcheck"]').checked ? 'true' : '');

            // Adjuntos: Web3Forms acepta múltiples archivos en el mismo campo "attachment"
            selectedFiles.forEach((file) => {
                fd.append('attachment', file, file.name);
            });

            setSubmitting(true);

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: fd
                });

                let data = null;
                try { data = await res.json(); } catch (_) { /* respuesta no-JSON */ }

                if (res.ok && data && data.success) {
                    form.reset();
                    selectedFiles = [];
                    renderFileList();
                    syncFiles();
                    showThankYou();
                } else {
                    const msg = (data && (data.message || data.error)) || `Submission failed (HTTP ${res.status}). Please try again.`;
                    showError(msg);
                }
            } catch (err) {
                showError('Network error. Please check your connection and try again.');
                console.error('[contact form] submit error:', err);
            } finally {
                setSubmitting(false);
            }
        });
    }

});
