const fs = require('fs');
const path = require('path');

// Directorio donde se encuentran los archivos JSON
const dataDir = './data';

// Leer todos los archivos JSON en el directorio
fs.readdir(dataDir, (err, files) => {
    if (err) {
        console.error('Error al leer el directorio:', err);
        return;
    }

    // Filtrar solo los archivos que empiezan con 'cuestionario-' y terminan con '.json'
    const quizFiles = files
        .filter(file => file.startsWith('cuestionario-') && file.endsWith('.json'))
        .sort(); // Ordenar alfabéticamente

    // Crear el archivo quizzes-list.json
    const listPath = path.join(dataDir, 'quizzes-list.json');
    fs.writeFile(listPath, JSON.stringify(quizFiles, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error al escribir el archivo:', err);
            return;
        }
        console.log('Archivo quizzes-list.json actualizado exitosamente:');
        console.log(quizFiles);
    });
});
