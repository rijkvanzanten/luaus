const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const WebSocket = require('ws');
const socketIO = require('socket.io');
const shortid = require('shortid');
const debug = require('debug')('luaus');
const toString = require('vdom-to-html');
const render = require('./render');
const wrapper = require('./views/wrapper');

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
  .post('/:gameID', postStartGame)
  .get('/new-player/:gameID', renderNewPlayerForm)
  .post('/new-player/:gameID', addNewPlayerToGame)
  .get('/:gameID/:playerID', getController)
  .post('/:gameID/:playerID', postUpdateScore);

const server = http.createServer(app);

const io = socketIO(server);

const nodeMCUServer = new WebSocket.Server({ server, path: '/nodemcu' });

/**
 * Broadcasts data to all connected NodeMCUs
 */
nodeMCUServer.broadcast = function broadcast(data) {
  nodeMCUServer.clients.forEach(sendData);

  function sendData(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

nodeMCUServer.on('connection', onNodeMCUConnection);

io.on('connection', onClientConnection);

server.listen(port, function onListen() {
  console.log('Server started at port ' + port);
});

// Colors are in G, R, B
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

/**
 * Main socket handler for NodeMCUs
 * Maps incoming socket messages to the corresponding functions
 */
function onNodeMCUConnection(socket) {
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
 * Main socket handler for web-clients
 * Maps incoming socket messages to the corresponding functions
 */
function onClientConnection(socket) {
  socket.on('UPDATE_SCORE', messageData => {
    debug(`[WS] Receive UPDATE_SCORE`);
    updateScore(messageData.gameID, messageData.playerID);
  });
}
/**
 * [GET] / handler
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function renderHome(req, res) {
  debug('[GET] / Render homepage');
  res.send(
    wrapper(
      toString(render('index', Object.keys(games))),
      Object.keys(games)
    )
  );
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

  io.emit('NEW_GAME', {gameID});

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
  const data = {
    gameID: req.params.gameID,
    game: games[req.params.gameID]
  };

  return res.send(
    wrapper(
      toString(render('room', data)),
      data,
      true // true = refresh page
    )
  );
}

/**
 * [POST] /:id
 * Start the game
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function postStartGame(req, res) {
  debug(`[POST] /${req.params.gameID}`);
  // Return the user to the homepage when the room doesn't exist
  if (games[req.params.gameID]) {
    startGame(req.params.gameID);
  }
  res.redirect('/' + req.params.gameID);
}

/**
 * [GET] /new-player/:id
 * renders a form which allows the user to create a new controller instance
 * @param  {Object} req Express request object
 * @param  {Object} res Express response object
 */
function renderNewPlayerForm(req, res) {
  debug(`[GET] /new-player/${req.params.gameID} Render new player form`);
  return res.send(
    wrapper(
      toString(render('newPlayer', {gameID: req.params.gameID})),
      {gameID: req.params.gameID}
    )
  );
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
  games[req.params.gameID].players[playerID] = new Player('web', req.params.gameID, req.body.name);
  debug(`[WS] Send NEW_PLAYER ${req.params.gameID} ${playerID}`);

  io.emit('NEW_PLAYER', {gameID: req.params.gameID, playerID, player: games[req.params.gameID].players[playerID]});
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
    const data = {
      name: games[req.params.gameID].players[req.params.playerID].name,
      gameID: req.params.gameID,
      playerID: req.params.playerID,
      game: games[req.params.gameID]
    };

    return res.send(
      wrapper(
        toString(render('controller', data)),
        data
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

    if (games[gameID].players[playerID].score === games[gameID].maxScore) {
      debug(`Game ${gameID} ends`);
      endGame(gameID, playerID);
    } else {
      debug(`[WS] Send UPDATE_SCORE ${playerID}`);

      io.emit('UPDATE_SCORE', {playerID, gameID, score: games[gameID].players[playerID].score});
    }
  } else {
    debug(`[WS] Game ${gameID} hasn't started, doesn't exist or has ended`);
  }
}

/**
 * Start the game session
 * @param  {String} gameID Game to start
 */
function startGame(gameID, maxScore = 10) {
  games[gameID].playing = true;
  games[gameID].maxScore = maxScore;

  debug(`Game ${gameID} started`);

  io.emit('START_GAME', {gameID});

  nodeMCUServer.broadcast(
    JSON.stringify({
      action: 'START_GAME',
      gameID
    })
  );
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

  io.emit('END_GAME', {
    winner: playerID,
    gameID
  });

  nodeMCUServer.broadcast(
    JSON.stringify({
      action: 'END_GAME',
      winner: playerID,
      gameID
    })
  );

  delete games[gameID];
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
function Player(type, gameID, name = 'John Doe') {
  this.color = colors[Object.keys(games[gameID].players).length % colors.length];
  this.type = type;
  this.score = 0;
  this.name = name;
}
