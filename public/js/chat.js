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
let selectedUser = null;
let currentUser = JSON.parse(localStorage.getItem("user"));

// estado local para usuarios, búsqueda y conexión
let allUsers = [];
let socketStatus = "disconnected";

/**
 * Actualiza el estado del botón de enviar y del campo de texto.
 * Solo permite escribir si hay usuario seleccionado, está disponible y el socket está conectado.
 */
function updateSendButtonState() {
  const sendBtn = document.getElementById("send-message-btn");
  const userInput = document.getElementById("user-input");

  const canSend =
    Boolean(selectedUserId) &&
    Boolean(selectedUser) &&
    chatUI.isUserAvailable(selectedUser) &&
    socket?.isConnected();

  if (sendBtn) sendBtn.disabled = !canSend;

  if (userInput) {
    userInput.disabled = !canSend;
    userInput.placeholder = canSend
      ? "Escribe un mensaje..."
      : "Selecciona un contacto disponible...";
  }
}

/**
 * Renderiza la lista de contactos usando el módulo visual chatUI.
 */
function renderContacts(users = allUsers) {
  chatUI.renderUserList(users, currentUser, (user) => openChat(user));
}

/**
 * Filtra contactos por nombre, facultad, especialidad o rol.
 */
function filterContacts(searchText) {
  const term = searchText.trim().toLowerCase();

  if (!term) {
    renderContacts(allUsers);
    return;
  }

  const filtered = allUsers.filter((user) => {
    const name = String(user.name || "").toLowerCase();
    const faculty = String(user.faculty || "").toLowerCase();
    const specialty = String(user.specialty || "").toLowerCase();
    const role = String(user.rol || "").toLowerCase();

    return (
      name.includes(term) ||
      faculty.includes(term) ||
      specialty.includes(term) ||
      role.includes(term)
    );
  });

  renderContacts(filtered);
}

/**
 * Actualiza los datos del usuario seleccionado usando la lista más reciente del servidor.
 * Esto sirve para detectar si el contacto se desconectó mientras el chat estaba abierto.
 */
function refreshSelectedUserFromList() {
  if (!selectedUserId) return;

  const updatedUser = allUsers.find((user) => user.id === selectedUserId);
  if (!updatedUser) return;

  selectedUser = updatedUser;
  chatUI.updateChatHeader(selectedUser);

  if (!chatUI.isUserAvailable(selectedUser)) {
    alert(`${selectedUser.name} ya no está disponible.`);
  }

  updateSendButtonState();
}


/**
 * Inicialización de la aplicación al cargar el documento
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Si no hay usuario en sesión, se redirige al login
  if (!currentUser) return (window.location.href = "login.html");

  // Renderiza la información del usuario actual en la barra lateral
  chatUI.renderCurrentUserInfo(currentUser);

  // Desactiva inicialmente el input hasta que se seleccione un contacto válido
  updateSendButtonState();

  // WebSocket con callback de mensajes y callback de estado
  socket = new ChatSocket(
    currentUser.id,

    // Callback que recibe eventos enviados por el servidor
    (data) => {
      if (data.type === "user_list_update") {
        allUsers = data.users;
        renderContacts(allUsers);
        refreshSelectedUserFromList();
      } else if (data.type === "new_message") {
        handleIncoming(data);
      }
    },

    // Callback que actualiza el estado de conexión del WebSocket
    (status) => {
      socketStatus = status;
      chatUI.updateConnectionStatus(status);
      updateSendButtonState();
    },
  );

  // Inicia la conexión WebSocket
  socket.connect();

  try {
    // Carga inicial del directorio de usuarios
    allUsers = await getUsers();
    renderContacts(allUsers);
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    alert("No se pudo cargar el directorio de usuarios.");
  }

  // Configura botones, buscador, enter y logout
  setupEvents();
});


/**
 * Inicia una sesión de chat con un contacto específico
 * @param {Object} contact - Datos del usuario seleccionado
 */
function openChat(contact) {
  // Evita abrir chat con usuarios no disponibles
  if (!chatUI.isUserAvailable(contact)) {
    alert(`${contact.name} no está disponible en este momento.`);
    return;
  }

  selectedUserId = contact.id;
  selectedUser = contact;

  // Oculta la pantalla de bienvenida y muestra la conversación
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("chat-session").style.display = "flex";

  // Limpia los mensajes anteriores porque no hay historial persistente
  document.getElementById("messages-display").innerHTML = "";

  // Actualiza la cabecera del chat con el contacto seleccionado
  chatUI.updateChatHeader(contact);

  // Enfoca el campo de texto para escribir de inmediato
  document.getElementById("user-input").focus();

  updateSendButtonState();
}


// INICIO MODIFICACION FRONTEND: cerrar conversación activa sin cerrar sesión
function closeChat() {
  selectedUserId = null;
  selectedUser = null;

  const welcomeScreen = document.getElementById("welcome-screen");
  const chatSession = document.getElementById("chat-session");
  const messagesDisplay = document.getElementById("messages-display");

  if (welcomeScreen) welcomeScreen.style.display = "flex";
  if (chatSession) chatSession.style.display = "none";
  if (messagesDisplay) messagesDisplay.innerHTML = "";

  updateSendButtonState();
}


/**
 * Procesa y renderiza mensajes recibidos en tiempo real
 * @param {Object} msg - Estructura del mensaje {from, text, time}
 */
function handleIncoming(msg) {
  // Si el mensaje pertenece al chat abierto, se muestra en pantalla
  if (selectedUserId === msg.from) {
    chatUI.displayMessage(msg.text, "received");
  } else {
    // Si viene de otro usuario, muestra alerta básica
    const sender = allUsers.find((user) => user.id === msg.from);
    const senderName = sender?.name || msg.from;

    console.warn(`Mensaje en segundo plano recibido de: ${senderName}`);
    alert(`Mensaje institucional nuevo de: ${senderName}`);
  }
}


/**
 * Captura y envía el mensaje escrito por el usuario
 */
function send() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();

  // Valida que exista un contacto seleccionado
  if (!selectedUserId || !selectedUser) {
    alert("Seleccione un contacto para iniciar el chat.");
    return;
  }

  // Valida que el contacto siga disponible
  if (!chatUI.isUserAvailable(selectedUser)) {
    alert(`${selectedUser.name} no está disponible en este momento.`);
    updateSendButtonState();
    return;
  }

  // Valida que el WebSocket esté conectado antes de enviar
  if (!socket?.isConnected()) {
    alert("No hay conexión con el servidor de chat.");
    updateSendButtonState();
    return;
  }

  if (text) {
    const wasSent = socket.sendMessage(selectedUserId, text);

    if (!wasSent) {
      alert("No se pudo enviar el mensaje. Intente nuevamente.");
      return;
    }

    // Muestra el mensaje enviado en la pantalla del usuario actual
    chatUI.displayMessage(text, "sent");

    // Limpia el campo de texto después de enviar
    input.value = "";
  }
}


/**
 * Configuración de escuchas de eventos: clicks, Enter, buscador y logout
 */
function setupEvents() {
  const sendBtn = document.getElementById("send-message-btn");
  const userInput = document.getElementById("user-input");
  const logoutBtn = document.getElementById("logout-btn");

  // Buscador de contactos y botón volver
  const searchInput = document.getElementById("search-contact");
  const closeChatBtn = document.getElementById("close-chat");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterContacts(e.target.value);
    });
  }

  if (closeChatBtn) {
    closeChatBtn.onclick = closeChat;
  }

  // Envía mensaje al hacer clic en el botón
  if (sendBtn) sendBtn.onclick = send;

  // Envía mensaje al presionar Enter
  if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    });
  }

  // Cierra sesión, limpia localStorage y vuelve al login
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (socket) socket.disconnect();
      localStorage.removeItem("user");
      window.location.href = "login.html";
    };
  }

  updateSendButtonState();
}