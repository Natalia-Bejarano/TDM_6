/**
 * Módulo de Interfaz de Usuario (UI) - UCA
 * Gestiona la actualización visual del chat, contactos, mensajes y estado de conexión.
 */

// --- Funciones auxiliares de seguridad ---
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// --- Funciones auxiliares de roles ---
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

// --- Funciones auxiliares de disponibilidad ---
function getAvailableStatus(user) {
  const status = String(user?.status || "").toLowerCase();
  return ["online", "available", "disponible", "activo"].includes(status);
}

function getAvailabilityLabel(user) {
  return getAvailableStatus(user) ? "Disponible" : "No disponible";
}

export const chatUI = {
  isUserAvailable(user) {
    return getAvailableStatus(user);
  },

  normalizeRole(role) {
    return normalizeRole(role);
  },

  // 1. RENDERIZAR USUARIO ACTUAL (VALENTINA/ADRIANA)
  renderCurrentUserInfo(user) {
    const container = document.getElementById("current-user-info");
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.location.href='profile.html'">
          <div class="current-user-avatar">
            <img src="${escapeHTML(user.img || "resources/default.png")}" alt="Foto de Perfil">
            <span class="current-avatar-status"></span>
          </div>
          <div class="current-user-details">
            <span class="current-user-name">${escapeHTML(user.name)}</span>
            <span class="current-user-role">${getRoleLabel(user.rol)}</span>
          </div>
        </div>
        
        <button id="mobile-logout-btn" class="mobile-logout-btn" title="Cerrar sesión">
          <!-- Ícono de "Salir" de FeatherIcons -->
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    `;

    // Lógica para cerrar sesión desde el móvil
    const logoutBtn = document.getElementById("mobile-logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = (e) => {
        e.stopPropagation(); // Evita que se dispare el clic que lleva al perfil
        localStorage.removeItem("user");
        window.location.href = "login.html";
      };
    }
  },

  // 2. RENDERIZAR DIRECTORIO DE CONTACTOS
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

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-contact-list" style="padding: 20px; color: #7a93b2; text-align: center; font-size: 13px;">
          No hay contactos disponibles para tu rol o búsqueda.
        </div>
      `;
      return;
    }

    filtered.forEach((user) => {
      const available = getAvailableStatus(user);
      const item = document.createElement("div");

      const statusClass = available ? "online" : "offline";
      item.className = `contact-card ${statusClass}`;

      item.innerHTML = `
        <div class="contact-avatar">
          <img src="${escapeHTML(user.img || "resources/default.png")}" alt="Foto de ${escapeHTML(user.name)}">
          <span class="avatar-status"></span>
        </div>
        <div class="contact-info">
          <span class="contact-name">${escapeHTML(user.name)}</span>
          <span class="contact-meta">${escapeHTML(user.specialty || user.faculty || "")}</span>
          <span class="contact-status-text">${getAvailabilityLabel(user)}</span>
        </div>
      `;

      item.onclick = () => {
        if (!available) {
          alert(`${user.name} no está disponible en este momento.`);
          return;
        }

        document.querySelectorAll(".contact-card").forEach((contact) => {
          contact.classList.remove("active");
        });
        item.classList.add("active");

        const chatMain = document.querySelector(".chat-main");
        if (chatMain) {
          chatMain.classList.add("show-chat-mobile");
        }

        onSelect(user);
      };

      listContainer.appendChild(item);
    });
  },

  // 3. ACTUALIZAR CABECERA DEL CHAT
  updateChatHeader(contact) {
    const headerInfo = document.getElementById("active-contact-info");
    if (!headerInfo) return;

    headerInfo.innerHTML = `
      <img src="${escapeHTML(contact.img || "resources/default.png")}" alt="Foto de ${escapeHTML(contact.name)}">
      <div class="active-contact-details">
        <span class="active-contact-name">${escapeHTML(contact.name)}</span>
        <span class="active-contact-sub">${getAvailabilityLabel(contact)} • ${escapeHTML(contact.specialty || contact.faculty || "")}</span>
      </div>
    `;
  },

  // 4. RENDERIZAR BURBUJAS DE MENSAJES
  displayMessage(text, type) {
    const container = document.getElementById("messages-display");
    if (!container) return;

    const wrapper = document.createElement("div");
    const wrapperClass = type === "sent" ? "outgoing" : "incoming";
    wrapper.className = `message-wrapper ${wrapperClass}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    wrapper.innerHTML = `
      <div class="message-bubble">
        <div class="text-content">${escapeHTML(text)}</div>
      </div>
      <div class="message-time">${timeStr}</div>
    `;

    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  },

  // 5. ESTADO DE CONEXIÓN
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

  // 6. NUEVA FUNCIÓN: CONFIGURAR BOTÓN VOLVER (MÓVIL)
  setupMobileBackButton() {
    // Busca el botón con la clase .back-btn
    const backBtn = document.querySelector(".back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        const chatMain = document.querySelector(".chat-main");
        if (chatMain) {
          // Al quitar la clase, el panel de chat se desliza de vuelta a la derecha
          chatMain.classList.remove("show-chat-mobile");
        }
      });
    }
  },
};
