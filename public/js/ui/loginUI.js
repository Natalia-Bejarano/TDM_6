/**
 * Módulo de Interfaz para el proceso de Login
 * Contiene funciones auxiliares para el manejo de errores y navegación.
 */

// Muestra mensajes de error dinámicos en el contenedor de alertas
export function showError(message) {
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = message;
}

// Limpia el contenido de las notificaciones de error
export function clearError() {
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
}

// Almacena el perfil del usuario en LocalStorage para persistir la sesión
export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

// Gestiona la redirección del navegador hacia la vista del chat
export function redirectToChat() {
  window.location.href = "/chat.html";
}

