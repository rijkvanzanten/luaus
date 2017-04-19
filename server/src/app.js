const throttle = require('throttle-debounce/throttle');

(function () {
  const ws = new WebSocket('ws://localhost:3000');

  ws.addEventListener('open', onOpenSocket);
  ws.addEventListener('message', onSocketMessage);
  document.body.addEventListener('mouseover', throttle(50, onMouseMove));

  document.querySelector('form').addEventListener('submit', onFormSubmit);

  document.querySelectorAll('[type=button]')
    .forEach(button => button.addEventListener('click', onButtonClick));

  function onFormSubmit(e) {
    e.preventDefault();
    ws.send(JSON.stringify({device: 'scoreboard', action: 'START_GAME', maxScore: Number(document.querySelector('input').value)}));
  }

  function onOpenSocket() {
    console.log('Socket connected');
  }

  function onSocketMessage(event) {
    const data = JSON.parse(event.data);
    switch (data.action) {
      case 'SET_MAX_SCORE':
        document.querySelector('input').value = data.maxScore;
        break;
      default: return false;
    }
  }

  function onMouseMove(e) {
    ws.send(JSON.stringify({device: 'scoreboard', action: 'MOVE_MOUSE', screenX: e.screenX, screenY: e.screenY}));
  }

  function onButtonClick(e) {
    let value = Number(document.querySelector('input').value);

    if (e.target.id === 'min') {
      value--;
    } else {
      value++;
    }

    document.querySelector('input').value = value;

    ws.send(JSON.stringify({device: 'scoreboard', action: 'SET_MAX_SCORE', maxScore: value}));
  }
})();
