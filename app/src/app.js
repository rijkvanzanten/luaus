const diff = require('virtual-dom/diff');
const patch = require('virtual-dom/patch');
const createElement = require('virtual-dom/create-element');
const render = require('../render');
const socket = new WebSocket('ws://' + location.hostname + ':' + location.port);

socket.addEventListener('open', function () {
  console.log('socket opened');
});

/**
 * This is quite ugly. The eventlisteners on document wouldn't register when
 *   triggered from within a nested module. Still need to investigate why and
 *   fix the mess beneath
 */
if (document.querySelector('.index')) {
  replaceView('index');
} else if (document.querySelector('.controller')) {
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
} else if (document.querySelector('.new-player')) {
  console.log('New Player');
}

function replaceView(view) {
  initialData = JSON.parse(initialData);

  let tree = render(view, ...initialData);
  let rootNode = createElement(tree);

  document.body.replaceChild(rootNode, document.querySelector('[data-root]'));
}
