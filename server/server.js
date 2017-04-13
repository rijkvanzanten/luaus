const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const WebSocket = require('ws');

// Scores. Save in memory for know. Could be upgraded to a DB in the long run
let scores = {};

const app = express()
  .use(compression())
  .use(bodyParser.urlencoded({extended: false}))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getScoreBoard)
  .get('/reset', resetScore);

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

wss.broadcast = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', ws => {
  ws.on('message', message => {
    message = JSON.parse(message);
    console.log(message);
    if (message.device === 'nodemcu') {
      socketMcu(ws, message);
    }
  });
});

server.listen(process.env.PORT || 3000, onListen);

function socketMcu(ws, message) {
  switch (message.code) {
    // New button connection
    case 0:
      scores[message.id] = 0;
      if (Object.keys(scores) % 2) {
        wss.broadcast(JSON.stringify({type: 'color', id: message.id, color: 'red'}));
      }

      wss.broadcast(JSON.stringify({type: 'color', id: message.id, color: 'blue'}));
      break;
    case 1:
      scores[message.id]++;
      wss.broadcast(JSON.stringify({type: 'score-update', id: message.id, score: scores[message.id]}));
      break;
  }
}

function resetScore(req, res) {
  scores = {};
  res.redirect('/');
}

function getScoreBoard(req, res) {
  // if (req.query.id) {
  //   if (req.query.id === '2936046') {
  //     player1++;
  //   } else {
  //     player2++;
  //   }
  //
  //   if (player1 >= 8) {
  //     winner = 'p1-win';
  //   } else if (player2 >= 8) {
  //     winner = 'p2-win';
  //   } else {
  //     winner = false;
  //   }
  //
  //   io.emit('score', {player1, player2, winner});
  // }
  res.render('scoreboard', {scores});
}

function onListen() {
  console.log('Server started at port ' + process.env.PORT || 3000);
}
