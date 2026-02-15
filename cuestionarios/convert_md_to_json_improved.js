const fs = require('fs');
const path = require('path');

// Rutas de archivos
const inputFile = path.join(__dirname, 'cuestionarios mishpatim.md');
const outputFile = path.join(__dirname, 'data', 'cuestionario-mishpatim.json');

// Función para limpiar el texto
function cleanText(text) {
    return text
        .replace(/^\d+\s*\/\s*\d+\s*/, '') // Eliminar prefijo de número de pregunta
        .replace(/^[A-Z]\.\s*/, '') // Eliminar prefijo de opción (A., B., etc.)
        .trim();
}

// Leer el archivo markdown
fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error('Error al leer el archivo:', err);
        return;
    }

    // Dividir el contenido en bloques de preguntas
    const questionBlocks = data.split(/\n\s*\n/);
    const questions = [];
    let currentQuestion = null;

    for (const block of questionBlocks) {
        const lines = block.split('\n').filter(line => line.trim() !== '');
        
        // Buscar el inicio de una nueva pregunta (ej: "1 / 12")
        const questionMatch = lines[0]?.match(/^(\d+) \/ (\d+)/);
        
        if (questionMatch) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            
            currentQuestion = {
                id: parseInt(questionMatch[1], 10),
                totalQuestions: parseInt(questionMatch[2], 10),
                question: '',
                options: {},
                correctAnswer: '',
                hint: ''
            };
            
            // La pregunta está en la siguiente línea
            if (lines[1]) {
                currentQuestion.question = lines[1].trim();
            }
            
            // Procesar opciones (las siguientes líneas que empiezan con A., B., C., D.)
            for (let i = 2; i < lines.length; i++) {
                const optionMatch = lines[i].match(/^([A-Z])\.\s*(.*)/);
                if (optionMatch) {
                    currentQuestion.options[optionMatch[1]] = optionMatch[2].trim();
                    // Asignar la primera opción como correcta por defecto (se puede ajustar manualmente después)
                    if (!currentQuestion.correctAnswer) {
                        currentQuestion.correctAnswer = optionMatch[1];
                    }
                } else if (lines[i].toLowerCase().includes('pista')) {
                    // La pista está en la línea actual (después de "Pista") o en la siguiente
                    const hintText = lines[i].replace(/^pista\s*/i, '').trim();
                    currentQuestion.hint = hintText || (lines[i + 1] ? lines[i + 1].trim() : '');
                    break;
                }
            }
        }
    }
    
    // Asegurarse de agregar la última pregunta
    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    
    // Escribir el archivo JSON
    fs.writeFile(outputFile, JSON.stringify(questions, null, 2), (err) => {
        if (err) {
            console.error('Error al escribir el archivo JSON:', err);
            return;
        }
        console.log(`Se ha creado el archivo ${outputFile} con ${questions.length} preguntas.`);
        
        // Mostrar un resumen de las preguntas procesadas
        console.log('\nResumen de preguntas procesadas:');
        questions.forEach((q, index) => {
            console.log(`\nPregunta ${index + 1}: ${q.question}`);
            console.log('Opciones:', JSON.stringify(q.options, null, 2));
            console.log('Respuesta correcta:', q.correctAnswer);
            if (q.hint) console.log('Pista:', q.hint);
        });
    });
});
