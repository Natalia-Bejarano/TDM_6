/**
 * Módulo de Interfaz de Usuario (UI) - UCA
 * Gestiona la actualización visual del chat, contactos, mensajes y estado de conexión.
 */

// funciones auxiliares para seguridad
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
// funciones auxiliares para roles
function normalizeRole(role) {
  const normalized = String(role || "").toLowerCase();

  if (["student", "estudiante"].includes(normalized)) return "student";
  if (["monitor", "docente", "teacher", "profesor"].includes(normalized)) {
    return "monitor";
  }

  return normalized;
}

function getRoleLabel(role) {
  const normalized = normalizeRole(role);

  if (normalized === "monitor") return "Docente / Monitor";
  if (normalized === "student") return "Estudiante";

  return "Usuario";
}
// funciones auxiliares para disponibilidad
function getAvailableStatus(user) {
  const status = String(user?.status || "").toLowerCase();
  return ["online", "available", "disponible", "activo"].includes(status);
}

function getAvailabilityLabel(user) {
  return getAvailableStatus(user) ? "Disponible" : "No disponible";
}


export const chatUI = {
  // funciones que puede usar chat.js
  isUserAvailable(user) {
    return getAvailableStatus(user);
  },

  normalizeRole(role) {
    return normalizeRole(role);
  },


  // Renderiza el perfil del usuario actual en la barra lateral

  renderCurrentUserInfo(user) {
    const container = document.getElementById("current-user-info");
    if (!container) return;

    container.innerHTML = `
      <div class="user-header clickable-profile" title="Ver configuración de cuenta">
        <img src="${escapeHTML(user.img || "img/default.jpg")}" class="avatar-sm">
        <div class="details">
          <strong>${escapeHTML(user.name)}</strong>
          <span>${getRoleLabel(user.rol)}</span>
        </div>
      </div>
    `;
      //hacer clic en perfil del usuario para ir a configuracion

    container.onclick = () => {
      window.location.href = "profile.html";
    };
  },


  // Genera la lista de contactos filtrada por rol: Monitor o Estudiante
  renderUserList(users, currentUser, onSelect) {
    const listContainer = document.getElementById("contact-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    const currentRole = normalizeRole(currentUser.rol);

    const filtered = users.filter((u) => {
      if (u.id === currentUser.id) return false;

      const userRole = normalizeRole(u.rol);

      if (currentRole === "student") return userRole === "monitor";
      if (currentRole === "monitor") return userRole === "student";

      return false;
    });

    // mensaje cuando no hay contactos visibles
    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-contact-list">
          No hay contactos disponibles para tu rol o búsqueda.
        </div>
      `;
      return;
    }

    filtered.forEach((user) => {
      const available = getAvailableStatus(user);
      const item = document.createElement("div");

      // clases para contactos disponibles o no disponibles
      item.className = `contact-item ${escapeHTML(user.status || "offline")} ${
        available ? "" : "contact-disabled"
      }`;

      item.innerHTML = `
        <div class="avatar-wrapper">
          <img src="${escapeHTML(user.img || "img/default.jpg")}" class="avatar" alt="Foto de ${escapeHTML(user.name)}">
          <span class="status-dot"></span>
        </div>

        <div class="contact-details">
          <div class="contact-name">${escapeHTML(user.name)}</div>
          <div class="contact-extra">${escapeHTML(user.specialty || user.faculty || "")}</div>
          <small class="contact-status-text">${getAvailabilityLabel(user)}</small>
        </div>
      `;

      // marcar contacto seleccionado y bloquear offline
      item.onclick = () => {
        if (!available) {
          alert(`${user.name} no está disponible en este momento.`);
          return;
        }

        document.querySelectorAll(".contact-item").forEach((contact) => {
          contact.classList.remove("selected");
        });

        item.classList.add("selected");

        onSelect(user);
      };

      listContainer.appendChild(item);
    });
  },


  /**
   * ACTUALIZACIÓN: Actualiza la cabecera del chat con el contacto activo
   */
  updateChatHeader(contact) {
    const headerInfo = document.getElementById("active-contact-info");
    if (!headerInfo) return;

    headerInfo.innerHTML = `
      <div class="active-user-header">
        <img src="${escapeHTML(contact.img || "img/default.jpg")}" class="avatar-sm" alt="Foto de ${escapeHTML(contact.name)}">
        <div>
          <strong>${escapeHTML(contact.name)}</strong>
          <small>${escapeHTML(contact.specialty || contact.faculty || "")}</small>
          <small class="active-contact-status">${getAvailabilityLabel(contact)}</small>
        </div>
      </div>
    `;
  },


  /**
   * ACTUALIZACIÓNN: Renderiza una burbuja de mensaje en pantalla
   */
  displayMessage(text, type) {
    const container = document.getElementById("messages-display");
    if (!container) return;

    const msgDiv = document.createElement("div");

    // "sent" para mis mensajes, "received" para mensajes recibidos
    msgDiv.className = `message-bubble ${type}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // escapeHTML evita inyección de HTML o scripts
    msgDiv.innerHTML = `
      <div class="text-content">${escapeHTML(text)}</div>
      <div class="message-time">${timeStr}</div>
    `;

    container.appendChild(msgDiv);

    // AutoScroll para ver siempre el último mensaje
    container.scrollTop = container.scrollHeight;
  },


  // Mostrar estado de conexión del WebSocket
  updateConnectionStatus(status) {
    const welcomeTitle = document.getElementById("welcome-title");
    const welcomeMsg = document.getElementById("welcome-msg");

    if (!welcomeTitle || !welcomeMsg) return;

    if (status === "connected") {
      welcomeTitle.textContent = "Chat institucional";
      welcomeMsg.textContent = "Seleccione una conversación para comenzar.";
    } else if (status === "disconnected") {
      welcomeTitle.textContent = "Reconectando...";
      welcomeMsg.textContent = "Se perdió la conexión con el servidor.";
    } else if (status === "failed") {
      welcomeTitle.textContent = "Sin conexión";
      welcomeMsg.textContent = "No se pudo conectar con el servidor de chat.";
    } else if (status === "error") {
      welcomeTitle.textContent = "Problema de conexión";
      welcomeMsg.textContent = "El canal de chat reportó un error.";
    }
  },
};