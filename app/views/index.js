const h = require('virtual-dom/h');
const logo = require('./logo');
const bgMusic = require('./audio');

module.exports = function (gameIDs) {
  return h('div', {className: 'index'}, [
    bgMusic(),
    logo(),
    gameIDs.length > 0 ?
      gameList(gameIDs) :
      h('p', 'No Luaus found'),
      h('form', {action: '/', method: 'post'},
        h('button', 'Create Luau')
      )
  ]);
};

function gameList(gameIDs) {
  return h('ul', gameIDs.map(gameID =>
    h('li',
      h('a', {href: '/' + gameID}, gameID)
    )
  ));
}
