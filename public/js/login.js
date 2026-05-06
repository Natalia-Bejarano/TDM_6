/**
 * Controlador de Autenticación - Universidad Católica Americana (UCA)
 * Incluye validaciones de seguridad, límites de caracteres y login híbrido.
 */

import { login } from "./services/api.js";
import {
  showError,
  clearError,
  saveUser,
  redirectToChat,
} from "./ui/loginUI.js";

// --- REFERENCIAS AL DOM ---
const loginForm = document.getElementById("loginForm");
const submitBtn = loginForm.querySelector('button[type="submit"]');
const googleBtn = document.querySelector(".btn-google");

// --- CONFIGURACIÓN DE SEGURIDAD ---
// 1. Solo permite correos que terminen exactamente en @uca.edu.co
const emailPattern = /^[a-zA-Z0-9._%+-]+@uca\.edu\.co$/;

// 2. Detecta intentos de inyección de etiquetas HTML (Anti-XSS)
function hasUnsafeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

// 3. Detecta caracteres de control invisibles que pueden romper el servidor
function hasControlCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

// --- MANEJO DE LOGIN TRADICIONAL ---
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value; // Sin trim (los espacios en contraseñas valen)

  clearError();

  // --- CAPA 1: VALIDACIONES DE INTEGRIDAD ---
  if (!email || !password) {
    showError("Por favor, completa todos los campos.");
    return;
  }

  // --- CAPA 2: VALIDACIÓN DE CORREO (LÍMITES Y DOMINIO) ---
  if (email.length > 50) {
    showError("El correo es demasiado largo (máximo 50 caracteres).");
    return;
  }

  if (!emailPattern.test(email)) {
    showError("Debes usar tu correo institucional (@uca.edu.co).");
    return;
  }

  if (hasUnsafeHtml(email) || hasControlCharacters(email)) {
    showError("El correo contiene caracteres no permitidos.");
    return;
  }

  // --- CAPA 3: VALIDACIÓN DE CONTRASEÑA ---
  if (password.length < 3 || password.length > 64) {
    showError("La contraseña debe tener entre 3 y 64 caracteres.");
    return;
  }

  if (hasUnsafeHtml(password) || hasControlCharacters(password)) {
    showError("La contraseña contiene caracteres no permitidos.");
    return;
  }

  // --- CAPA 4: ENVÍO DE DATOS Y ESTADO DE CARGA ---
  try {
    // Bloqueamos el botón para evitar múltiples clics
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Verificando...";

    // Petición a la API
    const data = await login(email, password);

    // Si llegamos aquí, el login fue exitoso
    saveUser(data.user);
    redirectToChat();
  } catch (err) {
    console.error("Error de login UCA:", err);

    // Mensaje genérico para no dar pistas sobre la existencia de cuentas
    showError(err.message || "Credenciales incorrectas o error de servidor.");

    // Restauramos el botón solo si hubo error
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});

// --- MANEJO DE LOGIN CON GOOGLE ---
if (googleBtn) {
  googleBtn.addEventListener("click", () => {
    // Feedback visual inmediato
    googleBtn.style.pointerEvents = "none";
    googleBtn.style.opacity = "0.6";
    googleBtn.innerHTML = '<i class="fab fa-google"></i> Conectando...';

    // Redirección al flujo de Google en el servidor
    window.location.href = "/auth/google";
  });
}

// --- MANEJO DE ERRORES EXTERNOS (URL PARAMS) ---
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");

  if (error) {
    const errorMessages = {
      user_not_found: "Esta cuenta de Google no está registrada en el sistema.",
      auth_failed: "Error en la autenticación de Google. Reintenta.",
      invalid_domain: "Acceso denegado: Usa tu cuenta @uca.edu.co",
      google_auth_failed: "Error crítico al conectar con Google.",
      google_timeout: "La conexión con Google tardó demasiado.",
    };

    const message =
      errorMessages[error] || "Ocurrió un error de seguridad inesperado.";
    showError(message);

    // Limpiamos la URL para que el error no se repita al refrescar
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
