class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.socket = null;
  }

  connect(onMessageReceived) {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => console.log("WebSocket connection established");

    this.socket.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      if (onMessageReceived) {
        onMessageReceived(event.data);
      }
    };

    this.socket.onerror = (error) => console.error("WebSocket error:", error);

    this.socket.onclose = () => console.log("WebSocket connection closed");
  }

  sendMessage(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("Sending data to server:", data);
      this.socket.send(data);
    } else {
      console.error("WebSocket is not open. Unable to send data.");
    }
  }
}
