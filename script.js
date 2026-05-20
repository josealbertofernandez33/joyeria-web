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

    function goPrev() { currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalSlides - 1; updateCarousel(); }
    function goNext() { currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0; updateCarousel(); }

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
                targetElement.scrollIntoView({ behavior: 'smooth' });
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
    // GESTOR DE ARCHIVOS + COMPRESIÓN DE IMÁGENES EN CLIENTE
    // =========================================================
    const MAX_FILES = 5;
    const MAX_TOTAL_BYTES = 4.5 * 1024 * 1024;      // 4.5 MB tras compresión (límite real Cloudflare/Web3Forms ~5 MB)
    const MIN_FILE_BUDGET = 200 * 1024;             // presupuesto mínimo por archivo: 200 KB
    // Pasos de compresión adaptativa (calidad, dim máx). Se prueban en orden hasta caber en el presupuesto.
    const COMPRESS_STEPS = [
        { quality: 0.88, maxDim: 2400 },
        { quality: 0.82, maxDim: 2200 },
        { quality: 0.75, maxDim: 1900 },
        { quality: 0.68, maxDim: 1600 },
        { quality: 0.60, maxDim: 1400 },
        { quality: 0.52, maxDim: 1200 },
        { quality: 0.45, maxDim: 1000 }
    ];

    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    const formError = document.getElementById('form-error');
    let selectedFiles = [];   // { file, originalSize, compressed }

    function totalBytes() {
        return selectedFiles.reduce((acc, f) => acc + f.file.size, 0);
    }

    function fmtSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function showError(msg) { if (formError) formError.textContent = msg; }
    function clearError() { if (formError) formError.textContent = ''; }

    // Carga un File como HTMLImageElement
    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            img.src = url;
        });
    }

    // Codifica el canvas a JPEG con calidad dada → Blob
    function canvasToBlob(canvas, quality) {
        return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    }

    // Comprime una imagen para que quepa en targetBytes. Recorre COMPRESS_STEPS hasta lograrlo.
    // Si ni el paso más agresivo cabe, devuelve el resultado más pequeño obtenido.
    async function compressImage(file, targetBytes) {
        try {
            const img = await loadImage(file);
            let bestBlob = null;

            for (const step of COMPRESS_STEPS) {
                let { width, height } = img;
                const scale = Math.min(1, step.maxDim / Math.max(width, height));
                width = Math.max(1, Math.round(width * scale));
                height = Math.max(1, Math.round(height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff'; // fondo blanco por si el PNG tenía transparencia
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const blob = await canvasToBlob(canvas, step.quality);
                if (!blob) continue;

                if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
                if (blob.size <= targetBytes) { bestBlob = blob; break; }
            }

            if (!bestBlob) return null;
            // Si no mejora respecto al original (caso raro: JPEG ya muy optimizado), devolvemos null
            if (bestBlob.size >= file.size) return null;

            const baseName = file.name.replace(/\.[^.]+$/, '');
            return new File([bestBlob], baseName + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        } catch (err) {
            console.warn('[compress] falló, se usa original:', file.name, err);
            return null;
        }
    }

    function renderFileList() {
        if (!fileList) return;
        fileList.innerHTML = '';
        selectedFiles.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            const sizeNow = fmtSize(entry.file.size);
            const meta = entry.compressed
                ? `<em>(${sizeNow} · optimized from ${fmtSize(entry.originalSize)})</em>`
                : `<em>(${sizeNow})</em>`;
            item.innerHTML = `
                <span class="file-name" title="${entry.file.name}">${entry.file.name} ${meta}</span>
                <span class="remove-file" data-name="${entry.file.name}">&#10005;</span>
            `;
            fileList.appendChild(item);
        });
        fileList.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const name = ev.currentTarget.getAttribute('data-name');
                selectedFiles = selectedFiles.filter(e => e.file.name !== name);
                renderFileList();
                clearError();
            });
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const incoming = Array.from(e.target.files);
            e.target.value = ''; // reset para permitir re-seleccionar el mismo archivo si se eliminó
            clearError();

            for (const original of incoming) {
                if (selectedFiles.length >= MAX_FILES) {
                    showError(`Maximum ${MAX_FILES} files allowed.`);
                    break;
                }

                // Presupuesto dinámico para este archivo: lo que queda repartido entre slots libres
                const remainingBudget = MAX_TOTAL_BYTES - totalBytes();
                const remainingSlots = MAX_FILES - selectedFiles.length;
                const fileBudget = Math.max(MIN_FILE_BUDGET, Math.floor(remainingBudget / remainingSlots));

                let fileToUse = original;
                let wasCompressed = false;

                const isImage = original.type.startsWith('image/') && original.type !== 'image/gif';
                if (isImage) {
                    // Comprimir si el archivo supera su presupuesto O si es claramente grande
                    if (original.size > fileBudget || original.size > 400 * 1024) {
                        const compressed = await compressImage(original, fileBudget);
                        if (compressed) {
                            fileToUse = compressed;
                            wasCompressed = true;
                        }
                    }
                }

                // Evitar duplicados por nombre
                const baseName = fileToUse.name;
                if (selectedFiles.some(en => en.file.name === baseName)) continue;

                if (totalBytes() + fileToUse.size > MAX_TOTAL_BYTES) {
                    const overflow = (totalBytes() + fileToUse.size) - MAX_TOTAL_BYTES;
                    showError(`"${original.name}" still exceeds the available space by ${fmtSize(overflow)}. Try removing another file or use a smaller image.`);
                    break;
                }

                selectedFiles.push({
                    file: fileToUse,
                    originalSize: original.size,
                    compressed: wasCompressed
                });
            }
            renderFileList();
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

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (totalBytes() > MAX_TOTAL_BYTES) {
                showError(`Total attachment size must stay under ${fmtSize(MAX_TOTAL_BYTES)}.`);
                return;
            }

            const fd = new FormData();
            fd.append('access_key', form.querySelector('[name="access_key"]').value);
            fd.append('subject', form.querySelector('[name="subject"]').value);
            fd.append('from_name', form.querySelector('[name="from_name"]').value);
            fd.append('email', form.querySelector('#email').value.trim());
            fd.append('message', form.querySelector('#message').value.trim());
            fd.append('botcheck', form.querySelector('[name="botcheck"]').checked ? 'true' : '');

            selectedFiles.forEach((entry) => {
                fd.append('attachment', entry.file, entry.file.name);
            });

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
                    selectedFiles = [];
                    renderFileList();
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
            document.addEventListener('touchstart', closeHandler, true);
            document.addEventListener('keydown', keyHandler, true);
        }, 50);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (totalBytes() > MAX_TOTAL_BYTES) {
                showError(`Total attachment size must stay under ${fmtSize(MAX_TOTAL_BYTES)}.`);
                return;
            }

            const fd = new FormData();
            fd.append('access_key', form.querySelector('[name="access_key"]').value);
            fd.append('subject', form.querySelector('[name="subject"]').value);
            fd.append('from_name', form.querySelector('[name="from_name"]').value);
            fd.append('email', form.querySelector('#email').value.trim());
            fd.append('message', form.querySelector('#message').value.trim());
            fd.append('botcheck', form.querySelector('[name="botcheck"]').checked ? 'true' : '');

            selectedFiles.forEach((entry) => {
                fd.append('attachment', entry.file, entry.file.name);
            });

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
                    selectedFiles = [];
                    renderFileList();
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
            fd.append('subject', form.querySelector('[name="subject"]').value);
            fd.append('from_name', form.querySelector('[name="from_name"]').value);
            fd.append('email', form.querySelector('#email').value.trim());
            fd.append('message', form.querySelector('#message').value.trim());
            fd.append('botcheck', form.querySelector('[name="botcheck"]').checked ? 'true' : '');

            selectedFiles.forEach((entry) => {
                fd.append('attachment', entry.file, entry.file.name);
            });

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
                    selectedFiles = [];
                    renderFileList();
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
