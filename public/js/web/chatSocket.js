// public/js/web/chatSocket.js - Cliente WebSocket
export class ChatSocket {
  constructor(userId, onMessageReceived) {
    this.userId = userId;
    this.onMessageReceived = onMessageReceived;
    this.socket = null;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    this.socket = new WebSocket(`${protocol}://${window.location.host}`);

    this.socket.onopen = () => {
      this.socket.send(
        JSON.stringify({ type: "identify", userId: this.userId }),
      );
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // PASAMOS TODO EL OBJETO DATA AL CALLBACK
      this.onMessageReceived(data);
    };
  }

  sendMessage(toUserId, text) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "private_message",
          from: this.userId,
          to: toUserId,
          text,
        }),
      );
    }
  }
}
