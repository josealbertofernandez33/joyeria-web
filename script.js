document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GENERAR ESPACIO VIVO ---
    const starfield = document.getElementById('starfield');
    const totalStars = 200; 

    for (let i = 0; i < totalStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        const size = Math.random() < 0.95 ? (Math.random() * 1.5 + 0.5) : (Math.random() * 3 + 1.5);
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        const colors = ['#ffffff', '#e0f7fa', '#fff3e0'];
        star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const duration = 1.5 + Math.random() * 4;
        const delay = -(Math.random() * 5); 
        star.style.animation = `twinkle-js ${duration}s infinite alternate ${delay}s ease-in-out`;

        if (starfield) {
            starfield.appendChild(star);
        }
    }

    // --- 2. LÓGICA DEL DESTELLO ---
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

    // --- 3. LÓGICA DEL CARRUSEL Y FLECHAS ---
    const track = document.getElementById('ring-carousel');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    const ringTitle = document.getElementById('ring-title');
    const ringDesc = document.getElementById('ring-desc');
    const ringBg = document.getElementById('ring-bg');
    
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
        track.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[currentIndex]) {
            dots[currentIndex].classList.add('active');
        }

        if (ringTitle) ringTitle.classList.add('text-fade-hide');
        if (ringDesc) ringDesc.classList.add('text-fade-hide');
        if (ringBg) ringBg.classList.add('text-fade-hide'); 
        
        setTimeout(() => {
            if (ringTitle) ringTitle.innerText = ringData[currentIndex].title;
            if (ringDesc) ringDesc.innerText = ringData[currentIndex].desc;
            if (ringBg) ringBg.src = ringData[currentIndex].img; 
            
            if (ringTitle) ringTitle.classList.remove('text-fade-hide');
            if (ringDesc) ringDesc.classList.remove('text-fade-hide');
            if (ringBg) ringBg.classList.remove('text-fade-hide'); 
        }, 300); 
    }

    // Funciones de las flechas
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
            } else {
                currentIndex = totalSlides - 1; // Vuelve al final
            }
            updateCarousel();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentIndex < totalSlides - 1) {
                currentIndex++;
            } else {
                currentIndex = 0; // Vuelve al principio
            }
            updateCarousel();
        });
    }

    // Botones de puntos inferiores
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            if (currentIndex !== idx) {
                currentIndex = idx;
                updateCarousel();
            }
        });
    });

    // --- 4. ANIMACIÓN AL SCROLL ---
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

    // --- 5. INPUT DE ARCHIVOS ---
    const fileInput = document.getElementById('attachments');
    const fileLabel = document.getElementById('file-label');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const numFiles = e.target.files.length;
            if (numFiles === 1) {
                fileLabel.innerHTML = `<span class="upload-icon">✓</span> ${e.target.files[0].name}`;
                fileLabel.style.borderColor = fileLabel.style.color = "var(--gold)";
            } else if (numFiles > 1) {
                fileLabel.innerHTML = `<span class="upload-icon">✓</span> ${numFiles} files selected`;
                fileLabel.style.borderColor = fileLabel.style.color = "var(--gold)";
            } else {
                fileLabel.innerHTML = `<span class="upload-icon">+</span> Attach Images or PDFs`;
                fileLabel.style.borderColor = "#ccc";
                fileLabel.style.color = "#666";
            }
        });
    }
});