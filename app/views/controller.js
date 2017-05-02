const h = require('virtual-dom/h');

module.exports = function (data) {
  const {name, gameID, playerID} = data;
  return h('div', {className: 'controller'}, [
    h('h1', name),
    h('form', {method: 'post', action: `/${gameID}/${playerID}`}, [
      h('button', {id: 'bigredbutton'}),
      h('input', {type: 'hidden', name: 'gameID', value: gameID}),
      h('input', {type: 'hidden', name: 'playerID', value: playerID})
    ])
  ]);
};
