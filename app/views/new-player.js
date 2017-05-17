const h = require('virtual-dom/h');

module.exports = function (data) {
  return h('div', {className: 'new-player'}, [
    h('form', {method: 'post', action: '/new-player/' + data.gameID}, [
      h('label', [
        'Enter your name:',
        h('input', {type: 'text', name: 'name'})
      ]),
      h('button', {type: 'submit'}, 'Join Game!')
    ])
  ]);
};
