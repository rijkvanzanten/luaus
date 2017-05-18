const h = require('virtual-dom/h');
const logo = require('./logo');

module.exports = function (games) {
  const gameIDs = Object.keys(games);
  return h('div', {className: 'index'}, [
    h('audio', {src: '/8bit-love-machine.mp3', autoplay: true, loop: true}),
    logo(),
    gameIDs.length > 0 ?
      gameList(games) :
      h('p', 'No Luaus found'),
      h('form', {action: '/', method: 'post'},
        h('button', 'Create Luau')
      )
  ]);
};

function gameList(games) {
  return h('ul', Object.keys(games).map(gameID =>
    h('li',
      h('a', {href: '/' + gameID}, `${games[gameID].name} ${Object.keys(games[gameID].players).length}`)
    )
  ));
}
