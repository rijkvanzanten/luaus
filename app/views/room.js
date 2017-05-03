const h = require('virtual-dom/h');

module.exports = function (data) {
  const {gameID, game} = data;
  return h('div', {className: 'room'}, [
    game.playing ? h('meta', {httpEquiv: 'refresh', content: '1'}) : h('form', {method: 'post', action: `/${gameID}`}, [
      h('button', {type: 'button', id: 'min'}, '-'),
      h('input', {type: 'number', name: 'max-score', min: '1', value: game.maxScore}),
      h('button', {type: 'button', id: 'max'}, '+'),
      h('button', {type: 'submit'}, 'Start')
    ]),
    h('a', {href: '/new-player/' + gameID}, 'Wanna play along?'),
    h('div', {id: 'players'}, [
      h('ul', Object.keys(game.players).map(playerID => {
        const player = game.players[playerID];
        return h('li', {
          style: {
            backgroundColor: `rgb(${player.color[1]}, ${player.color[0]}, ${player.color[2]})`
          },
          dataPlayerId: playerID
        }, 'Score: ' + player.score)
      }))
    ])
  ]);
};
