/**
 * Capa de Transporte de Red - Universidad Católica Americana (UCA)
 * Proporciona métodos abstractos para la emisión de datos a través de WebSockets.
 */

/**
 * Transmite un mensaje a todos los nodos conectados (Broadcast masivo)
 * @param {Map} activeConnections - Diccionario de sockets activos {userId: socket}
 * @param {Object} data - Carga útil (payload) a serializar y enviar
 */
function broadcast(activeConnections, data) {
  const msg = JSON.stringify(data);

  activeConnections.forEach((socket, userId) => {
    // Verificación del estado de la conexión antes del envío (1 = OPEN)
    if (socket && socket.readyState === 1) {
      try {
        socket.send(msg);
      } catch (err) {
        // Registro silencioso de fallos de red por nodo
        console.error(
          `[Transport Error] Nodo ${userId} inaccesible:`,
          err.message,
        );
      }
    }
  });
}

/**
 * Envía un mensaje a un destinatario único (Mensajería dirigida 1 a 1)
 * @param {Map} activeConnections - Diccionario de sockets activos
 * @param {String} targetId - Identificador único del receptor
 * @param {Object} data - Carga útil a enviar
 * @returns {Boolean} Confirmación de intento de envío
 */
function sendTo(activeConnections, targetId, data) {
  const socket = activeConnections.get(targetId);
  const msg = JSON.stringify(data);

  if (socket && socket.readyState === 1) {
    socket.send(msg);
    return true;
  }

  return false;
}

module.exports = { broadcast, sendTo };
