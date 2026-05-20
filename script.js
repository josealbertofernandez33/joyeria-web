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
    const textOverlay = document.getElementById('image-text-overlay');
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

    // --- NUEVO SISTEMA DE ARCHIVOS ROBUSTO SIN AJAX ---
    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    let selectedFiles = [];

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            if (selectedFiles.length + files.length > 5) {
                alert("Maximum 5 files allowed.");
                syncFiles(); 
                return;
            }

            files.forEach(file => {
                if (!selectedFiles.some(f => f.name === file.name)) {
                    selectedFiles.push(file);
                    
                    const item = document.createElement('div');
                    item.className = 'file-item';
                    item.innerHTML = `
                        <span>${file.name}</span>
                        <span class="remove-file" onclick="removeFile(this, '${file.name}')">✕</span>
                    `;
                    fileList.appendChild(item);
                }
            });
            
            syncFiles();
        });
    }

    function syncFiles() {
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        if(fileInput) fileInput.files = dataTransfer.files;
    }

    window.removeFile = (element, fileName) => {
        selectedFiles = selectedFiles.filter(f => f.name !== fileName);
        element.parentElement.remove();
        syncFiles();
    };

});