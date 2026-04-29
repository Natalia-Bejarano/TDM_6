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
  if (["monitor", "docente", "teacher", "profesor"].includes(normalized)) return "monitor";
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

  isUserAvailable(user) {
    return getAvailableStatus(user);
  },

  normalizeRole(role) {
    return normalizeRole(role);
  },


  // ── Sidebar adaptado por rol ──
  renderCurrentUserInfo(user) {
    const role = normalizeRole(user.rol);

    if (role === "monitor") {
      // Mostrar sidebar institucional
      const monitorSidebar = document.getElementById("sidebar-monitor");
      if (monitorSidebar) monitorSidebar.style.display = "flex";

      const avatar = document.getElementById("monitor-sidebar-avatar");
      const name   = document.getElementById("monitor-sidebar-name");
      if (avatar) avatar.src = escapeHTML(user.img || "img/default.jpg");
      if (name)   name.textContent = user.name || "Usuario";

    } else {
      // Mostrar sidebar de estudiante
      const studentSidebar = document.getElementById("sidebar-student");
      if (studentSidebar) studentSidebar.style.display = "flex";

      const container = document.getElementById("current-user-info");
      if (!container) return;

      container.innerHTML = `
        <div class="user-header clickable-profile" title="Ver configuración de cuenta">
          <img src="${escapeHTML(user.img || "img/default.jpg")}" class="avatar-sm" alt="Mi perfil">
          <div class="details">
            <strong>${escapeHTML(user.name)}</strong>
            <span>${getRoleLabel(user.rol)}</span>
          </div>
        </div>
      `;

      container.onclick = () => { window.location.href = "profile.html"; };
    }
  },


  // ── Lista de contactos (sidebar estudiante) ──
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
        <div class="empty-contact-list">
          No hay contactos disponibles para tu rol o búsqueda.
        </div>
      `;
      return;
    }

    filtered.forEach((user) => {
      const available = getAvailableStatus(user);
      const item = document.createElement("div");

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

      item.onclick = () => {
        if (!available) {
          alert(`${user.name} no está disponible en este momento.`);
          return;
        }
        document.querySelectorAll(".contact-item").forEach((c) => c.classList.remove("selected"));
        item.classList.add("selected");
        onSelect(user);
      };

      listContainer.appendChild(item);
    });
  },


  // ── Cabecera del chat activo ──
  updateChatHeader(contact) {
    const headerInfo = document.getElementById("active-contact-info");
    if (!headerInfo) return;

    headerInfo.innerHTML = `
      <div class="active-user-header">
        <img src="${escapeHTML(contact.img || "img/default.jpg")}" class="avatar-sm" alt="Foto de ${escapeHTML(contact.name)}">
        <div>
          <strong>${escapeHTML(contact.name)}</strong>
          <small>${contact.id ? `UCA-${escapeHTML(String(contact.id))}` : ""}</small>
          <small>${escapeHTML(contact.specialty || contact.faculty || "")}</small>
        </div>
      </div>
    `;
  },


  // ── Burbuja de mensaje ──
  displayMessage(text, type) {
    const container = document.getElementById("messages-display");
    if (!container) return;

    const msgDiv = document.createElement("div");
    msgDiv.className = `message-bubble ${type}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    msgDiv.innerHTML = `
      <div class="text-content">${escapeHTML(text)}</div>
      <div class="message-time">${timeStr}</div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },


  // ── Bandeja del monitor ──
  updateConnectionStatus(status) {
    const welcomeScreen = document.getElementById("welcome-screen");
    if (!welcomeScreen) return;

    if (!document.getElementById("inbox-topbar")) {
      welcomeScreen.innerHTML = `
        <div id="inbox-topbar" class="inbox-topbar">
          <h2>Bandeja de consultas entrantes</h2>
          <button class="availability-badge" id="availability-toggle">
            <span class="availability-dot"></span>
            Disponible ▾
          </button>
        </div>
        <p class="inbox-subtitle">
          Gestione las solicitudes de chat pendientes y responda a las consultas activas de la comunidad universitaria.
        </p>
        <div class="inbox-searchbar">
          <input type="text" placeholder="Buscar estudiante por nombre, ID o facultad..." />
          <span class="search-icon">🔍</span>
        </div>
        <p class="inbox-section-label">En espera</p>
        <div class="inbox-list" id="inbox-list"></div>
      `;
    }

    if (status === "disconnected") {
      const title = document.querySelector("#inbox-topbar h2");
      if (title) title.textContent = "Reconectando...";
    } else if (status === "failed" || status === "error") {
      const title = document.querySelector("#inbox-topbar h2");
      if (title) title.textContent = "Sin conexión al servidor";
    }
  },


  // ── Añade tarjeta a la bandeja ──
  addInboxCard(user, onSelect) {
    const list = document.getElementById("inbox-list");
    if (!list) return;

    const card = document.createElement("div");
    card.className = "inbox-card";
    card.dataset.userId = user.id;

    const preview = escapeHTML(user.lastMessage || "Nueva consulta entrante");
    const timeLabel = user.waitTime || "5 min";

    card.innerHTML = `
      <img src="${escapeHTML(user.img || "img/default.jpg")}" alt="Foto de ${escapeHTML(user.name)}">
      <div class="inbox-card-body">
        <div class="inbox-card-name">${escapeHTML(user.name)}</div>
        <div class="inbox-card-meta">
          UCA-${escapeHTML(String(user.id))}<br>
          ${escapeHTML(user.specialty || user.faculty || "")}
        </div>
      </div>
      <div class="inbox-card-preview">"${preview}"</div>
      <div class="inbox-badge">${escapeHTML(timeLabel)}</div>
    `;

    card.onclick = () => {
      document.querySelectorAll(".inbox-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      if (onSelect) onSelect(user);
    };

    list.appendChild(card);
  },


  // ── Mueve tarjeta a "Consultas en curso" ──
  moveCardToActive(userId) {
    const card = document.querySelector(`.inbox-card[data-user-id="${userId}"]`);
    if (!card) return;

    let activeList = document.getElementById("active-inbox-list");

    if (!activeList) {
      const inboxList = document.getElementById("inbox-list");

      const activeSection = document.createElement("p");
      activeSection.className = "inbox-section-label";
      activeSection.textContent = "Consultas en curso";
      inboxList.after(activeSection);

      activeList = document.createElement("div");
      activeList.id = "active-inbox-list";
      activeList.className = "inbox-list";
      activeSection.after(activeList);
    }

    card.classList.add("inbox-card--active-chat");
    const previewEl = card.querySelector(".inbox-card-preview");
    if (previewEl) previewEl.textContent = 'Tú: "..."';

    activeList.appendChild(card);
  },
};