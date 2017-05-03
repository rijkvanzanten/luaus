const diff = require('virtual-dom/diff');
const patch = require('virtual-dom/patch');
const createElement = require('virtual-dom/create-element');
const render = require('../render');
const socket = new WebSocket('ws://' + location.hostname + ':' + location.port);

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

  socket.addEventListener('message', onSocketMessage);

  function onSocketMessage(message) {
    const messageData = JSON.parse(message.data);

    data.push(messageData.gameID);
    return update('index', data);
  }
} else if (document.querySelector('.controller')) {
  replaceView('controller');
  document.querySelector('form').addEventListener('submit', onButtonPress);

  /**
   * Send an update score request to the server
   */
  function onButtonPress(event) {
    socket.send(
      JSON.stringify({
        device: 'phone',
        action: 'UPDATE_SCORE',
        gameID: document.querySelector('[name="gameID"]').value,
        playerID: document.querySelector('[name="playerID"').value
      })
    );

    event.preventDefault();
  }

  socket.addEventListener('message', onSocketMessage);

  function onSocketMessage(message) {
    const messageData = JSON.parse(message.data);
  }
} else if (document.querySelector('.new-player')) {
  // Do something new-player form specific
} else if (document.querySelector('.room')) {
  replaceView('room');
    
  socket.addEventListener('message', onSocketMessage);

  function onSocketMessage(message) {
    const messageData = JSON.parse(message.data);

    if (messageData.gameID === data.gameID) {
      switch (messageData.action) {
        case 'NEW_PLAYER':
          data.game.players[messageData.playerID] = messageData.player;
          return update('room');
        case 'UPDATE_SCORE':
          data.game.players[messageData.playerID].score = messageData.score;
          return update('room');
        case 'START_GAME':
          data.game.playing = true;
          return update('room');
        case 'END_GAME':
          data.game.playing = false;
          data.game.ended = true;
          break;
      }
    }
  }
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
