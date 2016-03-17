var Camera = require('./camera');
var Player = require('./player');
var Speaker = require('./speaker');

var install = require('./install');


module.exports = {
  Camera: Camera,
  Player: function(args) {
    install('madplay');
    return new Player(args);
  },
  Speaker: function(args) {
    install('espeak');
    install('madplay');
    return new Speaker(args);
  },
  // TODO...
  Microphone: null,
};
