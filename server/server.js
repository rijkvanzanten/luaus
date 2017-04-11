const path = require('path');
const express = require('express');
const Socket = require('socket.io');
const bodyParser = require('body-parser');
const compression = require('compression');

// Scores. Save in memory for know. Could be upgraded to a DB in the long run
let player1 = 0;
let player2 = 0;

const app = express()
  .use(compression())
  .use(bodyParser.urlencoded({extended: false}))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getScoreBoard)
  .post('/', postScore)
  .listen(process.env.PORT || 3000, onListen);

const io = new Socket(app);

function getScoreBoard(req, res) {
  res.render('scoreboard', {player1, player2});
}

function postScore(req, res) {
  if (
    // player 1 score
    true
  ) {
    player1++;
  } else {
    player2++;
  }
  io.emit('score', {player1, player2});
}

function onListen() {
  console.log('Server started at port ' + process.env.PORT || 3000);
}
