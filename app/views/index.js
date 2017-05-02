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
  return h('ul', Object.keys(games).map(gameID => 
    h('li',
      h('a', {href: '/' + gameID})
    )
  ));
}
