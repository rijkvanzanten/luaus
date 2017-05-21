const diff = require('virtual-dom/diff');
const patch = require('virtual-dom/patch');
const createElement = require('virtual-dom/create-element');
const debounce = require('debounce');
const render = require('../render');

const socket = io();

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

  socket.on('NEW_GAME', messageData => {
    data[messageData.gameID] = messageData.game;
    update('index', data);
  });

  socket.on('REMOVE_GAME', messageData => {
    delete data[messageData.gameID];
    update('index');
  });

  socket.on('NEW_PLAYER', messageData => {
    data[messageData.gameID].players[messageData.playerID] = messageData.player;
    return update('index', data);
  });

  socket.on('LEAVE_PLAYER', messageData => {
    delete data[messageData.gameID].players[messageData.playerID];
    return update('index');
  });

  socket.on('UPDATE_GAME_NAME', messageData => {
    data[messageData.gameID].name = messageData.name;
    return update('index');
  });

  socket.on('START_GAME', messageData => {
    console.log(data[messageData.gameID].playing)
    data[messageData.gameID].playing === true;
    console.log(data[messageData.gameID].playing)
    return update('index', data);
  });

} else if (document.querySelector('.controller')) {
  replaceView('controller');
  document.querySelector('form').addEventListener('submit', onButtonPress);

  socket.on('END_GAME', messageData => {
    data.game.ended = true;
    data.game.winner = messageData.winner;
    data.game.players[messageData.winner].score = data.game.maxScore;
    return update('controller');
  });

  socket.on('LEAVE_PLAYER', messageData => {
    if (messageData.gameID === data.gameID && messageData.playerID === data.playerID) {
      alert('You\'ve been kicked from this lobby');
      window.location = '/';
    }
  });

  socket.on('REMOVE_GAME', messageData => {
    if (messageData.gameID === data.gameID) {
      alert('This lobby has been closed due to a lack of players.');
      window.location = '/';
    }
  });

  socket.on('START_GAME', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.playing = true;
      return update('controller');
    }
  });

  /**
   * Send an update score request to the server
   */
  function onButtonPress(event) {
    event.preventDefault();

    socket.emit('UPDATE_SCORE', {
      gameID: document.querySelector('[name="gameID"]').value,
      playerID: document.querySelector('[name="playerID"]').value
    });

    return false; // iOS Safari
  }

  window.addEventListener('beforeunload', () => {
    socket.emit('LEAVE_PLAYER', {
      gameID: data.gameID,
      playerID: data.playerID
    });
    return null;
  });
} else if (document.querySelector('.new-player')) {
  // Do something new-player form specific
} else if (document.querySelector('.room')) {
  replaceView('room');

  addEventListenersToNameInputs();

  addEventListenersToLeaveButtons();

  if (document.querySelector('input[type="number"]')) {
    document.querySelector('input[type="number"]').addEventListener('input', debounce(emitMaxScore, 350));
    function emitMaxScore() {
      socket.emit('SET_MAX_SCORE', {score: document.querySelector('input[type="number"]').value, gameID: data.gameID});
    }
  }

  socket.on('NEW_PLAYER', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.players[messageData.playerID] = messageData.player;
    }

    update('room');
    addEventListenersToLeaveButtons();
    return addEventListenersToNameInputs();
  });

  socket.on('REMOVE_GAME', messageData => {
    if (messageData.gameID === data.gameID) {
      alert('This lobby has been closed due to a lack of players.');
      window.location = '/';
    }
  });

  socket.on('UPDATE_SCORE', messageData => {
    const audio = document.getElementById('pointsound');
    audio.pause();
    audio.currentTime = 0;
    audio.play();

    data.game.players[messageData.playerID].score = messageData.score;
    return update('room');
  });

  socket.on('SET_MAX_SCORE', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.maxScore = messageData.score;
    }
    return update('room');
  });

  socket.on('START_GAME', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.playing = true;
    }
    return update('room');
  });

  socket.on('END_GAME', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.ended = true;
      data.game.winner = messageData.winner;
      data.game.players[messageData.winner].score = data.game.maxScore;
    }
    return update('room');
  });

  socket.on('NEW_WAITING_MCU', messageData => {
    data.waitingNodeMCUs.push(messageData);
    return update('room');
  });

  socket.on('REMOVE_WAITING_MCU', messageData => {
    data.waitingNodeMCUs = data.waitingNodeMCUs.filter(val => val !== messageData);
    return update('room');
  });

  socket.on('UPDATE_PLAYER_NAME', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.players[messageData.playerID].name = messageData.name;
      return update('room');
    }
  });

  socket.on('UPDATE_GAME_NAME', messageData => {
    if (messageData.gameID === data.gameID) {
      data.game.name = messageData.name;
      return update('room');
    }
  });

  socket.on('LEAVE_PLAYER', messageData => {
    if (messageData.gameID === data.gameID) {
      delete data.game.players[messageData.playerID];
      return update('room');
    }
  });

  function addEventListenersToNameInputs() {
    const playerNameInputs = document.querySelectorAll('input[name="playerName"]');

    if (playerNameInputs) {
      playerNameInputs.forEach(input =>
        input.addEventListener('input', debounce(() => {
          socket.emit('UPDATE_PLAYER_NAME', {
            gameID: data.gameID,
            playerID: input.getAttribute('data-id'),
            name: input.value
          });
        }, 600))
      );
    }

    const gameNameInputs = document.querySelectorAll('input[name="gameName"]');

    if (gameNameInputs) {
      gameNameInputs.forEach(input =>
        input.addEventListener('input', debounce(() => {
          socket.emit('UPDATE_GAME_NAME', {
            gameID: input.getAttribute('data-id'),
            name: input.value
          });
        }, 600))
      );
    }
  }

  function addEventListenersToLeaveButtons() {
    const leaveButtons = document.querySelectorAll('.leave');

    if (leaveButtons) {
      leaveButtons.forEach(button =>
        button.addEventListener('click', () => {
          if (window.confirm('Do you really want to kick this player?')) {
            socket.emit('LEAVE_PLAYER', {
              gameID: data.gameID,
              playerID: button.getAttribute('data-id')
            });
          }
        })
      )
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
