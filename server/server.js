const http = require('http');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');

const port = process.env.PORT || 3000;

const players = {};

// Colors are in g, r, b
const colors = [
  [75, 0, 50], // Blue
  [25, 150, 0], // Red
  [100, 200, 0], // Orange
  [150, 125, 0], // Yellow
  [0, 150, 175], // Purple
  [175, 0, 25] // Green
];

const app = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname))
  .get('/', getApp);

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

wss.broadcast = broadcast;

wss.on('connection', onSocketConnection);

server.listen(port, onListen);

function getApp(req, res) {
  res.render('index');
}

function onListen() {
  console.log('Server started at port ' + port);
}

function broadcast(data) {
  wss.clients.forEach(sendData);

  function sendData(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function onSocketConnection(socket) {
  socket.on('message', onSocketMessage);

  function onSocketMessage(message) {
    try {
      message = JSON.parse(message);

      switch (message.device) {
        case 'nodemcu': return nodemcuMessage(socket, message);
        case 'scoreboard': return scoreboardMessage(message);
        default:
          console.log('Device not recognized: ', message.device);
      }
    } catch (err) {
      console.log('Message not in JSON:', message);
    }
  }
}

function nodemcuMessage(socket, message) {
  console.log(message);
  switch (message.action) {
    case 'JOIN_GAME':
      let color;

      if (players[message.id]) {
        color = players[message.id].color;
      } else {
        color = colors[Object.keys(players).length % colors.length];
        players[message.id] = {
          color, score: 0
        };
      }

      return socket.send(JSON.stringify({
        action: 'CHANGE_COLOR',
        color
      }));
    default: return false;
  }
}

function scoreboardMessage(message) {
  console.log(message);
}
