const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const WebSocket = require('ws');
const shortid = require('shortid');
const broadcast = require('./broadcast');

/**
 * Main store of all game rooms
 * Is used as in-memory database
 *
 * Structure:
 * {
 *   [id]: {
 *     players: [],
 *     maxScore: Number,
 *     playing: Boolean,
 *     ended: Boolean
 *   }
 * }
 * @type {Object}
 */
const games = {};

const port = process.env.PORT || 3000;

const app = express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'))
  .get('/', getHome)
  .post('/', createRoom);

const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });

webSocketServer.broadcast = broadcast;

server.listen(port, function onListen() {
  console.log('Server started at port ' + port);
});

function getHome(req, res) {
  res.render('index', { games });
}

function createRoom(req, res) {
  const id = shortid.generate();
  games[id] = new Game();
  res.redirect('/game/' + id);
}

function Game() {
  return {
    players: {},
    maxScore: 10,
    playing: false,
    ended: false
  }
}
