const views = {
  index: require('./views/index')
};

module.exports = function (view, data) {
  try {
    return views[view](data);
  } catch (err) {
    throw Error(`View ${view} doesn't exist`);
  }
};
