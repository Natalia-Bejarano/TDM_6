/**
 * Controlador Principal del Chat - Universidad Católica Americana (UCA)
 * Orquestador de la interfaz de usuario y la comunicación bidireccional con Google OAuth.
 */
import { getUsers } from "./services/api.js";
import { chatUI } from "./ui/chatUI.js";
import { ChatSocket } from "./web/chatSocket.js";

// --- 1. GESTIÓN DE SESIÓN (ESTADO INICIAL) ---
let currentUser = null;

/**
 * Sincronizador de Sesión: Prioridad Máxima
 * Revisa si venimos de Google (Cookie) o si ya hay sesión local.
 */
const initSession = () => {
  // Primero: Revisar si el servidor nos mandó una cookie (Login de Google)
  const cookies = document.cookie.split("; ");
  const userCookie = cookies.find((row) => row.startsWith("loggedUser="));

  if (userCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));

      // Limpieza de seguridad: Borramos rastros de usuarios anteriores (ej. Roberto)
      localStorage.removeItem("user");

      // Guardamos la nueva sesión (ej. Adriana)
      localStorage.setItem("user", JSON.stringify(userData));

      // Expiramos la cookie para que no se repita el proceso al refrescar
      document.cookie =
        "loggedUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      console.log("✅ Sesión de Google sincronizada para:", userData.name);
    } catch (e) {
      console.error("❌ Error procesando sesión de Google:", e);
    }
  }

  // Segundo: Definir el usuario actual desde el almacenamiento final
  const user = JSON.parse(localStorage.getItem("user"));

  // Si después de buscar en cookie y localStorage no hay nadie, expulsar al login
  if (!user) {
    console.warn("⚠️ Usuario no autenticado. Redirigiendo...");
    window.location.href = "login.html";
    return null;
  }

  return user;
};

// EJECUCIÓN DE IDENTIDAD
currentUser = initSession();

// --- 2. ESTADO GLOBAL DE LA APP ---
let socket = null;
let selectedUserId = null;
let selectedUser = null;
let allUsers = [];
let socketStatus = "disconnected";

// --- 3. FUNCIONES DE VALIDACIÓN Y SEGURIDAD ---
function hasUnsafeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function hasControlCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

/**
 * Actualiza el estado del botón de enviar y del campo de texto.
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

// --- 4. GESTIÓN DE CONTACTOS Y FILTROS ---

function renderContacts(users = allUsers) {
  chatUI.renderUserList(users, currentUser, (user) => openChat(user));
}

function filterContacts(searchText) {
  const term = searchText.trim().toLowerCase();

  if (term.length > 80 || hasUnsafeHtml(term) || hasControlCharacters(term)) {
    renderContacts([]);
    return;
  }

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

function refreshSelectedUserFromList() {
  if (!selectedUserId) return;

  const updatedUser = allUsers.find((user) => user.id === selectedUserId);
  if (!updatedUser) return;

  selectedUser = updatedUser;
  chatUI.updateChatHeader(selectedUser);
  updateSendButtonState();
}

// --- 5. LÓGICA DE COMUNICACIÓN (WEBSOCKET) ---

/**
 * Inicialización de la aplicación al cargar el documento
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Si currentUser es null (porque initSession falló), no hacemos nada
  if (!currentUser) return;

  // Renderiza la información del usuario actual (Adriana)
  chatUI.renderCurrentUserInfo(currentUser);
  updateSendButtonState();

  // Configuración del Socket
  socket = new ChatSocket(
    currentUser.id,
    (data) => {
      if (data.type === "user_list_update") {
        allUsers = data.users;
        renderContacts(allUsers);
        refreshSelectedUserFromList();
      } else if (data.type === "new_message") {
        handleIncoming(data);
      }
    },
    (status) => {
      socketStatus = status;
      chatUI.updateConnectionStatus(status);
      updateSendButtonState();
    },
  );

  socket.connect();

  try {
    allUsers = await getUsers();
    renderContacts(allUsers);
  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }

  setupEvents();
});

// --- 6. EVENTOS DE INTERFAZ ---

function openChat(contact) {
  if (!chatUI.isUserAvailable(contact)) {
    alert(`${contact.name} no está disponible en este momento.`);
    return;
  }

  selectedUserId = contact.id;
  selectedUser = contact;

  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("chat-session").style.display = "flex";
  document.getElementById("messages-display").innerHTML = "";

  chatUI.updateChatHeader(contact);
  document.getElementById("user-input").focus();
  updateSendButtonState();
}

function closeChat() {
  selectedUserId = null;
  selectedUser = null;
  document.getElementById("welcome-screen").style.display = "flex";
  document.getElementById("chat-session").style.display = "none";
  updateSendButtonState();
}

function handleIncoming(msg) {
  if (selectedUserId === msg.from) {
    chatUI.displayMessage(msg.text, "received");
  } else {
    const sender = allUsers.find((user) => user.id === msg.from);
    alert(`Mensaje institucional nuevo de: ${sender?.name || "un monitor"}`);
  }
}

function send() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();

  if (
    !text ||
    text.length > 500 ||
    hasUnsafeHtml(text) ||
    hasControlCharacters(text)
  )
    return;

  if (socket?.isConnected() && selectedUserId) {
    const wasSent = socket.sendMessage(selectedUserId, text);
    if (wasSent) {
      chatUI.displayMessage(text, "sent");
      input.value = "";
    }
  }
}

function setupEvents() {
  const sendBtn = document.getElementById("send-message-btn");
  const userInput = document.getElementById("user-input");
  const logoutBtn = document.getElementById("logout-btn");
  const searchInput = document.getElementById("search-contact");
  const closeChatBtn = document.getElementById("close-chat");

  if (searchInput) {
    searchInput.addEventListener("input", (e) =>
      filterContacts(e.target.value),
    );
  }

  if (closeChatBtn) closeChatBtn.onclick = closeChat;
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
      if (socket) socket.disconnect();
      localStorage.clear();
      window.location.href = "login.html";
    };
  }
}
