const h = require('virtual-dom/h');

module.exports = function logo() {
  return h('div', {id: 'logo'}, [
    h('img', {src: '/berend32.png'}),
    h('h1', [
      h('span', 'l'),
      h('span', 'u'),
      h('span', 'a'),
      h('span', 'u'),
      h('span', 's')
    ]),
    h('img', {src: '/rijk32.png'})
  ]);
}
