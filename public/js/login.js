import { login } from "./services/api.js";
import {
  showError,
  clearError,
  saveUser,
  redirectToChat,
} from "./ui/loginUI.js";

// --- REFERENCIAS AL DOM ---
const loginForm = document.getElementById("loginForm");
const googleBtn = document.querySelector(".btn-google"); // Seleccionamos el botón de Google

// --- CONFIGURACIÓN DE VALIDACIONES ---
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function hasUnsafeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function hasControlCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

// --- MANEJO DE LOGIN TRADICIONAL (EMAIL/PASSWORD) ---
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  clearError();

  try {
    // Validaciones de integridad
    if (!email || !password) {
      showError("Debes ingresar tu correo institucional y contraseña");
      return;
    }

    if (!emailPattern.test(email) || email.length > 120) {
      showError("Ingresa un correo válido.");
      return;
    }

    if (hasUnsafeHtml(email) || hasControlCharacters(email)) {
      showError("El correo contiene caracteres no permitidos.");
      return;
    }

    if (
      password.length > 64 ||
      hasUnsafeHtml(password) ||
      hasControlCharacters(password)
    ) {
      showError(
        "La contraseña contiene caracteres no permitidos o es muy larga.",
      );
      return;
    }

    // Petición a la API (Login tradicional)
    const data = await login(email, password);
    saveUser(data.user);
    redirectToChat();
  } catch (err) {
    console.error("Error de login en sistema UCA:", err);
    showError(err.message || "Error al iniciar sesión. Intente nuevamente.");
  }
});

// --- MANEJO DE LOGIN CON GOOGLE ---
if (googleBtn) {
  googleBtn.addEventListener("click", () => {
    // Redirección física al servidor para iniciar el flujo OAuth 2.0
    // No usamos fetch aquí porque Google necesita mostrar su propia interfaz
    window.location.href = "/auth/google";
  });
}

// --- MANEJO DE ERRORES EXTERNOS (GOOGLE O CALLBACKS) ---
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");

  if (error) {
    const errorMessages = {
      user_not_found:
        "Tu cuenta de Google no está registrada en el sistema de la UCA.",
      auth_failed: "Hubo un fallo en la autenticación con Google. Reintenta.",
      invalid_domain: "Por favor, usa tu cuenta institucional @uca.edu.co",
    };

    const message = errorMessages[error] || "Ocurrió un error inesperado.";
    showError(message);

    // Limpia la URL para evitar que el error persista al refrescar
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
