const http = require('http');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const Twitter = require('twitter');

require('dotenv').config();

const port = process.env.PORT || 3000;

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_CONSUMER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_CONSUMER_ACCESS_TOKEN_SECRET
});

const game = {
  players: {},
  maxScore: 8,
  started: false
};

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
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getApp)
  .get('/controller', getController)
  .post('/controller', postController);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.broadcast = broadcast;

wss.on('connection', onSocketConnection);

server.listen(port, onListen);

function getApp(req, res) {
  res.render('index', {
    maxScore: game.maxScore,
    players: game.players,
    started: game.started
  });
}

function getController(req, res) {
  res.render('controller', { player: false });
}

function postController(req, res) {
  let color;
  if (game.players[req.body.name]) {
    color = game.players[req.body.name].color;
  } else {
    color = colors[Object.keys(game.players).length % colors.length];
    game.players[req.body.name] = {
      type: 'phone',
      color,
      score: 0
    };
  }

  wss.broadcast(
    JSON.stringify({
      action: 'NEW_PLAYER',
      player: game.players[req.body.name]
    })
  );

  res.render('controller', {
    player: game.players[req.body.name],
    name: req.body.name
  });
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
    } catch (err) {
      console.log('Message not in JSON:', message);
    }

    switch (message.device) {
      case 'nodemcu':
        return nodemcuMessage(socket, message);
      case 'scoreboard':
        return scoreboardMessage(socket, message);
      default:
        console.log('Device not recognized: ', message.device);
    }
  }
}

function nodemcuMessage(socket, message) {
  switch (message.action) {
    case 'JOIN_GAME':
      let color;

      if (game.players[message.id]) {
        color = game.players[message.id].color;
      } else {
        color = colors[Object.keys(game.players).length % colors.length];
        game.players[message.id] = {
          type: 'nodemcu',
          color,
          score: 0
        };
        wss.broadcast(
          JSON.stringify({
            action: 'NEW_PLAYER',
            player: game.players[message.id]
          })
        );
      }

      return socket.send(
        JSON.stringify({
          action: 'CHANGE_COLOR',
          color
        })
      );
    default:
      return false;
  }
}

function scoreboardMessage(socket, message) {
  // console.log(message);

  switch (message.action) {
    case 'SET_MAX_SCORE':
      game.maxScore = message.maxScore;
      wss.broadcast(JSON.stringify({
        action: 'SET_MAX_SCORE',
        maxScore: game.maxScore
      }));
      break;
    case 'MOVE_MOUSE':
      wss.broadcast(JSON.stringify(message));
    default:
      return false;
    case 'START_GAME':
      game.started = true;
      wss.broadcast(
        JSON.stringify({ action: 'START_GAME', maxScore: game.maxScore })
      );
      tweet('Daar gaan we!');
      break;
  }
}

function tweet(message) {
  client.post('statuses/update', {status: message},  function(error, tweet, response) {
    if(error) console.log(message);
  });
}
