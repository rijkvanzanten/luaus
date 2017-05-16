const diff = require('virtual-dom/diff');
const patch = require('virtual-dom/patch');
const createElement = require('virtual-dom/create-element');
const render = require('../render');

const socket = io('http://localhost:3000/');

let data = JSON.parse(initialData);
let tree;
let rootNode;

/**
 * This is quite ugly. The eventlisteners on document wouldn't register when
 *   triggered from within a nested module. Still need to investigate why and
 *   fix the mess beneath by splitting it up into modules (this kinda acts like a router)
 */
if (document.querySelector('.index')) {
  replaceView('index');

  socket.on('message', onSocketMessage);

  function onSocketMessage(message) {
    data.push(message.gameID);
    return update('index', data);
  }
} else if (document.querySelector('.controller')) {
  replaceView('controller');
  document.querySelector('form').addEventListener('submit', onButtonPress);

  /**
   * Send an update score request to the server
   */
  function onButtonPress(event) {
    socket.emit('message', {
      device: 'phone',
      action: 'UPDATE_SCORE',
      gameID: document.querySelector('[name="gameID"]').value,
      playerID: document.querySelector('[name="playerID"').value
    });

    event.preventDefault();
  }

  socket.on('message', onSocketMessage);

  function onSocketMessage(message) {
    const messageData = JSON.parse(message.data);
  }
} else if (document.querySelector('.new-player')) {
  // Do something new-player form specific
} else if (document.querySelector('.room')) {
  replaceView('room');

  socket.on('NEW_PLAYER', messageData => {
    data.game.players[messageData.playerID] = messageData.player;
    return update('room');
  });

  socket.on('UPDATE_SCORE', messageData => {
    data.game.players[messageData.playerID].score = messageData.score;
    return update('room');
  });

  socket.on('START_GAME', () => {
    data.game.playing = true;
    return update('room');
  });

  socket.on('END_GAME', messageData => {
    data.game.playing = false;
    data.game.ended = true;
    data.game.winner = messageData.winner;
    data.game.players[messageData.winner].score = data.game.maxScore;
    return update('room');
  });
}

/**
 * Replace the server-rendered code with a client-side rendered rootNode
 * @param  {String} view View to render
 */
function replaceView(view) {
  tree = render(view, data);
  rootNode = createElement(tree);
  document.querySelector('[data-root]').replaceChild(rootNode, document.querySelector('[data-root] > div'));
}

/**
 * Update current view with new data
 * @param  {String} view View to re-render
 */
function update(view) {
  const newTree = render(view, data);
  const patches = diff(tree, newTree);
  rootNode = patch(rootNode, patches);
  tree = newTree;
}
