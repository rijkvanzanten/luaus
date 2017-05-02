const views = {
  index: require('./views/index'),
  room: require('./views/room'),
  newPlayer: require('./views/new-player'),
  controller: require('./views/controller')
};

module.exports = function (view, data) {
  try {
    return views[view](data);
  } catch (err) {
    throw Error(err);
  }
};
