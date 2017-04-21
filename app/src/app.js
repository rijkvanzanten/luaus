const throttle = require('throttle-debounce/throttle');
const shortid = require('shortid');
// const convert = require('convert-range');

(function() {
  const ws = new WebSocket('ws://' + location.hostname + ':' + location.port);
  const id = shortid.generate();

  ws.addEventListener('open', onOpenSocket);
  ws.addEventListener('message', onSocketMessage);
  document.body.addEventListener('mousemove', throttle(10, onMouseMove));

  document.querySelector('form').addEventListener('submit', onFormSubmit);

  document
    .querySelectorAll('[type=button]')
    .forEach(button => button.addEventListener('click', onButtonClick));

  function onFormSubmit(e) {
    e.preventDefault();
    ws.send(
      JSON.stringify({
        device: 'scoreboard',
        action: 'START_GAME',
        maxScore: Number(document.querySelector('input').value)
      })
    );
    return false;
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
      case 'MOVE_MOUSE':
        if (data.id !== id) {
          const element = document.querySelector(
            `div[data-clientid="${data.id}"]`
          );
          if (!element) {
            document.body.innerHTML += `<div data-clientid="${data.id}"></div>`;
          }

          document.querySelector(
            `div[data-clientid="${data.id}"]`
          ).style.transform = `translate(${data.clientX}px, ${data.clientY}px)`;
          document.querySelector(
            `div[data-clientid="${data.id}"]`
          ).style.animation =
            'none'; // 💩
          setTimeout(() => {
            document.querySelector(
              `div[data-clientid="${data.id}"]`
            ).style.animation =
              'fadeout .5s linear forwards';
          }, 10);
        }
        break;
      case 'START_GAME':
        document.querySelector('body').classList.add('started');
        break;
      case 'NEW_PLAYER':
        const playerList = document.querySelector('#players ul');
        const newPlayer = document.createElement('li');
        const playerType = document.createElement('img');
        const playerName = document.createElement('h2');
        const playerScore = document.createElement('span');
        const colors = data.player.color;

        newPlayer.style.backgroundColor = `rgb(${colors[1]}, ${colors[0]}, ${colors[2]})`;
        newPlayer.setAttribute('data-type', data.player.type);

        playerType.src = `/${data.player.type}.png`;
        playerType.alt = `Player uses ${data.player.type}`;

        playerName.textContent = data.player.id;
        playerScore.textContent = data.player.score;

        newPlayer.appendChild(playerType);
        newPlayer.appendChild(playerName);
        newPlayer.appendChild(playerScore);
        playerList.appendChild(newPlayer);
        break;
      default:
        return false;
    }
  }

  function onMouseMove(e) {
    ws.send(
      JSON.stringify({
        device: 'scoreboard',
        id,
        action: 'MOVE_MOUSE',
        clientX: e.clientX,
        clientY: e.clientY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      })
    );
  }

  function onButtonClick(e) {
    let value = Number(document.querySelector('input').value);

    if (e.target.id === 'min') {
      value--;
    } else {
      value++;
    }

    document.querySelector('input').value = value;

    ws.send(
      JSON.stringify({
        device: 'scoreboard',
        id,
        action: 'SET_MAX_SCORE',
        maxScore: value
      })
    );
  }
})();
