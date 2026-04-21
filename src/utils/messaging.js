/**
 * Envía un mensaje a un destinatario específico (1 a 1)
 * @param {Array} users - Arreglo de usuarios conectados con sus objetos ws
 * @param {String} targetId - ID del usuario que debe recibir el mensaje
 * @param {Object} data - Objeto con la información del mensaje
 */
function sendTo(users, targetId, data) {
  const msg = JSON.stringify(data);
  const recipient = users.find((u) => u.id === targetId);

  if (recipient && recipient.ws.readyState === 1) {
    recipient.ws.send(msg);
  } else {
    console.log(`Error: Usuario ${targetId} no encontrado o desconectado.`);
  }
}
function broadcast(users, data) {
  const msg = JSON.stringify(data);
  users.forEach((u) => {
    if (u.ws.readyState === 1) {
      //
      u.ws.send(msg);
    }
  });
}

module.exports = { broadcast, sendTo };

