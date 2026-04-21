// src/web/chat.js - Lógica de WebSockets en el servidor
const activeConnections = new Map(); // Mapa para asociar userId con su conexión (Socket)

function setupChat(wss) {
  wss.on("connection", (ws) => {
    let currentUserId = null;

    ws.on("message", (rawData) => {
      try {
        const message = JSON.parse(rawData.toString());

        // Identificar al usuario y guardar su conexión
        if (message.type === "identify") {
          currentUserId = message.userId;
          activeConnections.set(currentUserId, ws);
          console.log(`Usuario ${currentUserId} conectado.`);
        }

        // Manejar envío de mensajes privados
        if (message.type === "private_message") {
          const { to, text, from } = message;
          const recipientSocket = activeConnections.get(to);

          // Si el destinatario está online, enviarle el mensaje
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
        console.error("Error procesando mensaje:", err);
      }
    });

    // Limpiar al desconectar
    ws.on("close", () => {
      if (currentUserId) activeConnections.delete(currentUserId);
    });
  });
}

module.exports = setupChat;
