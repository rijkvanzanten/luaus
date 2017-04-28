const throttle = require('throttle-debounce/throttle');
const shortid = require('shortid');
// const convert = require('convert-range');

(function() {
  const ws = new WebSocket('ws://' + location.hostname + ':' + location.port);
  const id = shortid.generate();

  if (!isController()) {
    ws.addEventListener('open', onOpenSocket);
    ws.addEventListener('message', onSocketMessage);
    document.body.addEventListener('mousemove', throttle(10, onMouseMove));

    document.querySelector('form').addEventListener('submit', onFormSubmit);

    document
      .querySelectorAll('[type=button]')
      .forEach(button => button.addEventListener('click', onButtonClick));

    document.querySelector('#reset').addEventListener('click', resetGame);

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
        case 'NEW_PLAYER':
          const playerList = document.querySelector('#players ul');
          const newPlayer = document.createElement('li');
          const playerType = document.createElement('img');
          const playerName = document.createElement('h2');
          const playerScore = document.createElement('span');
          const colors = data.player.color;

          newPlayer.style.backgroundColor = `rgb(${colors[1]}, ${colors[0]}, ${colors[2]})`;
          newPlayer
            .setAttribute('data-id', data.player.id)
            .setAttribute('data-type', data.player.type);

          playerType.src = `/${data.player.type}.png`;
          playerType.alt = `Player uses ${data.player.type}`;

          playerName.textContent = data.player.id;
          playerScore.textContent = data.player.score;

          newPlayer
            .appendChild(playerType)
            .appendChild(playerName)
            .appendChild(playerScore);
          playerList.appendChild(newPlayer);
          break;
        case 'START_GAME':
          document.querySelector('#players').insertAdjacentHTML('beforebegin', `<section id="score-goal">${data.maxScore}</section>`);

          document.body.classList.add('started');
          break;
        case 'UPDATE_SCORE':
          const player = document.querySelector(`#players li[data-id="${data.id}"]`);
          const score = player.querySelector('span');

          score.textContent = Number(score.textContent) + 1;
          break;
        case 'END_GAME':
          const players = document.querySelectorAll('#players li');

          document.body.classList.remove('started');
          document.body.classList.add('ended');

          players
            .forEach(player => {
              if (player.getAttribute('data-id') === String(data.winner.id)) {
                player.classList.add('won');
              } else {
                player.classList.add('lost');
              }
            });
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

    function resetGame() {
      window.location.replace('/reset');
    }
  } else {
    const btn = document.querySelector('#bigredbutton');
    const btnID = document.querySelector('h1').innerText;

    ws.addEventListener('open', onOpenSocket);
    ws.addEventListener('message', onSocketMessage);

    btn.addEventListener('click', updateScore);

    function onOpenSocket() {
      console.log('Socket connected');
      btn.disabled = true;
    }

    function onSocketMessage(event) {
      const data = JSON.parse(event.data);

      switch (data.action) {
        case 'START_GAME':
          document.body.insertAdjacentHTML('afterbegin', `<section class="score-goal">${data.maxScore}</section>`);

          btn.disabled = false;
          document.body.classList.remove('lost');
          break;
        case 'END_GAME':
          btn.disabled = true;
          // btn.removeEventListener('click', updateScore);

          if (btnID !== data.winner.id) {
            document.querySelector('.controller').classList.add('lost');
          }
          break;
        default:
          return false;
      }
    }

    function updateScore() {
      ws.send(
        JSON.stringify({
          device: 'phone',
          action: 'UPDATE_SCORE',
          id: btnID
        })
      )
    }
  }

  function isController() {
    if (document.body.classList.contains('controller')) {
      return true;
    } else {
      return false;
    }
  }
})();
