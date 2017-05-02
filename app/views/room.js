const h = require('virtual-dom/h');

module.exports = function (data) {
  const {gameID, game} = data;
  return h('div', {className: 'room'}, [
    h('a', {href: '/new-player/' + gameID}, 'Wanna play along?'),
    h('div', {id: 'players'}, [
      h('ul', Object.keys(game.players).map(playerID => {
        const player = players[playerID];
        return h('li', {
          style: `background-color: rgb(${player.color[1]}, ${player.color[0]}, ${player.color[2]});`,
          dataPlayerId: playerID
        })
      }))
    ])
  ]);
};

