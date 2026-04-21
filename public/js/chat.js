/**
 * Controlador Principal del Chat - UCA
 * Gestiona la lógica de la interfaz, el flujo de mensajes y la conexión en tiempo real.
 */
import { getUsers } from "./services/api.js";
import { chatUI } from "./ui/chatUI.js";
import { ChatSocket } from "./web/chatSocket.js";

// Estado global de la aplicación en el cliente
let socket = null;
let selectedUserId = null;
let currentUser = JSON.parse(localStorage.getItem("user"));

// Inicialización al cargar el DOM
document.addEventListener("DOMContentLoaded", async () => {
  // Verificación de seguridad: si no hay sesión, vuelve al login
  if (!currentUser) return (window.location.href = "login.html");

  // Renderizado del perfil del usuario logueado en el sidebar
  chatUI.renderCurrentUserInfo(currentUser);

  // Inicialización del túnel de comunicación (WebSocket)
  socket = new ChatSocket(currentUser.id, (msg) => handleIncoming(msg));
  socket.connect();

  // Carga inicial del directorio de usuarios para mostrar en el sidebar
  const users = await getUsers();
  chatUI.renderUserList(users, currentUser, (user) => openChat(user));

  // Configuración de listeners de eventos (clics y teclado)
  setupEvents();
});

/**
 * Activa la sesión de chat con el usuario seleccionado
 * @param {Object} contact - Información del monitor o estudiante seleccionado
 */
function openChat(contact) {
  selectedUserId = contact.id;

  // Transición de interfaz: de pantalla de bienvenida a chat activo
  document.getElementById("welcome-screen").style.display = "none";
  const chatSession = document.getElementById("chat-session");
  chatSession.style.display = "flex";

  // Limpieza del flujo de mensajes para iniciar conversación nueva
  document.getElementById("messages-display").innerHTML = "";

  // Actualización de la cabecera con el nombre y rol del contacto
  chatUI.updateChatHeader(contact);

  // Foco automático en el campo de texto para agilizar la escritura
  document.getElementById("user-input").focus();
}

/**
 * Gestiona la recepción de mensajes entrantes desde el servidor
 * @param {Object} msg - Datos del mensaje recibido {from, text, time}
 */
function handleIncoming(msg) {
  // Solo se renderiza el mensaje si el chat de ese usuario está abierto
  if (selectedUserId === msg.from) {
    chatUI.displayMessage(msg.text, "received");
  } else {
    // Alerta de sistema en caso de recibir mensajes de otros contactos
    alert(`Nuevo mensaje institucional de: ${msg.from}`);
  }
}

/**
 * Procesa el envío de mensajes desde el cliente hacia el servidor
 */
function send() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();

  // Validación: texto no vacío y destinatario seleccionado
  if (text && selectedUserId) {
    // Transmisión vía WebSocket
    socket.sendMessage(selectedUserId, text);

    // Renderizado inmediato en la interfaz local
    chatUI.displayMessage(text, "sent");

    // Limpieza del campo de entrada
    input.value = "";
  }
}

/**
 * Centraliza la asignación de eventos de usuario
 */
function setupEvents() {
  const sendBtn = document.getElementById("send-message-btn");
  const userInput = document.getElementById("user-input");

  // Evento para el botón
  if (sendBtn) {
    sendBtn.onclick = send;
  }

  // Evento para la tecla Enter
  if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Evita saltos de línea o recargas
        send();
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    };
  }
}
