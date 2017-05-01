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
  maxScore: 10,
  playing: false,
  ended: false
};

// Colors are in g, r, b
const colors = [
  [75, 0, 50], // Lagoon
  [25, 150, 0], // Inferno
  [100, 200, 0], // Topaz
  [150, 125, 0], // Electric
  [0, 150, 175], // Amethyst
  [175, 0, 25], // Forest
  [0, 175, 75], // Pink
  [200, 75, 75], // Mint
  [50, 50, 200], // Steel
  [50, 200, 50], // Peach
  [0, 0, 175], // Sapphire
  [175, 0, 0] // Emerald
];

const app = express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getApp)
  .get('/controller', getController)
  .get('/reset', resetGame)
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
    playing: game.playing,
    ended: game.ended,
    message: ''
  });
}

function getController(req, res) {
  res.render('controller', { player: false });
}

function resetGame(req, res) {
  Object.keys(game.players).forEach(function(key, index) {
    game.players[key].score = 0;
  });

  res.render('index', {
    maxScore: game.maxScore,
    players: game.players,
    playing: false,
    ended: false,
    message: ''
  });

  // Reset color on NodeMCUs
  wss.broadcast(JSON.stringify({ action: 'RESET_GAME' }));
}

function postController(req, res) {
  let color;
  if (!game.playing) {
    if (game.players[req.body.name]) {
      color = game.players[req.body.name].color;
    } else {
      color = colors[Object.keys(game.players).length % colors.length];
      game.players[req.body.name] = {
        id: req.body.name,
        type: 'phone',
        color,
        score: 0
      };
    }

    wss.broadcast(
      JSON.stringify({
        device: 'phone',
        action: 'NEW_PLAYER',
        player: game.players[req.body.name]
      })
    );

    res.render('controller', {
      player: game.players[req.body.name],
      name: req.body.name
    });
  } else {
    res.render('index', {
      maxScore: game.maxScore,
      players: game.players,
      playing: game.playing,
      message: 'Game already started, you are now spectating'
    });
  }
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
      case 'phone':
        return phoneMessage(socket, message);
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
      console.log(message);
      if (!game.playing) {
        let color;

        if (game.players[message.id]) {
          color = game.players[message.id].color;
        } else {
          color = colors[Object.keys(game.players).length % colors.length];
          game.players[message.id] = {
            id: message.id,
            type: 'nodemcu',
            color,
            score: 0
          };

          console.log(game.players)

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
      } else {
        return socket.send(
          JSON.stringify({
            action: 'SPECTATE'
          })
        );
      }
      break;
    case 'UPDATE_SCORE':
      if (game.playing) {
        const player = game.players[message.id];
        console.log(message);

        player.score = player.score + 1;

        wss.broadcast(
          JSON.stringify({
            action: 'UPDATE_SCORE',
            id: message.id
          })
        );

        if (player.score === game.maxScore) {
          game.playing = false;
          game.ended = true;

          wss.broadcast(
            JSON.stringify({
              action: 'END_GAME',
              winner: player
            })
          );
        }
      }
      break;
    default:
      return false;
  }
}

function phoneMessage(socket, message) {
  switch (message.action) {
    case 'UPDATE_SCORE':
      if (game.playing) {
        const player = game.players[message.id];
        console.log(message);

        player.score = player.score + 1;

        wss.broadcast(
          JSON.stringify({
            action: 'UPDATE_SCORE',
            id: message.id
          })
        );

        if (player.score === game.maxScore) {
          game.playing = false;
          game.ended = true;

          wss.broadcast(
            JSON.stringify({
              action: 'END_GAME',
              winner: player
            })
          )
        }
      }
      break;
    default:
      return false;
  }
}

function scoreboardMessage(socket, message) {
  switch (message.action) {
    case 'SET_MAX_SCORE':
      console.log(message);

      game.maxScore = message.maxScore;
      wss.broadcast(JSON.stringify({
        action: 'SET_MAX_SCORE',
        maxScore: game.maxScore
      }));

      break;
    case 'MOVE_MOUSE':
      wss.broadcast(JSON.stringify(message));
      break;
    case 'START_GAME':
      if (Object.keys(game.players).length > 1) {
        console.log(message);

        game.playing = true;

        wss.broadcast(
          JSON.stringify({
            action: 'START_GAME',
            maxScore: game.maxScore,
            players: game.players
          })
        );
      }
      break;
    default:
      return false;
  }
}

function tweet(message) {
  client.post('statuses/update', {status: message},  function(error, tweet, response) {
    if(error) console.log(message);
  });
}
