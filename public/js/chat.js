/**
 * Controlador Principal del Chat - Universidad Católica Americana (UCA)
 * Gestión de sesiones, sockets y notificaciones.
 */
import { getUsers } from "./services/api.js";
import { chatUI } from "./ui/chatUI.js";
import { ChatSocket } from "./web/chatSocket.js";

// --- 1. GESTIÓN DE SESIÓN ---
const initSession = () => {
  const cookies = document.cookie.split("; ");
  const userCookie = cookies.find((row) => row.startsWith("loggedUser="));

  if (userCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
      localStorage.clear();
      localStorage.setItem("user", JSON.stringify(userData));
      // Limpiamos la cookie para que no interfiera en el siguiente inicio
      document.cookie =
        "loggedUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      return userData;
    } catch (e) {
      console.error("Error en cookie:", e);
    }
  }

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

  // 1. Mostrar información del usuario actual en el sidebar
  chatUI.renderCurrentUserInfo(currentUser);

  const avatar = document.getElementById("sidebar-avatar");
  const nameDisplay = document.getElementById("sidebar-name");

  if (avatar) {
    avatar.src = currentUser.img || "/resources/default.png";
    avatar.onerror = function () {
      this.src = "/resources/default.png";
      this.onerror = null;
    };
  }
  if (nameDisplay) {
    nameDisplay.textContent = currentUser.name || "Usuario";
  }

  try {
    // 2. Carga inicial de contactos
    allUsers = await getUsers();
    renderContacts(allUsers);

    // 3. Conexión al Socket
    socket = new ChatSocket(
      currentUser.id,
      (data) => {
        if (data.type === "user_list_update") {
          allUsers = data.users;
          renderContacts(allUsers);

          if (selectedUserId) {
            const updated = allUsers.find((u) => u.id === selectedUserId);
            if (updated) {
              selectedUser = updated;
              chatUI.updateChatHeader(selectedUser);
            }
          }
          updateSendButtonState();
        }
        // --- NOTIFICACIÓN DE NUEVOS MENSAJES ---
        else if (data.type === "new_message") {
          if (selectedUserId === data.from) {
            // Si el chat está abierto, mostramos el mensaje directamente
            chatUI.displayMessage(data.text, "received");
          } else {
            // Si el mensaje es de otra persona, lanzamos el aviso
            const sender = allUsers.find((u) => u.id === data.from);
            alert(
              `💬 Nuevo mensaje de: ${sender ? sender.name : "un usuario"}`,
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

  // --- ACTIVAR BOTÓN VOLVER (MÓVIL) ---
  // Llamamos a la función de chatUI que configuramos en el paso anterior
  chatUI.setupMobileBackButton();
});

// --- 5. LÓGICA DEL CHAT ---
function openChat(contact) {
  // Aviso de persona no disponible
  if (!chatUI.isUserAvailable(contact)) return alert("Usuario no disponible");

  selectedUserId = contact.id;
  selectedUser = contact;

  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("chat-session").style.display = "flex";
  document.getElementById("messages-display").innerHTML = "";

  chatUI.updateChatHeader(contact);
  document.getElementById("user-input").focus();
  updateSendButtonState();
}

function setupEvents() {
  // Buscador de contactos
  document.getElementById("search-contact")?.addEventListener("input", (e) => {
    let term = e.target.value;

    if (term.length > 50) {
      e.target.value = term.substring(0, 50);
      term = e.target.value;
    }

    const cleanTerm = term.toLowerCase().trim().replace(/[<>]/g, "");

    const filtered = allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(cleanTerm) ||
        u.rol.toLowerCase().includes(cleanTerm),
    );

    renderContacts(filtered);
  });

  // Logout (Desktop)
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (socket) socket.disconnect();
      localStorage.clear();
      window.location.href = "login.html";
    };
  }

  // Botón cerrar chat actual (X) o Volver
  const closeChatBtn = document.getElementById("close-chat");
  if (closeChatBtn) {
    closeChatBtn.onclick = () => {
      selectedUserId = null;
      selectedUser = null;

      // Vuelve a la pantalla de bienvenida (En PC)
      document.getElementById("welcome-screen").style.display = "flex";
      document.getElementById("chat-session").style.display = "none";
      updateSendButtonState();

      const chatMain = document.querySelector(".chat-main");
      if (chatMain) {
        chatMain.classList.remove("show-chat-mobile");
      }
    };
  }

  const send = () => {
    const input = document.getElementById("user-input");
    const text = input.value.trim();

    if (!text) return;

    if (text.length > 500) {
      alert(
        "⚠️ Tu mensaje es demasiado largo. El límite es de 500 caracteres.",
      );
      return;
    }

    if (socket?.isConnected() && selectedUserId) {
      if (socket.sendMessage(selectedUserId, text)) {
        chatUI.displayMessage(text, "sent");
        input.value = "";
        input.focus();
      }
    } else {
      alert("⚠️ No se pudo enviar el mensaje. Revisa tu conexión.");
    }
  };

  const sendBtn = document.getElementById("send-message-btn");
  if (sendBtn) sendBtn.onclick = send;

  const userInput = document.getElementById("user-input");
  if (userInput) {
    userInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    };
  }
}
