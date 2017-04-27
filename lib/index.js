require('./array-includes-shim');

const Camera = require('./camera');
const Microphone = require('./microphone');
const Player = require('./player');
const Speaker = require('./speaker');
const install = require('./install');


module.exports = {
  Camera,
  Microphone,
  Player: function(args) {
    install('madplay');
    return new Player(args);
  },
  Speaker: function(args) {
    install('espeak');
    install('madplay');
    return new Speaker(args);
  },
};
