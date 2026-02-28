// Configuración de las presentaciones disponibles
const presentations = [
    {
        id: 'tetzave',
        title: 'Tetzavé',
        description: 'Estudio bíblico de la parashá Tetzavé',
        cover: 'slides/tetzave/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/tetzave/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'beshalaj',
        title: 'Beshalaj',
        description: 'Estudio bíblico de la parashá Beshalaj',
        cover: 'slides/beshalaj/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/beshalaj/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'bo',
        title: 'Bo',
        description: 'Estudio bíblico de la parashá Bo',
        cover: 'slides/bo/01.webp',
        slides: Array.from({length: 14}, (_, i) => `slides/bo/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'dia_biblico',
        title: 'Día Bíblico',
        description: 'Presentación del Día Bíblico',
        cover: 'slides/dia_biblico/01.webp',
        slides: Array.from({length: 14}, (_, i) => `slides/dia_biblico/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'estudio_galatas',
        title: 'Estudio de Gálatas',
        description: 'Estudio completo de la carta a los Gálatas',
        cover: 'slides/estudio_galatas/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/estudio_galatas/${String(i + 1).padStart(2, '0')}.webp`)
    },
{
    id: 'mishpatim_normas_divinas',
    title: 'Mishpatim: Normas Divinas',
    description: 'Estudio sobre las leyes divinas',
    cover: 'slides/mishpatim_normas_divinas/01.webp',
    slides: Array.from({length: 14}, (_, i) => `slides/mishpatim_normas_divinas/${String(i + 1).padStart(2, '0')}.webp`)
},
{
    id: 'mishpatim_orden_decretos_transformadores',
    title: 'Mishpatim: Orden y Decretos Transformadores',
    description: 'Estudio sobre los decretos divinos',
    cover: 'slides/mishpatim_orden_decretos_transformadores/01.webp',
    slides: Array.from({length: 12}, (_, i) => `slides/mishpatim_orden_decretos_transformadores/${String(i + 1).padStart(2, '0')}.webp`)
},
{
    id: 'retorno_raices_hebreas',
    title: 'Retorno a las Raíces Hebreas',
    description: 'Estudio sobre el retorno a las raíces de la fe',
    cover: 'slides/retorno_raices_hebreas/01.webp',
    slides: Array.from({length: 14}, (_, i) => `slides/retorno_raices_hebreas/${String(i + 1).padStart(2, '0')}.webp`)
},
    {
        id: 'theruma_2026',
        title: 'Theruma 2026',
        description: 'Estudio sobre la porción de Theruma en 2026',
        cover: 'slides/theruma_2026/01.webp',
        slides: Array.from({length: 14}, (_, i) => `slides/theruma_2026/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'vaera',
        title: 'Vaerá',
        description: 'Estudio bíblico de la parashá Vaerá',
        cover: 'slides/vaera/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/vaera/${String(i + 1).padStart(2, '0')}.webp`)
    },
{
    id: 'yitro_de_esclavos_a_sacerdotes',
    title: 'Yitro: De Esclavos a Sacerdotes',
    description: 'Estudio sobre el llamado sacerdotal',
    cover: 'slides/yitro_de_esclavos_a_sacerdotes/01.webp',
    slides: Array.from({length: 15}, (_, i) => `slides/yitro_de_esclavos_a_sacerdotes/${String(i + 1).padStart(2, '0')}.webp`)
}
];

// Elementos del DOM
const presentationsContainer = document.getElementById('presentations-container');
const modal = document.getElementById('slideshow-modal');
const closeBtn = document.querySelector('.close');

// Mostrar presentaciones disponibles
function displayPresentations() {
    presentationsContainer.innerHTML = presentations.map(presentation => `
        <div class="presentation-card" data-id="${presentation.id}">
            <img src="${presentation.cover}" alt="${presentation.title}" class="preview-image">
            <div class="presentation-info">
                <h3>${presentation.title}</h3>
                <p>${presentation.description}</p>
                <p class="slide-count">${presentation.slides.length} diapositivas</p>
            </div>
        </div>
    `).join('');

    // Agregar event listeners a las tarjetas
    document.querySelectorAll('.presentation-card').forEach(card => {
        card.addEventListener('click', () => {
            const presentationId = card.getAttribute('data-id');
            const presentation = presentations.find(p => p.id === presentationId);
            if (presentation) {
                openSlideshow(presentation);
            }
        });
    });
}

// Abrir el slideshow
function openSlideshow(presentation) {
    // Inicializar el slideshow con la presentación seleccionada
    initSlideshow(presentation);
    // Mostrar el modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Cerrar el modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    // Detener el slideshow al cerrar
    stopSlideshow();
}

// Cerrar al hacer clic fuera del contenido
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Cerrar con la tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Cerrar con el botón
closeBtn.addEventListener('click', closeModal);

// Cargar las presentaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    displayPresentations();
    
    // Precargar imágenes de las presentaciones
    preloadPresentationImages();
});

// Precargar imágenes para mejor rendimiento
function preloadPresentationImages() {
    presentations.forEach(presentation => {
        // Precargar la imagen de portada
        const img = new Image();
        img.src = presentation.cover;
        
        // Precargar las primeras 3 imágenes de cada presentación
        presentation.slides.slice(0, 3).forEach(slideSrc => {
            const slideImg = new Image();
            slideImg.src = slideSrc;
        });
    });
}
