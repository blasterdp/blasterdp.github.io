const fs = require('fs');
const path = require('path');

// Ruta del archivo markdown de entrada
const inputFile = path.join(__dirname, 'cuestionarios mishpatim.md');
// Ruta del archivo JSON de salida
const outputFile = path.join(__dirname, 'data', 'cuestionario-mishpatim.json');

// Leer el contenido del archivo markdown
fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error('Error al leer el archivo:', err);
        return;
    }

    // Dividir el contenido por líneas
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    const questions = [];
    let currentQuestion = null;
    
    // Procesar cada línea
    for (const line of lines) {
        // Buscar el inicio de una nueva pregunta (ej: "1 / 12")
        const questionMatch = line.match(/^(\d+) \/ (\d+)/);
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
            continue;
        }
        
        // Si es una pregunta
        if (line.startsWith('¿') && currentQuestion) {
            currentQuestion.question = line.trim();
            continue;
        }
        
        // Si es una opción de respuesta
        const optionMatch = line.match(/^([A-Z]\.)\s*(.*)/);
        if (optionMatch && currentQuestion) {
            const optionKey = optionMatch[1].replace('.', '');
            currentQuestion.options[optionKey] = optionMatch[2].trim();
            continue;
        }
        
        // Si es una pista
        if (line.toLowerCase().includes('pista') && currentQuestion) {
            // La pista está en las líneas siguientes
            currentQuestion.hint = line.replace(/^pista\s*/i, '').trim();
            continue;
        }
        
        // Si es la respuesta correcta (asumimos que la última opción es la correcta)
        // En un caso real, necesitaríamos marcarlas de alguna manera
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
    });
});
