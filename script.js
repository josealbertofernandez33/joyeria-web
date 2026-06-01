document.addEventListener('DOMContentLoaded', () => {

    const darkRealm = document.getElementById('dark-realm');
    const lightRealm = document.getElementById('light-realm');
    const flashOverlay = document.getElementById('flash-overlay');
    const thankYou = document.getElementById('thank-you-popup');

    if (darkRealm) {
        darkRealm.addEventListener('click', () => {
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

    const rods = document.querySelectorAll('.arrow-halo-rod');
    function randomizeRod(rod) {
        rod.style.setProperty('--rod-angle', (Math.random() * 360) + 'deg');
        rod.style.setProperty('--rod-len', (Math.floor(Math.random() * 81) + 30) + 'px');
    }
    rods.forEach(randomizeRod);
    rods.forEach(rod => rod.addEventListener('animationiteration', () => randomizeRod(rod)));

    const heroViewer = document.getElementById('main-hero-viewer');
    const swatches = document.querySelectorAll('.swatch');
    
    if(heroViewer) {
        swatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const type = swatch.getAttribute('data-type');
                const color = swatch.getAttribute('data-color');
                
                document.querySelectorAll(`.swatch[data-type="${type}"]`).forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');

                if(type === 'metal') heroViewer.setAttribute('metal-color', color);
                if(type === 'stone') heroViewer.setAttribute('stone-color', color);
            });
        });
    }

    const materialBtns = document.querySelectorAll('.material-btn');
    const explodeBtn = document.querySelector('.action-btn[data-action="explode"]');
    const renderBtn = document.querySelector('.action-btn[data-action="render"]');
    const renderOverlay = document.getElementById('render-overlay');

    if (materialBtns.length > 0 && heroViewer) {
        materialBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                materialBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const matMode = e.target.getAttribute('data-mat');
                heroViewer.setAttribute('material-mode', matMode);
            });
        });
    }

    if (explodeBtn && heroViewer) {
        explodeBtn.addEventListener('click', (e) => {
            const isExploded = explodeBtn.classList.toggle('active');
            heroViewer.setAttribute('explode-mode', isExploded ? 'true' : 'false');
        });
    }

    if (renderBtn && renderOverlay) {
        renderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderOverlay.classList.add('active');
        });

        renderOverlay.addEventListener('click', () => {
            renderOverlay.classList.remove('active');
        });
    }

    const processCarouselTrack = document.getElementById('process-carousel-track');
    const processPrev = document.querySelector('.process-prev');
    const processNext = document.querySelector('.process-next');
    
    if (processPrev && processNext && processCarouselTrack) {
        processPrev.addEventListener('click', () => {
            processCarouselTrack.scrollBy({ left: -350, behavior: 'smooth' });
        });
        processNext.addEventListener('click', () => {
            processCarouselTrack.scrollBy({ left: 350, behavior: 'smooth' });
        });
    }

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
    
    document.querySelectorAll('.process-slide.scroll-anim').forEach((step, idx) => {
        step.style.transitionDelay = (idx * 0.15) + 's';
    });
    animElements.forEach(el => scrollObserver.observe(el));

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
        if (submitLabel) submitLabel.textContent = isSubmitting ? 'Validating...' : 'REQUEST A QUOTE';
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
                showError('Please enter a valid email.');
                emailField.focus();
                return;
            }
            if (!messageVal) {
                showError('Project details are required to evaluate viability.');
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
                    showThankYou();
                } else {
                    const msg = (data && (data.message || data.error)) || ('Server failure (HTTP ' + res.status + ').');
                    showError(msg);
                }
            } catch (err) {
                console.error('[contact form] submit error:', err);
                showError('Network error. Please check your connection.');
            } finally {
                setSubmitting(false);
            }
        });
    }
});