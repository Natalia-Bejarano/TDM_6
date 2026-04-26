// Lógica de perfil editable con localStorage

// Obtiene el usuario guardado después del login
const currentUser = JSON.parse(localStorage.getItem("user"));

// Si no hay usuario en sesión, redirige al login
if (!currentUser) {
  window.location.href = "login.html";
}

// Referencias al formulario y campos editables del perfil
const profileForm = document.getElementById("profile-form");
const nameInput = document.getElementById("profile-name-input");
const unitInput = document.getElementById("profile-unit-input");
const profileMessage = document.getElementById("profile-message");

// Referencias a las imágenes del usuario
const profileAvatar = document.getElementById("profile-avatar");
const sidebarAvatar = document.getElementById("sidebar-avatar");

// Referencias al nombre mostrado en diferentes partes de la página
const profileNameTitle = document.getElementById("profile-name-title");
const sidebarName = document.getElementById("sidebar-name");

// Referencias al rol y unidad académica
const profileRole = document.getElementById("profile-role");
const profileUnit = document.getElementById("profile-unit");

// Botón para regresar al chat
const backToChatBtn = document.getElementById("back-to-chat");

// Referencias a las opciones de notificaciones
const soundAlerts = document.getElementById("sound-alerts");
const desktopAlerts = document.getElementById("desktop-alerts");
const waitingAlerts = document.getElementById("waiting-alerts");
const saveNotificationsBtn = document.getElementById("save-notifications");

/**
 * Convierte el rol interno del usuario en un texto visible para la interfaz.
 */
function getRoleLabel(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "monitor") return "Docente / Monitor";
  if (normalizedRole === "student") return "Estudiante";

  return "Usuario institucional";
}

/**
 * Obtiene la unidad académica del usuario.
 * Si no existe, usa un texto por defecto.
 */
function getUserUnit(user) {
  return (
    user.academicUnit ||
    user.faculty ||
    user.specialty ||
    "Universidad Católica Americana"
  );
}

/**
 * Carga la información del usuario en la pantalla de perfil.
 */
function loadProfile() {
  const avatar = currentUser.img || "img/default.jpg";
  const unit = getUserUnit(currentUser);

  // Carga las imágenes del usuario
  profileAvatar.src = avatar;
  sidebarAvatar.src = avatar;

  // Carga el nombre del usuario
  profileNameTitle.textContent = currentUser.name || "Usuario";
  sidebarName.textContent = currentUser.name || "Usuario";

  // Carga el rol y la unidad académica
  profileRole.textContent = getRoleLabel(currentUser.rol);
  profileUnit.textContent = unit;

  // Carga los valores iniciales en los campos editables
  nameInput.value = currentUser.name || "";
  unitInput.value = unit;

  // Recupera las preferencias de notificación guardadas
  const notificationSettings = JSON.parse(
    localStorage.getItem("notificationSettings") || "{}",
  );

  soundAlerts.checked = notificationSettings.soundAlerts ?? true;
  desktopAlerts.checked = notificationSettings.desktopAlerts ?? false;
  waitingAlerts.checked = notificationSettings.waitingAlerts ?? true;
}

/**
 * Guarda los cambios del perfil en localStorage.
 */
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newName = nameInput.value.trim();
  const newUnit = unitInput.value.trim();

  // Validación básica para no guardar un nombre vacío
  if (!newName) {
    profileMessage.textContent = "El nombre no puede estar vacío.";
    profileMessage.className = "profile-message error";
    return;
  }

  // Crea una versión actualizada del usuario
  const updatedUser = {
    ...currentUser,
    name: newName,
    academicUnit: newUnit || "Universidad Católica Americana",
  };

  // Guarda los datos actualizados en localStorage
  localStorage.setItem("user", JSON.stringify(updatedUser));

  // Actualiza inmediatamente la información visible en pantalla
  profileNameTitle.textContent = updatedUser.name;
  sidebarName.textContent = updatedUser.name;
  profileUnit.textContent = updatedUser.academicUnit;

  profileMessage.textContent = "Perfil actualizado correctamente.";
  profileMessage.className = "profile-message success";
});

/**
 * Guarda las preferencias de notificaciones en localStorage.
 */
saveNotificationsBtn.addEventListener("click", () => {
  const settings = {
    soundAlerts: soundAlerts.checked,
    desktopAlerts: desktopAlerts.checked,
    waitingAlerts: waitingAlerts.checked,
  };

  localStorage.setItem("notificationSettings", JSON.stringify(settings));

  alert("Preferencias de notificación guardadas.");
});

/**
 * Regresa desde la página de perfil hacia el chat.
 */
backToChatBtn.addEventListener("click", () => {
  window.location.href = "chat.html";
});

// Carga los datos del perfil cuando se abre la página
loadProfile();

// lógica de perfil editable con localStorage