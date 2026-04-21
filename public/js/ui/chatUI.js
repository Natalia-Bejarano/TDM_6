/**
 * Módulo de Interfaz de Usuario (UI) - UCA
 * Gestiona la actualización visual del chat y la lista de contactos.
 */
export const chatUI = {
  // Renderiza el perfil del usuario actual en la barra lateral
  renderCurrentUserInfo(user) {
    const container = document.getElementById("current-user-info");
    if (!container) return;

    container.innerHTML = `
            <div class="user-header">
                <img src="${user.img || "img/default.jpg"}" class="avatar-sm">
                <div class="details">
                    <strong>${user.name}</strong>
                    <span>${user.rol === "monitor" ? "Monitor" : "Estudiante"}</span>
                </div>
            </div>
        `;
  },

  // Genera la lista de contactos filtrada por rol (Monitor <-> Estudiante)
  renderUserList(users, currentUser, onSelect) {
    const listContainer = document.getElementById("contact-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const filtered = users.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (currentUser.rol === "student") return u.rol === "monitor";
      if (currentUser.rol === "monitor") return u.rol === "student";
      return false;
    });

    filtered.forEach((user) => {
      const item = document.createElement("div");
      item.className = `contact-item ${user.status}`;
      item.innerHTML = `
                <div class="avatar-wrapper">
                    <img src="${user.img || "img/default.jpg"}" class="avatar">
                    <span class="status-dot"></span>
                </div>
                <div class="contact-details">
                    <div class="contact-name">${user.name}</div>
                    <div class="contact-extra">${user.specialty || user.faculty || ""}</div>
                </div>
            `;
      item.onclick = () => onSelect(user);
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
            <img src="${contact.img || "img/default.jpg"}" class="avatar-sm">
            <div>
                <strong>${contact.name}</strong>
                <small>${contact.specialty || contact.faculty || ""}</small>
            </div>
        </div>
    `;
  },

  /**
   * ACTUALIZACIÓN: Renderiza una burbuja de mensaje en pantalla
   */
  displayMessage(text, type) {
    const container = document.getElementById("messages-display");
    if (!container) return;

    const msgDiv = document.createElement("div");
    // 'sent' para mis mensajes (derecha), 'received' para los del otro (izquierda)
    msgDiv.className = `message-bubble ${type}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    msgDiv.innerHTML = `
        <div class="text-content">${text}</div>
        <div class="message-time">${timeStr}</div>
    `;

    container.appendChild(msgDiv);

    // Auto-scroll para ver siempre el último mensaje
    container.scrollTop = container.scrollHeight;
  },
};
