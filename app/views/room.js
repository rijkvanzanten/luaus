const h = require('virtual-dom/h');

module.exports = function (data) {
  const {gameID, game} = data;
  return h('div', {className: 'room'}, [
    game.playing ? null : h('a', {href: '/new-player/' + gameID}, 'Wanna play along?'),
    game.playing ? null : h('form', {id: 'setup', method: 'post', action: `/${gameID}`}, [
      h('input', {type: 'number', name: 'max-score', min: '1', value: game.maxScore}),
      h('button', {type: 'submit'}, 'Start')
    ]),
    h('div', {id: 'players'}, [
      h('ul', Object.keys(game.players).map(playerID => {
        const player = game.players[playerID];
        return h('li', {
          style: {
            backgroundColor: `rgb(${player.color[1]}, ${player.color[0]}, ${player.color[2]})`
          },
          className: game.ended ? game.winner === playerID ? 'won' : 'lost' : ''
        }, [
          h('h3', player.name),
          h('img', {src: player.type === 'nodemcu' ? '/nodemcu.png' : '/phone.png'}),
          h('span', String(player.score))
        ])
      }))
    ])
  ]);
};
