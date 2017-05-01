module.exports = function broadcast(data) {
  wss.clients.forEach(sendData);

  function sendData(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
