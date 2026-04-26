/**
 * Clase encargada de manejar la conexión WebSocket del chat.
 * Permite conectar, recibir mensajes, enviar mensajes privados y reconectar si se cae.
 */
export class ChatSocket {
  constructor(userId, onMessageReceived, onStatusChange = null) {
    this.userId = userId;
    this.onMessageReceived = onMessageReceived;
    this.onStatusChange = onStatusChange;
    this.socket = null;

    // Configuración básica para reconexión automática
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1500;
    this.manualClose = false;
  }

  /**
   * Abre la conexión WebSocket usando el mismo servidor donde corre la app.
   * Funciona tanto en localhost como en ngrok.
   */
  connect() {
    this.manualClose = false;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}`;

    this.socket = new WebSocket(wsUrl);

    // Cuando conecta, identifica al usuario en el servidor
    this.socket.onopen = () => {
      console.log("WebSocket conectado:", wsUrl);

      this.reconnectAttempts = 0;
      this.notifyStatus("connected");

      this.socket.send(
        JSON.stringify({
          type: "identify",
          userId: this.userId,
        }),
      );
    };

    // Recibe mensajes del servidor y los pasa al controlador principal
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessageReceived(data);
      } catch (error) {
        console.error("Error leyendo mensaje WebSocket:", error);
      }
    };

    // Manejo básico de errores de conexión
    this.socket.onerror = (error) => {
      console.error("Error en WebSocket:", error);
      this.notifyStatus("error");
    };

    // Si se desconecta, intenta reconectar salvo que haya sido cierre manual
    this.socket.onclose = () => {
      console.warn("WebSocket desconectado");
      this.notifyStatus("disconnected");

      if (!this.manualClose) {
        this.tryReconnect();
      }
    };
  }

  /**
   * Intenta reconectar el WebSocket automáticamente.
   */
  tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("No se pudo reconectar al WebSocket");
      this.notifyStatus("failed");
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reintentando conexion WebSocket (${this.reconnectAttempts})...`);
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Verifica si el WebSocket está conectado.
   */
  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Envía un mensaje privado al usuario seleccionado.
   */
  sendMessage(toUserId, text) {
    if (!this.isConnected()) {
      console.warn("No se pudo enviar: WebSocket no conectado");
      return false;
    }

    this.socket.send(
      JSON.stringify({
        type: "private_message",
        from: this.userId,
        to: toUserId,
        text,
      }),
    );

    return true;
  }

  /**
   * Cierra la conexión manualmente, por ejemplo al cerrar sesión.
   */
  disconnect() {
    this.manualClose = true;

    if (this.socket) {
      this.socket.close();
    }
  }

  /**
   * Notifica al frontend el estado actual de la conexión.
   */
  notifyStatus(status) {
    if (typeof this.onStatusChange === "function") {
      this.onStatusChange(status);
    }
  }
}