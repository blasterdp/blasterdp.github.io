let currentPresentation = null;
let currentSlideIndex = 0;
let slideInterval = null;
const SLIDE_DURATION = 5000; // 5 segundos por defecto

// Elementos del DOM
const slideshowContainer = document.getElementById('slideshow');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const slideInfo = document.getElementById('slide-info');

// Inicializar el slideshow con una presentación
function initSlideshow(presentation) {
    currentPresentation = presentation;
    currentSlideIndex = 0;
    
    // Limpiar slideshow anterior
    stopSlideshow();
    slideshowContainer.innerHTML = '';
    
    // Crear elementos de las diapositivas
    presentation.slides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.className = 'slide' + (index === 0 ? ' active' : '');
        slideElement.innerHTML = `<img src="${slide}" alt="Diapositiva ${index + 1}">`;
        slideshowContainer.appendChild(slideElement);
    });
    
    // Actualizar información
    updateSlideInfo();
    
    // Iniciar reproducción automática
    startSlideshow();
}

// Mostrar una diapositiva específica
function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    
    // Validar índice
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    
    // Ocultar todas las diapositivas
    slides.forEach(slide => slide.classList.remove('active'));
    
    // Mostrar la diapositiva actual
    slides[index].classList.add('active');
    currentSlideIndex = index;
    
    // Actualizar información
    updateSlideInfo();
    
    // Reiniciar el temporizador de avance automático
    resetTimer();
}

// Diapositiva anterior
function prevSlide() {
    showSlide(currentSlideIndex - 1);
}

// Siguiente diapositiva
function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

// Actualizar la información de la diapositiva actual
function updateSlideInfo() {
    const totalSlides = currentPresentation ? currentPresentation.slides.length : 0;
    slideInfo.textContent = `${currentSlideIndex + 1} / ${totalSlides}`;
}

// Iniciar reproducción automática
function startSlideshow() {
    stopSlideshow();
    slideInterval = setInterval(nextSlide, SLIDE_DURATION);
}

// Detener la reproducción automática
function stopSlideshow() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

// Reiniciar el temporizador de avance automático
function resetTimer() {
    if (slideInterval) {
        startSlideshow();
    }
}

// Event listeners para los controles
prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prevSlide();
});

nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nextSlide();
});

// Navegación con teclado
document.addEventListener('keydown', (e) => {
    if (modal.style.display !== 'flex') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            prevSlide();
            break;
        case 'ArrowRight':
        case ' ':
            nextSlide();
            break;
        case 'Escape':
            closeModal();
            break;
    }
});

// Navegación por toques en móviles
let touchStartX = 0;
let touchEndX = 0;

slideshowContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

slideshowContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const swipeThreshold = 50; // Mínimo de píxeles para considerar un deslizamiento
    
    if (touchStartX - touchEndX > swipeThreshold) {
        // Deslizamiento hacia la izquierda - Siguiente diapositiva
        nextSlide();
    } else if (touchEndX - touchStartX > swipeThreshold) {
        // Deslizamiento hacia la derecha - Diapositiva anterior
        prevSlide();
    }
}
