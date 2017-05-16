const h = require('virtual-dom/h');
const audio = require('./audio');

module.exports = function (data) {
  const {name, gameID, playerID, game} = data;
  return h('div', {className: `controller ${game.ended && game.winner === playerID ? 'won' : 'lost'}`}, [
    game.ended && game.winner === playerID ? audio(true, '/game-win.mp3') : audio(),
    h('h1', name),
    h('form', {method: 'post', action: `/${gameID}/${playerID}`}, [
      h('button', {id: 'bigredbutton'}),
      h('input', {type: 'hidden', name: 'gameID', value: gameID}),
      h('input', {type: 'hidden', name: 'playerID', value: playerID})
    ])
  ]);
};
