# Sistema Automático de Cuestionarios

Este sistema permite agregar nuevos cuestionarios automáticamente sin necesidad de modificar el código.

## ¿Cómo agregar un nuevo cuestionario?

1. **Crea tu archivo JSON** en la carpeta `data/` con el nombre `cuestionario-tunombre.json`
2. **Ejecuta el script de actualización**:
   ```bash
   node update-quizzes-list.js
   ```
3. ¡Listo! Tu cuestionario aparecerá automáticamente en la página principal

## Estructura del archivo JSON

Tu cuestionario debe seguir esta estructura:
```json
[
  {
    "id": 1,
    "totalQuestions": 10,
    "question": "¿Tu pregunta aquí?",
    "options": {
      "A": "Opción A",
      "B": "Opción B", 
      "C": "Opción C",
      "D": "Opción D"
    },
    "correctAnswer": "C",
    "hint": "Pista opcional para el usuario"
  }
]
```

## Archivos del sistema

- `index.html` - Página principal que muestra todos los cuestionarios disponibles
- `quiz.html` - Página donde se resuelven los cuestionarios
- `data/quizzes-list.json` - Lista automática de cuestionarios (no editar manualmente)
- `update-quizzes-list.js` - Script que actualiza la lista de cuestionarios
- `data/cuestionario-*.json` - Archivos individuales de cada cuestionario

## Nota importante

Los nombres de los archivos deben seguir el formato: `cuestionario-nombre.json`
