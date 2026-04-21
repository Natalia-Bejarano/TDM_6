/**
 * Motor de Presencia y Mensajería (WebSocket) - UCA
 * Gestiona el ciclo de vida de las conexiones y la persistencia de estados.
 */

const { getUsers, saveUsers } = require("../models/users");
const { broadcast } = require("../utils/messaging");

// Registro de sockets activos indexados por ID de usuario
const activeConnections = new Map();

/**
 * Inicializa el canal de comunicación en tiempo real
 * @param {WebSocket.Server} wss - Instancia del servidor WebSocket
 */
function setupChat(wss) {
  wss.on("connection", (ws) => {
    let currentUserId = null;

    // Manejo de eventos de entrada
    ws.on("message", async (rawData) => {
      try {
        const message = JSON.parse(rawData.toString());

        // PROTOCOLO 1: Registro de presencia (Identify)
        if (message.type === "identify") {
          currentUserId = message.userId;
          activeConnections.set(currentUserId, ws);

          const users = await getUsers();
          const userIndex = users.findIndex((u) => u.id === currentUserId);

          if (userIndex !== -1) {
            users[userIndex].status = "online";
            await saveUsers(users);
          }

          // Notificación masiva de actualización de directorio
          broadcast(activeConnections, {
            type: "user_list_update",
            users: users,
          });

          console.log(`[Socket] Nodo activo: ${currentUserId}`);
        }

        // PROTOCOLO 2: Mensajería Privada (1 a 1)
        if (message.type === "private_message") {
          const { to, text, from } = message;
          const recipientSocket = activeConnections.get(to);

          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(
              JSON.stringify({
                type: "new_message",
                from,
                text,
                time: new Date().toISOString(),
              }),
            );
          }
        }
      } catch (err) {
        console.error("⚠️ Fallo en el procesamiento de payload:", err.message);
      }
    });

    // MANEJO DE DESCONEXIÓN (Cierre de sesión o pestaña)
    ws.on("close", async () => {
      try {
        if (currentUserId) {
          activeConnections.delete(currentUserId);

          const users = await getUsers();
          const userIndex = users.findIndex((u) => u.id === currentUserId);

          if (userIndex !== -1) {
            users[userIndex].status = "offline";
            await saveUsers(users);

            // Sincronización masiva de estado offline
            broadcast(activeConnections, {
              type: "user_list_update",
              users: users,
            });

            console.log(`[Socket] Nodo liberado: ${currentUserId}`);
          }
        }
      } catch (err) {
        console.error(
          "❌ Error crítico en liberación de recursos:",
          err.message,
        );
      }
    });

    // Control de errores de transporte para evitar caídas del proceso principal
    ws.on("error", (err) => {
      console.error(
        `🔴 Error de transporte (${currentUserId || "Unknown"}):`,
        err.message,
      );
    });
  });
}

module.exports = setupChat;
