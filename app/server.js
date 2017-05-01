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
 *     players: Object,
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
  .post('/', createRoom)
  .get('/:id', getRoom);

const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });

webSocketServer.broadcast = broadcast;

server.listen(port, function onListen() {
  console.log('Server started at port ' + port);
});

/**
 * [GET] / handler
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function getHome(req, res) {
  res.render('index', { games });
}

/**
 * [POST] / handler
 * Creates new game in store and redirects user to new gameroom
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function createRoom(req, res) {
  const id = shortid.generate();
  games[id] = new Game();
  res.redirect(id);
}

/**
 * [GET] /:id handler
 * Renders game room which matches ID in param
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function getRoom(req, res) {
  // Return the user to the homepage when the room is invalid
  if (!games[req.params.id]) {
    return res.redirect('/');
  }

  return res.render('room', {game: games[req.params.id]});
}

/**
 * Game object-creator
 * Sets defaults for new game
 */
function Game() {
  this.players = {};
  this.maxScore = 10;
  this.playing = false;
  this.ended = false;
}
