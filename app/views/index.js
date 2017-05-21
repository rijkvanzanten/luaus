const h = require('virtual-dom/h');
const logo = require('./logo');

module.exports = function (data) {
  const {lastTweet, games} = data;
  const gameIDs = Object.keys(games);
  return h('div', {className: 'index'}, [
    h('audio', {src: '/8bit-love-machine.mp3', autoplay: true, loop: true}),
    logo(),
    h('p', {id: 'tweet'}, lastTweet),
    gameIDs.length > 0 ?
      gameList(games) :
      h('p', {id: 'no-games'}, 'No Luaus found'),
      h('form', {action: '/', method: 'post'},
        h('button', 'Create Luau')
      )
  ]);
};

function gameList(games) {
  return h('div', {id: 'games-list'}, [
    h('h2', 'Games'),
    h('ul', Object.keys(games).map(gameID =>
      h('li', {className: Object.keys(games[gameID].playing) === true ? 'playing' : ''},
        h('a', {href: '/' + gameID}, [
          games[gameID].name,
          h('span', `${Object.keys(games[gameID].players).length} ${Object.keys(games[gameID].players).length === 1 ? 'player' : 'players'}`)
        ])
      )
    ))
  ]);
}
