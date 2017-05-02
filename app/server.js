const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const WebSocket = require('ws');
const shortid = require('shortid');
const toString = require('vdom-to-html');
const render = require('./render');
const wrapper = require('./views/wrapper');
const broadcast = require('./broadcast');

/**
 * Main store of all game rooms
 * Is used as in-memory database
 *
 * Structure:
 * {
 *   [id]: {
 *     players: {
 *       [id]: {
 *         color: Array,
 *         type: String,
 *         score: Number,
 *         name: String
 *       }
 *     },
 *     maxScore: Number,
 *     playing: Boolean,
 *     ended: Boolean
 *   }
 * }
 * @type {Object}
 */
let games = {};

const port = process.env.PORT || 3000;

const app = express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .get('/', renderHome)
  .post('/', createRoom)
  .get('/:gameID', renderSingleRoom)
  .get('/new-player/:gameID', renderNewPlayerForm)
  .post('/new-player/:gameID', addNewPlayerToGame)
  .get('/:gameID/:playerID', getController)
  .post('/:gameID/:playerID', updateScore);

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
function renderHome(req, res) {
  res.send(wrapper(toString(render('index', games))));
}

/**
 * [POST] / handler
 * Creates new game in store and redirects user to new gameroom
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function createRoom(req, res) {
  const gameID = shortid.generate();
  games[gameID] = new Game();
  res.redirect(gameID);
}

/**
 * [GET] /:id handler
 * Renders game room which matches ID in param
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function renderSingleRoom(req, res) {
  // Return the user to the homepage when the room doesn't exist
  if (!games[req.params.gameID]) {
    return res.redirect('/');
  }

  return res.render('room', {
    gameID: req.params.gameID,
    game: games[req.params.gameID]
  });
}

/**
 * [GET] /controller/:id
 * renders a form which allows the user to create a new controller instance
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function renderNewPlayerForm(req, res) {
  res.render('new-player', { gameID: req.params.gameID });
}

/**
 * [POST] /controller/:id
 * Adds new user to game with corresponding ID and redirects to buttonview
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function addNewPlayerToGame(req, res) {
  const playerID = shortid.generate();
  games[req.params.gameID].players[playerID] = new Player('web', req.body.name);
  res.redirect(`/${req.params.gameID}/${playerID}`);
}

/**
 * [GET] /:gameID/:playerID
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function getController(req, res) {
  if (games[req.params.gameID] && games[req.params.gameID].players[req.params.playerID]) {
    return res.render('controller', {
      name: games[req.params.gameID].players[req.params.playerID].name,
      gameID: req.params.gameID,
      playerID: req.params.playerID
    });
  }

  return res.redirect('/');
}

/**
 * [POST] /:gameID/:playerID
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function updateScore(req, res) {
  if (games[req.params.gameID] && games[req.params.gameID].players[req.params.playerID]) {
    games[req.params.gameID].players[req.params.playerID].score++;
    return res.redirect(`/${req.params.gameID}/${req.params.playerID}`);
  }

  return res.redirect('/');
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

/**
 * Player object-creator
 * @param {String} type nodemcu | web
 * @param {String} name
 */
function Player(type, name = 'John Doe') {
  this.color = [0, 0, 0];
  this.type = type;
  this.score = 0;
  this.name = name;
}
