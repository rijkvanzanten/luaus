const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const WebSocket = require('ws');

// Scores. Save in memory for know. Could be upgraded to a DB in the long run
let player1 = 0;
let player2 = 0;
let winner  = false;

const app = express()
  .use(compression())
  .use(bodyParser.urlencoded({extended: false}))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getScoreBoard);

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

wss.on('connection', ws => {
  ws.on('message', message => {
    message = JSON.parse(message);
    console.log(message);
  });

  ws.send('something');
});

server.listen(process.env.PORT || 3000, onListen);

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
