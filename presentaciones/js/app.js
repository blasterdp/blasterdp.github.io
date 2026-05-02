// Configuración de las presentaciones disponibles
const presentations = [
    {
        id: 'Presentación_Architecture_of_Holiness',
        title: 'Arquitectura de la Santidad',
        description: '',
        cover: 'slides/Presentación_Architecture_of_Holiness/01.webp',
        slides: Array.from({length: 13}, (_, i) => `slides/Presentación_Architecture_of_Holiness/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'Presentación_Código_de_Santidad',
        title: 'Código de Santidad',
        description: '',
        cover: 'slides/Presentación_Código_de_Santidad/01.webp',
        slides: Array.from({length: 13}, (_, i) => `slides/Presentación_Código_de_Santidad/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'LEPRA_HACER_VISIBLE_LO_INVISIBLE',
        title: 'LEPRA HACER VISIBLE LO INVISIBLE - Jazak VeEmatz',
        description: '',
        cover: 'slides/LEPRA_HACER_VISIBLE_LO_INVISIBLE/01.webp',
        slides: Array.from({length: 73}, (_, i) => `slides/LEPRA_HACER_VISIBLE_LO_INVISIBLE/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'Presentasión_CONSTRUIR_UNA_FE_VISIBLE',
        title: 'CONSTRUIR UNA FE VISIBLE - Jazak VeEmatz',
        description: '',
        cover: 'slides/Presentasión_CONSTRUIR_UNA_FE_VISIBLE/01.webp',
        slides: Array.from({length: 45}, (_, i) => `slides/Presentasión_CONSTRUIR_UNA_FE_VISIBLE/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'Presentación_Edificando_el_Templo_Interior',
        title: 'Edificando el Templo Interior',
        description: 'Edificando el Templo Interior basado en la parashá 26 Sheminí.',
        cover: 'slides/Presentación_Edificando_el_Templo_Interior/01.webp',
        slides: Array.from({length: 14}, (_, i) => `slides/Presentación_Edificando_el_Templo_Interior/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'Presentación_Discernimiento_sagrado',
        title: 'Disernimiento Sagrado',
        description: 'Disernimiento Sagrado basado en la parashá 26 Sheminí.',
        cover: 'slides/Presentación_Discernimiento_sagrado/01.webp',
        slides: Array.from({length: 13}, (_, i) => `slides/Presentación_Discernimiento_sagrado/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'Presentación_Anatomía_de_la_redención',
        title: 'Anatomía de la redención',
        description: 'La arquitectura del Alma.',
        cover: 'slides/Presentación_Anatomía_de_la_redención/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/Presentación_Anatomía_de_la_redención/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'Planos_del_Tabernáculo_Espiritual',
        title: 'Planos del Tabernáculo Espiritual',
        description: 'La arquitectura del Alma.',
        cover: 'slides/Planos_del_Tabernáculo_Espiritual/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/Planos_del_Tabernáculo_Espiritual/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'LEVANTANDO_NUESTRA_VIDA_ESPIRITUAL',
        title: 'LEVANTANDO NUESTRA VIDA ESPIRITUAL - Jazak VeEmatz',
        description: 'La arquitectura del Alma.',
        cover: 'slides/LEVANTANDO_NUESTRA_VIDA_ESPIRITUAL/01.webp',
        slides: Array.from({length: 30}, (_, i) => `slides/LEVANTANDO_NUESTRA_VIDA_ESPIRITUAL/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'pekudei',
        title: 'El Plan Divino',
        description: 'Estudio bíblico sobre el Plan divino en el Mishkan.',
        cover: 'slides/pekudei/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/pekudei/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'la_profecía_de_las_12_tribus',
        title: 'La Profecía de las 12 Tribus',
        description: 'Estudio bíblico de las 12 tribus.',
        cover: 'slides/la_profecía_de_las_12_tribus/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/la_profecía_de_las_12_tribus/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'el_mesias_revelado_en_el_mishkan',
        title: 'El Mesías Revelado en el Mishkán',
        description: 'Estudio bíblico de la parashá Vayakhel',
        cover: 'slides/el_mesias_revelado_en_el_mishkan/01.webp',
        slides: Array.from({length: 14}, (_, i) => `slides/el_mesias_revelado_en_el_mishkan/${String(i + 1).padStart(2, '0')}.webp`)
    },
    {
        id: 'ki-tiza',
        title: 'Ki Tiza',
        description: 'Estudio bíblico de la parashá Ki Tiza',
        cover: 'slides/ki_tiza_El_Sello_del_Eterno/01.webp',
        slides: Array.from({length: 15}, (_, i) => `slides/ki_tiza_El_Sello_del_Eterno/${String(i + 1).padStart(2, '0')}.webp`)
    },
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
