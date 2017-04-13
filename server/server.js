const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const WebSocket = require('ws');

// Scores. Save in memory for know. Could be upgraded to a DB in the long run
const player1 = {
  id: null,
  score: 0
};

const player2 = {
  id: null,
  score: 0
};

const app = express()
  .use(compression())
  .use(bodyParser.urlencoded({extended: false}))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getScoreBoard)
  .get('/reset', resetScore);

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

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
    case 0:
      if (player1.id) {
        player2.id = message.id;
        return ws.send(JSON.stringify({type: 'color', color: 'red'}));
      }

      player1.id = message.id;
      return ws.send(JSON.stringify({type: 'color', color: 'blue'}));
  }
}

function resetScore() {
  player1.id = null;
  player1.score = 0;

  player2.id = null;
  player2.score = 0;
}

function getScoreBoard(req, res) {
  if (req.query.id) {
    if (req.query.id === '2936046') {
      player1++;
    } else {
      player2++;
    }

    if (player1 >= 8) {
      winner = 'p1-win';
    } else if (player2 >= 8) {
      winner = 'p2-win';
    } else {
      winner = false;
    }

    io.emit('score', {player1, player2, winner});
  }
  res.render('scoreboard', {player1, player2, winner});
}

function onListen() {
  console.log('Server started at port ' + process.env.PORT || 3000);
}
