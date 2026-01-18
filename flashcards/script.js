let cards = [];
let currentIndex = 0;
let isFlipped = false;

const card = document.getElementById('card');
const front = card.querySelector('.front');
const back = card.querySelector('.back');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const flipBtn = document.getElementById('flip');
const counter = document.getElementById('counter');

async function loadCSV() {
    try {
        const response = await fetch('../tarjetas_variadas/flashcards.csv');
        const text = await response.text();
        const lines = text.split('\n');
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
            showCard();
        } else {
            front.textContent = 'No se encontraron tarjetas.';
            back.textContent = 'No se encontraron tarjetas.';
        }
    } catch (error) {
        console.error('Error cargando CSV:', error);
        front.textContent = 'Error cargando tarjetas.';
        back.textContent = 'Error cargando tarjetas.';
    }
}

function showCard() {
    front.textContent = cards[currentIndex].question;
    back.textContent = cards[currentIndex].answer;
    card.classList.remove('flipped');
    isFlipped = false;
    updateCounter();
}

function updateCounter() {
    counter.textContent = `Tarjeta ${currentIndex + 1} de ${cards.length}`;
}

prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    showCard();
});

nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % cards.length;
    showCard();
});

flipBtn.addEventListener('click', () => {
    card.classList.toggle('flipped');
    isFlipped = !isFlipped;
});

// Allow clicking on card to flip
card.addEventListener('click', () => {
    card.classList.toggle('flipped');
    isFlipped = !isFlipped;
});

loadCSV();