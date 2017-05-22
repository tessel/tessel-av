require('./array-includes-shim');

const Camera = require('./camera');
const shared = require('./shared');
const Microphone = require('./microphone');
const Player = require('./player');
const Speaker = require('./speaker');

module.exports = {
  Camera,
  Microphone,
  Player: function(args) {
    shared.install('madplay');
    return new Player(args);
  },
  Speaker: function(args) {
    shared.install('espeak');
    shared.install('madplay');
    return new Speaker(args);
  },
};
