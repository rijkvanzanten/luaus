const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const WebSocket = require('ws');
const isReachable = require('is-reachable');
const socketIO = require('socket.io');
const shortid = require('shortid');
const debug = require('debug')('luaus');
const toString = require('vdom-to-html');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const Twitter = require('twitter');
const TweetStream = require('node-tweet-stream');
const render = require('./render');
const wrapper = require('./views/wrapper');
const tweets = require('./tweets.js');

dotenv.config();

let sendTweet = function () {
  debug('Twitter integration not setup');
};

if (
  process.env.TWITTER_CONSUMER_KEY &&
  process.env.TWITTER_CONSUMER_SECRET &&
  process.env.TWITTER_ACCESS_TOKEN_KEY &&
  process.env.TWITTER_ACCESS_TOKEN_SECRET
) {
  const client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });

  sendTweet = function(message) {
    client.post('statuses/update', {status: message},  function(error, tweet, response) {
      if(error) console.log(error);
    });
  };

  const stream = TweetStream({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    token: process.env.TWITTER_ACCESS_TOKEN_KEY,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });

  stream.on('tweet', function (tweet) {
    debug(`[WS] Send TWEET ${tweet.text}`);
    io.emit('TWEET', tweet.text);
  });

  stream.on('error', function (err) {
    console.log(err);
  });

  stream.track('luaus_live');
}

let nameApiReachable;
let lastNameApiCheck = new Date();

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
 *     name: String
 *   }
 * }
 * @type {Object}
 */
let games = {};
let waitingNodeMCUs = [];

const port = process.env.PORT || 3000;

const app = express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .get('/', renderHome)
  .post('/', createRoom)
  .post('/join-mcu/', MCUJoinGame)
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
  [200, 0, 150], // Ice
  [25, 150, 0], // Inferno
  [100, 200, 0], // Topaz
  [150, 125, 0], // Electric
  [0, 150, 175], // Amethyst
  [175, 0, 0], // Forest
  [0, 175, 75], // Hotline
  [200, 75, 75], // Mint
  [50, 50, 200], // Steel
  [50, 200, 50], // Peach
  [0, 0, 175], // Sapphire
  [100, 0, 200] // Lagoon
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

    let gameID;

    switch (message.action) {
      case 'JOIN_GAME':
        debug(`[WS] Receive JOIN_GAME ${message.id}`);
        let inGame = false;

        message.id = String(message.id);

        // Check if nodemcu is in a game already. If so, send it's color
        Object.keys(games).forEach(id => {
          Object.keys(games[id].players).forEach(playerID => {
            if (playerID === message.id) {
              inGame = true;
              nodeMCUServer.broadcast(JSON.stringify({
                action: 'CHANGE_COLOR',
                id: playerID,
                color: games[id].players[playerID].color
              }));
            }
          });
        });

        if (waitingNodeMCUs.indexOf(message.id) === -1 && !inGame) {
          waitingNodeMCUs.push(message.id);

          io.emit('NEW_WAITING_MCU', message.id);
        }

        break;
      case 'UPDATE_SCORE':
        debug(`[WS] Receive UPDATE_SCORE ${message.id}`);

        message.id = String(message.id);

        Object.keys(games).forEach(id => {
          Object.keys(games[id].players).forEach(playerID => {
            if (playerID === message.id) {
              gameID = id;
            }
          });
        });

        if (gameID) {
          updateScore(gameID, message.id);
        }
        break;
      case 'SET_MAX_SCORE':
        Object.keys(games).forEach(id => {
          Object.keys(games[id].players).forEach(playerID => {
            if (Number(playerID) === message.id) {
              gameID = id;
            }
          });
        });

        if (!games[gameID].playing) {
          debug(`[WS] Receive SET_MAX_SCORE ${gameID} ${message.score}`);
          games[gameID].maxScore = Number(message.score);

          io.emit('SET_MAX_SCORE', {
            gameID: gameID,
            score: message.score
          });
        }

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

  socket.on('SET_MAX_SCORE', messageData => {
    debug(`[WS] Receive SET_MAX_SCORE ${messageData.gameID} ${messageData.score}`);

    games[messageData.gameID].maxScore = messageData.score;

    io.emit('SET_MAX_SCORE', messageData);
  });

  socket.on('UPDATE_PLAYER_NAME', messageData => {
    debug(`[WS] Receive UPDATE_PLAYER_NAME ${messageData.playerID} ${messageData.name}`);
    games[messageData.gameID].players[messageData.playerID].name = messageData.name;
    io.emit('UPDATE_PLAYER_NAME', messageData);
  });

  socket.on('LEAVE_PLAYER', messageData => {
    debug(`[WS] Receive LEAVE_PLAYER ${messageData.gameID} ${messageData.playerID}`);
    leavePlayer(messageData.gameID, messageData.playerID);
  });

  socket.on('UPDATE_GAME_NAME', messageData => {
    debug(`[WS] Receive UPDATE_GAME_NAME ${messageData.gameID} ${messageData.name}`);
    games[messageData.gameID].name = messageData.name;
    io.emit('UPDATE_GAME_NAME', messageData);
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
      toString(render('index', games)),
      games
    )
  );
}

/**
 * Fetch a random name from namey
 * @returns {Promise}
 */
async function fetchName() {
  const nameEndpoint = 'http://namey.muffinlabs.com/name.json?frequency=rare&type=surname';

  const fallbackNames = [
    'Jacqualine',
    'Darlena',
    'Chantelle', 
    'Reyna',
    'Tawny',
    'Marica',
    'Ezekiel'
  ];

  if (nameApiReachable === undefined) {
    nameApiReachable = await isReachable(nameEndpoint);
    lastNameApiCheck = new Date();
  }

  // If last check was longer than 5 minutes ago, check again
  if (!nameApiReachable && (lastNameApiCheck - new Date()) * 1000 * 60 >= 5) {
    nameApiReachable = await isReachable(nameEndpoint);
    lastNameApiCheck = new Date();
  }

  if (nameApiReachable) {
    return (await (await fetch(nameEndpoint)).json())[0];
  }

  return fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
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

  fetchName()
    .then(name => {
      games[gameID] = new Game(name);

      sendTweet(tweets.newGame(games[gameID].name));

      debug(`[WS] Send NEW_GAME ${gameID}`);

      io.emit('NEW_GAME', {gameID, game: games[gameID]});

      res.redirect(gameID);
    });
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
    debug(`[GET] /${req.params.gameID} Redirect. Game doesn't exist`);
    return res.redirect('/');
  }

  debug(`[GET] /${req.params.gameID} Render gameroom`);

  const data = {
    gameID: req.params.gameID,
    game: games[req.params.gameID],
    waitingNodeMCUs
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
  // Return the user to the homepage when the room doesn't exist
  if (!games[req.params.gameID]) {
    debug(`[GET] /${req.params.gameID} Redirect. Game doesn't exist`);
    return res.redirect('/');
  }

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
function startGame(gameID) {
  games[gameID].playing = true;

  debug(`Game ${gameID} started`);

  io.emit('START_GAME', {gameID});

  sendTweet(tweets.startGame(games[gameID].name));

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

  debug(`[WS] Send END_GAME ${gameID}`);

  sendTweet(tweets.endGame(games[gameID].players[playerID].name, games[gameID].name));

  io.emit('END_GAME', {
    winner: playerID,
    gameID
  });

  nodeMCUServer.broadcast(
    JSON.stringify({
      action: 'END_GAME',
      winner: playerID
    })
  );

  // Move all nodemcu players to waiting
  Object.keys(games[gameID].players).forEach(playerID => {
    if (games[gameID].players[playerID].type === 'nodemcu') {
      waitingNodeMCUs.push(playerID);
      io.emit('NEW_WAITING_MCU', playerID);
    }
  });

  delete games[gameID];
}

function MCUJoinGame(req, res) {
  const {gameID, mcuID} = req.body;

  games[gameID].players[mcuID] = new Player('nodemcu', gameID);
  debug(`[WS] Send NEW_PLAYER ${gameID} ${mcuID}`);

  // Remove id from waiting nodeMCUs
  waitingNodeMCUs = waitingNodeMCUs.filter(val => val !== String(mcuID));

  nodeMCUServer.broadcast(JSON.stringify({
    action: 'CHANGE_COLOR',
    id: mcuID,
    color: games[gameID].players[mcuID].color
  }));

  io.emit('NEW_PLAYER', {gameID, playerID: mcuID, player: games[gameID].players[mcuID]});

  io.emit('REMOVE_WAITING_MCU', mcuID);

  res.redirect(`/${gameID}`);
}

function leavePlayer(gameID, playerID) {
  if (games[gameID] && games[gameID].players[playerID]) {
    if (games[gameID].players[playerID].type === 'nodemcu') {
      waitingNodeMCUs.push(playerID);
      io.emit('NEW_WAITING_MCU', playerID);
    }
    delete games[gameID].players[playerID];
    io.emit('LEAVE_PLAYER', {gameID, playerID});

    // Delete game if not enough players of active game are left
    if (games[gameID].playing && Object.keys(games[gameID].players).length < 2) {
      io.emit('REMOVE_GAME', {gameID});
      delete games[gameID];
    }
  }
}

/**
 * Game object-creator
 * Sets defaults for new game
 */
function Game(name = 'Game Doe') {
  this.players = {};
  this.maxScore = 10;
  this.playing = false;
  this.ended = false;
  this.name = name;
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
