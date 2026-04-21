/**
 * Controlador Principal del Chat - Universidad Católica Americana (UCA)
 * Orquestador de la interfaz de usuario y la comunicación bidireccional.
 */
import { getUsers } from "./services/api.js";
import { chatUI } from "./ui/chatUI.js";
import { ChatSocket } from "./web/chatSocket.js";

// Estado global de la sesión
let socket = null;
let selectedUserId = null;
let currentUser = JSON.parse(localStorage.getItem("user"));

/**
 * Inicialización de la aplicación al cargar el documento
 */
document.addEventListener("DOMContentLoaded", async () => {
  if (!currentUser) return (window.location.href = "login.html");

  // Preparar entorno visual inicial
  chatUI.renderCurrentUserInfo(currentUser);

  // Configuración del WebSocket y manejo de eventos del servidor
  socket = new ChatSocket(currentUser.id, (data) => {
    // Gestión de eventos de presencia (Online/Offline)
    if (data.type === "user_list_update") {
      chatUI.renderUserList(data.users, currentUser, (user) => openChat(user));
    }

    // Gestión de mensajería entrante
    else if (data.type === "new_message") {
      handleIncoming(data);
    }
  });

  socket.connect();

  // Carga inicial del directorio de atención
  const users = await getUsers();
  chatUI.renderUserList(users, currentUser, (user) => openChat(user));

  setupEvents();
});

/**
 * Inicia una sesión de chat con un contacto específico
 * @param {Object} contact - Datos del usuario seleccionado
 */
function openChat(contact) {
  selectedUserId = contact.id;

  // Gestión de transiciones visuales
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("chat-session").style.display = "flex";

  // Limpieza de pantalla para nueva conversación (Sin historial persistente)
  document.getElementById("messages-display").innerHTML = "";

  // Actualización de componentes de la cabecera
  chatUI.updateChatHeader(contact);

  // Foco automático para mejorar la usabilidad
  document.getElementById("user-input").focus();
}

/**
 * Procesa y renderiza mensajes recibidos en tiempo real
 * @param {Object} msg - Estructura del mensaje {from, text, time}
 */
function handleIncoming(msg) {
  // Solo se muestra el mensaje si corresponde al chat abierto actualmente
  if (selectedUserId === msg.from) {
    chatUI.displayMessage(msg.text, "received");
  } else {
    // Notificación para mensajes de otros usuarios mientras se está en otro chat
    console.warn(`Mensaje en segundo plano recibido de: ${msg.from}`);
    alert(`Mensaje institucional nuevo de: ${msg.from}`);
  }
}

/**
 * Captura y envía el mensaje escrito por el usuario
 */
function send() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();

  if (text && selectedUserId) {
    // Envío seguro a través del túnel WebSocket
    socket.sendMessage(selectedUserId, text);

    // Renderizado local del mensaje enviado
    chatUI.displayMessage(text, "sent");

    // Reinicio del campo de entrada
    input.value = "";
  }
}

/**
 * Configuración de escuchas de eventos (Clicks, Enter y Logout)
 */
function setupEvents() {
  const sendBtn = document.getElementById("send-message-btn");
  const userInput = document.getElementById("user-input");
  const logoutBtn = document.getElementById("logout-btn");

  if (sendBtn) sendBtn.onclick = send;

  if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    };
  }
}
