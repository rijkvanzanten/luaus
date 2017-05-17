const h = require('virtual-dom/h');
const logo = require('./logo');
const bgMusic = require('./audio');

module.exports = function (games) {
  const gameIDs = Object.keys(games);
  return h('div', {className: 'index'}, [
    bgMusic(),
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
      h('a', {href: '/' + gameID}, `${gameID} ${Object.keys(games[gameID].players).length}`)
    )
  ));
}
