// Variables globales
let currentQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let selectedOption = null;
let quizData = [];
let timeElapsed = 0;
let timerInterval = null;

// Elementos del DOM
const quizSelection = document.getElementById('quiz-selection');
const quizContainer = document.getElementById('quiz-container');
const resultsContainer = document.getElementById('results');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const questionCounter = document.getElementById('question-counter');
const hintBtn = document.getElementById('hint-btn');
const submitBtn = document.getElementById('submit-answer');
const nextBtn = document.getElementById('next-question');
const hintDiv = document.getElementById('hint');
const feedbackDiv = document.getElementById('feedback');
const scorePercentage = document.getElementById('score-percentage');
const correctAnswersSpan = document.getElementById('correct-answers');
const totalQuestionsSpan = document.getElementById('total-questions');
const scoreMessage = document.getElementById('score-message');
const quizTime = document.getElementById('quiz-time');
const restartBtn = document.getElementById('restart-quiz');
const selectQuizBtn = document.getElementById('select-quiz');

// Cargar los datos del cuestionario
async function loadQuizData(quizName) {
    try {
        const response = await fetch(`data/${quizName}.json`);
        if (!response.ok) {
            throw new Error('No se pudo cargar el cuestionario');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al cargar el cuestionario:', error);
        return [];
    }
}

// Iniciar el cuestionario
async function startQuiz(quizName) {
    currentQuiz = quizName;
    quizData = await loadQuizData(quizName);
    
    if (quizData.length === 0) {
        alert('Error al cargar el cuestionario. Por favor, inténtalo de nuevo.');
        return;
    }
    
    // Reiniciar variables
    currentQuestionIndex = 0;
    score = 0;
    timeElapsed = 0;
    selectedOption = null;
    
    // Mostrar el contenedor del cuestionario
    quizSelection.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    
    // Iniciar temporizador
    startTimer();
    
    // Mostrar la primera pregunta
    showQuestion();
}

// Mostrar la pregunta actual
function showQuestion() {
    if (currentQuestionIndex >= quizData.length) {
        showResults();
        return;
    }
    
    const question = quizData[currentQuestionIndex];
    
    // Actualizar la barra de progreso
    const progress = ((currentQuestionIndex) / quizData.length) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Actualizar el contador de preguntas
    questionCounter.textContent = `Pregunta ${currentQuestionIndex + 1} de ${quizData.length}`;
    
    // Mostrar la pregunta
    questionText.textContent = question.question;
    
    // Limpiar opciones anteriores
    optionsContainer.innerHTML = '';
    
    // Agregar las opciones de respuesta
    Object.entries(question.options).forEach(([key, value]) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.innerHTML = `
            <span class="option-prefix">${key}</span>
            <span class="option-text">${value}</span>
        `;
        
        // Manejar la selección de opción
        optionElement.addEventListener('click', () => selectOption(optionElement, key));
        
        optionsContainer.appendChild(optionElement);
    });
    
    // Reiniciar el estado de los botones
    submitBtn.disabled = true;
    submitBtn.textContent = 'Responder';
    hintBtn.disabled = false;
    hintDiv.textContent = '';
    feedbackDiv.classList.add('hidden');
    
    // Desplazarse al inicio del cuestionario
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Seleccionar una opción
function selectOption(optionElement, optionKey) {
    // Deseleccionar la opción anterior si existe
    const previousSelected = document.querySelector('.option.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // Seleccionar la nueva opción
    optionElement.classList.add('selected');
    selectedOption = optionKey;
    submitBtn.disabled = false;
}

// Verificar la respuesta
function checkAnswer() {
    if (selectedOption === null) return;
    
    const question = quizData[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    
    // Deshabilitar todos los botones de opción
    options.forEach(option => {
        option.style.pointerEvents = 'none';
    });
    
    // Marcar la respuesta correcta
    const correctOption = document.querySelector(`.option .option-prefix`).parentNode;
    correctOption.classList.add('correct');
    
    // Marcar la respuesta seleccionada como correcta o incorrecta
    if (selectedOption === question.correctAnswer) {
        score++;
        const selectedOptionElement = document.querySelector('.option.selected');
        if (selectedOptionElement) {
            selectedOptionElement.classList.add('correct');
        }
    } else {
        const selectedOptionElement = document.querySelector('.option.selected');
        if (selectedOptionElement) {
            selectedOptionElement.classList.add('incorrect');
        }
    }
    
    // Mostrar retroalimentación
    if (question.hint) {
        hintDiv.textContent = question.hint;
    }
    
    // Mostrar botón de siguiente pregunta
    feedbackDiv.classList.remove('hidden');
    submitBtn.style.display = 'none';
    hintBtn.style.display = 'none';
    
    // Si es la última pregunta, cambiar el texto del botón
    if (currentQuestionIndex === quizData.length - 1) {
        nextBtn.textContent = 'Ver resultados';
    }
}

// Mostrar pista
function showHint() {
    const question = quizData[currentQuestionIndex];
    if (question.hint) {
        hintDiv.textContent = question.hint;
        hintBtn.disabled = true;
    }
}

// Siguiente pregunta
function nextQuestion() {
    currentQuestionIndex++;
    selectedOption = null;
    showQuestion();
}

// Mostrar resultados
function showResults() {
    // Detener el temporizador
    stopTimer();
    
    // Calcular puntuación
    const percentage = Math.round((score / quizData.length) * 100);
    
    // Actualizar la interfaz
    scorePercentage.textContent = percentage;
    correctAnswersSpan.textContent = score;
    totalQuestionsSpan.textContent = quizData.length;
    
    // Actualizar el círculo de puntuación
    document.documentElement.style.setProperty('--score-percentage', `${percentage}%`);
    
    // Mostrar mensaje según la puntuación
    if (percentage >= 80) {
        scoreMessage.textContent = '¡Excelente trabajo! Has demostrado un gran conocimiento.';
    } else if (percentage >= 60) {
        scoreMessage.textContent = '¡Buen trabajo! Sigue así para mejorar aún más.';
    } else if (percentage >= 40) {
        scoreMessage.textContent = 'No está mal, pero hay margen de mejora. ¡Sigue practicando!';
    } else {
        scoreMessage.textContent = 'Parece que necesitas repasar un poco más. ¡No te rindas!';
    }
    
    // Mostrar el contenedor de resultados
    quizContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    
    // Desplazarse al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Reiniciar el cuestionario
function restartQuiz() {
    // Reiniciar variables
    currentQuestionIndex = 0;
    score = 0;
    timeElapsed = 0;
    selectedOption = null;
    
    // Mostrar el cuestionario nuevamente
    resultsContainer.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    
    // Reiniciar el temporizador
    startTimer();
    
    // Mostrar la primera pregunta
    showQuestion();
}

// Volver a la selección de cuestionarios
function goToQuizSelection() {
    // Detener el temporizador si está en ejecución
    stopTimer();
    
    // Mostrar la selección de cuestionarios
    resultsContainer.classList.add('hidden');
    quizSelection.classList.remove('hidden');
    
    // Desplazarse al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Temporizador
function startTimer() {
    // Detener el temporizador si ya está en ejecución
    stopTimer();
    
    // Actualizar el tiempo cada segundo
    timerInterval = setInterval(() => {
        timeElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    quizTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Manejadores de eventos
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar cuestionario al hacer clic en una tarjeta
    const quizCards = document.querySelectorAll('.quiz-card');
    quizCards.forEach(card => {
        card.addEventListener('click', () => {
            const quizName = card.getAttribute('data-quiz');
            startQuiz(quizName);
        });
    });
    
    // Botón de enviar respuesta
    submitBtn.addEventListener('click', checkAnswer);
    
    // Botón de pista
    hintBtn.addEventListener('click', showHint);
    
    // Botón de siguiente pregunta
    nextBtn.addEventListener('click', nextQuestion);
    
    // Botón de reiniciar cuestionario
    restartBtn.addEventListener('click', restartQuiz);
    
    // Botón de seleccionar otro cuestionario
    selectQuizBtn.addEventListener('click', goToQuizSelection);
    
    // Inicializar el temporizador
    updateTimerDisplay();
});
