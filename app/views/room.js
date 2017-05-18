const h = require('virtual-dom/h');

module.exports = function (data) {
  const {gameID, game} = data;

  return h('div', {className: 'room'}, [
    h('audio', {src: game.ended ? '/game-win.mp3' : '/8bit-love-machine.mp3', autoplay: true, loop: true}),
    h('audio', {src: '/score-point.mp3', id: 'pointsound'}),
    game.playing || game.ended ? null : h('a', {href: '/new-player/' + gameID}, 'Wanna play along?'),
    game.playing || game.ended ? null : h('form', {id: 'setup', method: 'post', action: `/${gameID}`}, [
      h('input', {type: 'number', name: 'max-score', min: '1', value: game.maxScore}),
      h('button', {type: 'submit', disabled: Object.keys(game.players).length === 0}, 'Start')
    ]),
    h('div', {id: 'players'}, [
      h('ul', Object.keys(game.players).map(playerID => {
        const player = game.players[playerID];
        return h('li', {
          style: {
            backgroundColor: `rgb(${player.color[1]}, ${player.color[0]}, ${player.color[2]})`
          },
          className: game.ended ? game.winner === playerID ? 'won' : 'lost' : '',
          attributes: {
            'data-id': playerID
          }
        }, [
          h('h3', player.name),
          h('img', {src: player.type === 'nodemcu' ? '/nodemcu.png' : '/phone.png'}),
          h('span', String(player.score))
        ])
      }))
    ]),
    game.playing || game.ended ? null : ('ul', {id: 'idle-mcus'}, data.waitingNodeMCUs.map(nodeMCUID => {
      return h('li', {
          attributes: {
            'data-id': nodeMCUID
          }
        }
      ), h('form', {action: `/join-mcu/`, method: 'POST'}, [
        h('input', {type: 'hidden', value: nodeMCUID, name: 'mcuID'}),
        h('input', {type: 'hidden', value: gameID, name: 'gameID'}),
        h('button', {type: 'submit'}, `Add GameBox ${nodeMCUID} to game`)
      ])
    }))
  ]);
};
