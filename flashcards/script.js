let cards = [];
let currentIndex = 0;
let isFlipped = false;
let isRandomMode = false;
let currentTopic = '';

const card = document.getElementById('card');
const front = card.querySelector('.front');
const back = card.querySelector('.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const randomBtn = document.getElementById('randomMode');
const counter = document.getElementById('counter');
const topicSelector = document.getElementById('topicSelector');

// Función para convertir nombre de archivo a nombre legible
function formatTopicName(filename) {
    return filename
        .replace('flashcards_', '')
        .replace('.csv', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Función para procesar el texto: remover $ y poner en negrita
function formatText(text) {
    // Reemplaza $palabra$ con <strong>palabra</strong>
    return text.replace(/\$([^\$]+)\$/g, '$1');
}

// Cargar lista de temas disponibles
async function loadAvailableTopics() {
    try {
        // Intentar obtener la lista de archivos desde un endpoint
        // Si no está disponible, usaremos una lista predefinida
        const topics = [
            'flashcards_parashá_beshalaj.csv',
            'flashcards_bo_2025.csv',
            'flashcards_estudio_galatas.csv',
            'flashcards_dia_biblico_2.csv',
            'flashcards_vaera.csv'
        ];
        
        populateTopicSelector(topics);
    } catch (error) {
        console.error('Error cargando temas:', error);
        // Usar lista predefinida como fallback
        const topics = [
            'flashcards_parashá_beshalaj.csv',
            'flashcards_bo_2025.csv',
            'flashcards_estudio_galatas.csv',
            'flashcards_dia_biblico_2.csv',
            'flashcards_vaera.csv',
        ];
        populateTopicSelector(topics);
    }
}

// Rellenar el selector con los temas disponibles
function populateTopicSelector(topics) {
    topicSelector.innerHTML = '<option value="">-- Selecciona un tema --</option>';
    topics.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = formatTopicName(filename);
        topicSelector.appendChild(option);
    });
    console.log('Temas cargados:', topics);
}

// Cargar CSV del tema seleccionado
async function loadCSV(filename) {
    if (!filename) {
        cards = [];
        front.textContent = 'Selecciona un tema para comenzar';
        back.textContent = '';
        updateCounter();
        return;
    }

    try {
        currentTopic = filename;
        const response = await fetch(`../tarjetas_variadas/${filename}`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo cargar el archivo`);
        }
        
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        cards = lines.map(line => {
            // Remove leading number and |
            const cleanedLine = line.replace(/^\d+\s*\|\s*/, '');
            const parts = cleanedLine.split(',');
            if (parts.length >= 2) {
                const question = parts[0].trim();
                const answer = parts.slice(1).join(',').trim();
                return { question, answer };
            }
            return null;
        }).filter(card => card && card.question && card.answer);
        
        if (cards.length > 0) {
            currentIndex = 0;
            showCard();
        } else {
            front.textContent = 'No se encontraron tarjetas en este tema.';
            back.textContent = '';
            updateCounter();
        }
    } catch (error) {
        console.error('Error cargando CSV:', error);
        front.textContent = `Error: ${error.message}`;
        back.textContent = 'Intenta seleccionar otro tema.';
        updateCounter();
    }
}

function showCard() {
    if (cards.length === 0) {
        front.textContent = 'No hay tarjetas disponibles';
        back.textContent = '';
        return;
    }
    
    front.innerHTML = formatText(cards[currentIndex].question);
    back.innerHTML = formatText(cards[currentIndex].answer);
    card.classList.remove('flipped');
    isFlipped = false;
    updateCounter();
}

function updateCounter() {
    if (cards.length === 0) {
        counter.textContent = 'No hay tarjetas';
    } else {
        counter.textContent = `Tarjeta ${currentIndex + 1} de ${cards.length}`;
    }
}

function getRandomIndex() {
    return Math.floor(Math.random() * cards.length);
}

prevBtn.addEventListener('click', () => {
    if (cards.length === 0) return;
    if (isRandomMode) {
        currentIndex = getRandomIndex();
    } else {
        currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    }
    showCard();
});

nextBtn.addEventListener('click', () => {
    if (cards.length === 0) return;
    if (isRandomMode) {
        currentIndex = getRandomIndex();
    } else {
        currentIndex = (currentIndex + 1) % cards.length;
    }
    showCard();
});

flipBtn.addEventListener('click', () => {
    card.classList.toggle('flipped');
    isFlipped = !isFlipped;
});

randomBtn.addEventListener('click', () => {
    isRandomMode = !isRandomMode;
    randomBtn.textContent = `Modo Aleatorio: ${isRandomMode ? 'ON' : 'OFF'}`;
    randomBtn.classList.toggle('active', isRandomMode);
});

// Evento para cambiar tema
topicSelector.addEventListener('change', (e) => {
    loadCSV(e.target.value);
});

// Allow clicking on card to flip
card.addEventListener('click', () => {
    card.classList.toggle('flipped');
    isFlipped = !isFlipped;
});

// Cargar temas disponibles al iniciar
loadAvailableTopics();