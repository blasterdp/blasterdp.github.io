// Código JavaScript para la página de antítesis
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de Estudios Bíblicos - Antítesis cargada correctamente');
    
    // Aquí puedes agregar cualquier funcionalidad interactiva que necesites
    // Por ejemplo, animaciones, carga dinámica de contenido, etc.
    
    // Ejemplo: Agregar clase activa al menú actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const menuLinks = document.querySelectorAll('.study-item a');
    
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
            link.parentElement.style.borderLeft = '4px solid var(--secondary-color)';
        }
    });
});
