const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const WebSocket = require('ws');
const shortid = require('shortid');
const debug = require('debug')('luaus');
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
  .post('/:gameID/:playerID', postUpdateScore);

const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });

webSocketServer.broadcast = function broadcast(data) {
  webSocketServer.clients.forEach(sendData);

  function sendData(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

server.listen(port, function onListen() {
  console.log('Server started at port ' + port);
});

webSocketServer.on('connection', onSocketConnection);

/**
 * [GET] / handler
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function renderHome(req, res) {
  debug('[GET] / Render homepage');
  res.send(wrapper(toString(render('index', games))));
}

/**
 * [POST] / handler
 * Creates new game in store and redirects user to new gameroom
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function createRoom(req, res) {
  debug('[POST] / Create gameroom & redirect');
  const gameID = shortid.generate();
  games[gameID] = new Game();

  debug(`[WS] Send NEW_GAME ${gameID}`);
  webSocketServer.broadcast(
    JSON.stringify({
      action: 'NEW_GAME',
      gameID
    })
  );
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
    debug(`[GET] /${req.params.gameID} Redirect. Game doens't exist`);
    return res.redirect('/');
  }

  debug(`[GET] /${req.params.gameID} Render gameroom`);
  return res.send(
    wrapper(
      toString(
        render('room', {
          gameID: req.params.gameID,
          game: games[req.params.gameID]
        })
      )
    )
  );
}

/**
 * [GET] /new-player/:id
 * renders a form which allows the user to create a new controller instance
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function renderNewPlayerForm(req, res) {
  debug(`[GET] /new-player/${req.params.gameID} Render new player form`);
  return res.send(wrapper(toString(render('newPlayer', req.params.gameID))));
}

/**
 * [POST] /new-player/:id
 * Adds new user to game with corresponding ID and redirects to buttonview
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function addNewPlayerToGame(req, res) {
  debug(`[POST] /new-player/${req.params.gameID} Add player to game`);
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
  if (
    games[req.params.gameID] &&
    games[req.params.gameID].players[req.params.playerID]
  ) {
    debug(`[GET] /${req.params.gameID}/${req.params.playerID} Controller`);
    return res.send(
      wrapper(
        toString(
          render('controller', {
            name: games[req.params.gameID].players[req.params.playerID].name,
            gameID: req.params.gameID,
            playerID: req.params.playerID
          })
        )
      )
    );
  }
  debug(`[GET] /${req.params.gameID}/${req.params.playerID} Game/player doesn't exists`);
  return res.redirect('/');
}

/**
 * [POST] /:gameID/:playerID
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function postUpdateScore(req, res) {
  // If game && player exists
  if (
    games[req.params.gameID] &&
    games[req.params.gameID].players[req.params.playerID]
  ) {
    debug(`[POST] /${req.params.gameID}/${req.params.playerID} Update players score`);
    updateScore(req.params.gameID, req.params.playerID);
    return res.redirect(`/${req.params.gameID}/${req.params.playerID}`);
  }

  debug(`[POST] /${req.params.gameID}/${req.params.playerID} Game/player doesn't exists`);
  return res.redirect('/');
}

/**
 * Increase the player score by 1
 * End game if max score has been reached
 * Broadcast updatescore over socket
 * @param  {String} gameID   ID of the game in which the player resides
 * @param  {String} playerID ID of the player who scored
 */
function updateScore(gameID, playerID) {
  if (games[gameID] && games[gameID].ended === false && games[gameID].playing === true) {
    games[gameID].players[playerID].score++;

    debug(`Update score player ${playerID} to ${games[gameID].players[playerID].score}`);

    if (games[gameID].players[playerID] === games[gameID].maxScore) {
      debug(`Game ${gameID} ends`);
      endGame(gameID, playerID);
    } else {
      debug(`[WS] Send UPDATE_SCORE ${playerID}`);
      webSocketServer.broadcast(
        JSON.stringify({
          action: 'UPDATE_SCORE',
          playerID
        })
      );
    }
  } else {
    debug(`[WS] Game ${gameID} doesn't exist or has ended`);
  }
}

/**
 * End the game session
 * Broadcast end_game signal
 * @param  {String} gameID   ID of the game to end
 * @param  {String} playerID ID of the player who own
 */
function endGame(gameID, playerID) {
  games[gameID].ended = true;
  games[gameID].playing = false;

  debug(`[WS] Send END_GAME ${playerID}`);
  webSocketServer.broadcast(
    JSON.stringify({
      action: 'END_GAME',
      winner: playerID
    })
  );
}

/**
 * Main socket handler
 * Maps incoming socket messages to the corresponding functions
 */
function onSocketConnection(socket) {
  socket.on('message', onSocketMessage);

  function onSocketMessage(message) {
    try {
      message = JSON.parse(message);
    } catch (err) {
      console.log('Message not in JSON:', message);
    }

    switch (message.action) {
      case 'UPDATE_SCORE':
        debug(`[WS] Receive UPDATE_SCORE`);
        updateScore(message.gameID, message.playerID);
        break;
    }
  }
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
