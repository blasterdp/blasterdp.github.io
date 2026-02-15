const fs = require('fs');
const path = require('path');

// Rutas de archivos
const inputFile = path.join(__dirname, 'cuestionarios mishpatim.md');
const outputFile = path.join(__dirname, 'data', 'cuestionario-mishpatim.json');

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
                correctAnswer: 'A', // Por defecto, la primera opción es la correcta
                hint: ''
            };
            
            // La pregunta está en la siguiente línea
            let currentLine = 1;
            if (lines[currentLine] && !lines[currentLine].match(/^[A-Z]\.\s*/)) {
                currentQuestion.question = lines[currentLine].trim();
                currentLine++;
            }
            
            // Procesar opciones (las siguientes líneas que empiezan con A., B., C., D.)
            while (currentLine < lines.length) {
                const optionMatch = lines[currentLine].match(/^([A-Z])\.\s*(.*)/);
                if (optionMatch) {
                    const [_, letter, text] = optionMatch;
                    currentQuestion.options[letter] = text.trim();
                    currentLine++;
                } else if (lines[currentLine].toLowerCase().includes('pista')) {
                    // La pista está en la siguiente línea
                    currentQuestion.hint = lines[currentLine + 1]?.trim() || '';
                    break;
                } else {
                    currentLine++;
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
