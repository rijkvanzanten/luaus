const h = require('virtual-dom/h');

module.exports = function (games) {
  return h('div', {className: 'index'}, [
    Object.keys(games).length > 0 ? 
      gameList(games) : 
      h('p', 'No Luaus found'),
      h('form', {action: '/', method: 'post'},
        h('button', 'Create Luau')
      )
  ]);
};

function gameList(games) {
  return h('ul', games.map(game => 
    h('li',
      h('a', {href: '/' + game.id})
    )
  ));
}
