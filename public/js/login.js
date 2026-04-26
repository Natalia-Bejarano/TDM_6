import { login } from "./services/api.js";
import {
  showError,
  clearError,
  saveUser,
  redirectToChat,
} from "./ui/loginUI.js";

// Referencia al formulario de inicio de sesión en el DOM
const loginForm = document.getElementById("loginForm");

// Validación nueva: formato básico de correo y longitud segura
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// Validación nueva: bloquea etiquetas HTML sospechosas
function hasUnsafeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

// Validación nueva: bloquea caracteres de control no visibles
function hasControlCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

// Manejo del evento de envío para procesar la autenticación
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Obtención y limpieza de credenciales desde el HTML
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Reinicio de alertas de error en la interfaz
  clearError();

  try {
    // Validación de integridad: campos obligatorios
    if (!email || !password) {
      showError("Debes ingresar tu correo institucional y contraseña");
      return;
    }

    // Validación nueva: evita correos con formato inválido o demasiado extensos
    if (!emailPattern.test(email) || email.length > 120) {
      showError("Ingresa un correo válido.");
      return;
    }

    // Validación nueva: evita contenido HTML o caracteres invisibles en el correo
    if (hasUnsafeHtml(email) || hasControlCharacters(email)) {
      showError("El correo contiene caracteres no permitidos.");
      return;
    }

    // Validación nueva: limita la contraseña sin romper credenciales existentes
    if (password.length > 64) {
      showError("La contraseña no debe superar 64 caracteres.");
      return;
    }

    // Validación nueva: evita contenido HTML o caracteres invisibles en la contraseña
    if (hasUnsafeHtml(password) || hasControlCharacters(password)) {
      showError("La contraseña contiene caracteres no permitidos.");
      return;
    }

    // Consumo del servicio de autenticación vía API
    const data = await login(email, password);

    // Persistencia del perfil de usuario (ID, Rol, Datos) en LocalStorage
    // Esto permite que chat.js personalice la experiencia según el rol
    saveUser(data.user);

    // Navegación hacia el módulo principal de mensajería
    redirectToChat();
  } catch (err) {
    // Captura de excepciones (credenciales inválidas o fallo de conexión)
    console.error("Error de login en sistema UCA:", err);
    showError(err.message || "Error al iniciar sesión. Intente nuevamente.");
  }
});
