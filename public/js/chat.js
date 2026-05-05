/**
 * Controlador Principal del Chat - Universidad Católica Americana (UCA)
 * Autenticación base y sincronización de estados.
 */
import { getUsers } from "./services/api.js";
import { chatUI } from "./ui/chatUI.js";
import { ChatSocket } from "./web/chatSocket.js";

// --- 1. GESTIÓN DE SESIÓN ---
const initSession = () => {
  // Revisar si venimos de Google
  const cookies = document.cookie.split("; ");
  const userCookie = cookies.find((row) => row.startsWith("loggedUser="));

  if (userCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
      localStorage.clear(); // Limpiamos rastro de otros usuarios (como Roberto)
      localStorage.setItem("user", JSON.stringify(userData));
      document.cookie =
        "loggedUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      return userData;
    } catch (e) {
      console.error("Error en cookie:", e);
    }
  }

  // Si no hay cookie, cargar del almacenamiento local
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
};

const currentUser = initSession();

// --- 2. ESTADO GLOBAL ---
let socket = null;
let selectedUserId = null;
let selectedUser = null;
let allUsers = [];

// --- 3. FUNCIONES DE INTERFAZ ---

const updateSendButtonState = () => {
  const sendBtn = document.getElementById("send-message-btn");
  const userInput = document.getElementById("user-input");
  const canSend =
    selectedUserId &&
    selectedUser &&
    chatUI.isUserAvailable(selectedUser) &&
    socket?.isConnected();

  if (sendBtn) sendBtn.disabled = !canSend;
  if (userInput) {
    userInput.disabled = !canSend;
    userInput.placeholder = canSend
      ? "Escribe un mensaje..."
      : "Selecciona un contacto disponible...";
  }
};

const renderContacts = (users = allUsers) => {
  chatUI.renderUserList(users, currentUser, (user) => openChat(user));
};

// --- 4. INICIALIZACIÓN ---

document.addEventListener("DOMContentLoaded", async () => {
  if (!currentUser) return;

  // 1. Mostrar quién soy yo en la barra lateral
  chatUI.renderCurrentUserInfo(currentUser);

  try {
    // 2. Cargar lista inicial de usuarios
    allUsers = await getUsers();
    renderContacts(allUsers);

    // 3. Conectar WebSocket
    socket = new ChatSocket(
      currentUser.id,
      (data) => {
        if (data.type === "user_list_update") {
          allUsers = data.users;
          renderContacts(allUsers);

          // Actualizar el estado del chat abierto si el usuario cambió
          if (selectedUserId) {
            const updated = allUsers.find((u) => u.id === selectedUserId);
            if (updated) {
              selectedUser = updated;
              chatUI.updateChatHeader(selectedUser);
            }
          }
          updateSendButtonState();
        } else if (data.type === "new_message") {
          if (selectedUserId === data.from) {
            chatUI.displayMessage(data.text, "received");
          } else {
            alert(
              `Nuevo mensaje de: ${allUsers.find((u) => u.id === data.from)?.name || "Usuario"}`,
            );
          }
        }
      },
      (status) => {
        chatUI.updateConnectionStatus(status);
        updateSendButtonState();
      },
    );

    socket.connect();
  } catch (error) {
    console.error("Error al iniciar el chat:", error);
  }

  setupEvents();
});

// --- 5. LÓGICA DEL CHAT ---

function openChat(contact) {
  if (!chatUI.isUserAvailable(contact)) return alert("Usuario no disponible");

  selectedUserId = contact.id;
  selectedUser = contact;

  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("chat-session").style.display = "flex";
  document.getElementById("messages-display").innerHTML = ""; // Limpiar historial viejo

  chatUI.updateChatHeader(contact);
  document.getElementById("user-input").focus();
  updateSendButtonState();
}

function setupEvents() {
  // Buscador simple
  document.getElementById("search-contact")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.rol.toLowerCase().includes(term),
    );
    renderContacts(filtered);
  });

  // Cerrar sesión
  document.getElementById("logout-btn").onclick = () => {
    if (socket) socket.disconnect();
    localStorage.clear();
    window.location.href = "login.html";
  };

  // Botón cerrar chat (X)
  document.getElementById("close-chat").onclick = () => {
    selectedUserId = null;
    document.getElementById("welcome-screen").style.display = "flex";
    document.getElementById("chat-session").style.display = "none";
    updateSendButtonState();
  };

  // Envío de mensajes
  const send = () => {
    const input = document.getElementById("user-input");
    const text = input.value.trim();
    if (text && socket?.isConnected() && selectedUserId) {
      if (socket.sendMessage(selectedUserId, text)) {
        chatUI.displayMessage(text, "sent");
        input.value = "";
      }
    }
  };

  document.getElementById("send-message-btn").onclick = send;
  document.getElementById("user-input").onkeydown = (e) => {
    if (e.key === "Enter") send();
  };
  const avatar = document.getElementById("sidebar-avatar");
const name = document.getElementById("sidebar-name");

if (avatar) {
  avatar.src = currentUser.img || "./resources/default.png";
}

if (name) {
  name.textContent = currentUser.name || "Usuario";
}
}