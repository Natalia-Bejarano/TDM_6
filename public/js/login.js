import { login } from "./services/api.js";
import {
  showError,
  clearError,
  saveUser,
  redirectToChat,
} from "./ui/loginUI.js";

// Referencia al formulario de inicio de sesión en el DOM
const loginForm = document.getElementById("loginForm");

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
