const h = require('virtual-dom/h');

module.exports = function (autoplay = true, src = '/8bit-love-machine.mp3') {
  return h('audio', {src, autoplay, loop: true});
}
