var Camera = require('./camera');
var Player = require('./player');
var Speaker = require('./speaker');

var install = require('./install');


module.exports = {
  Camera: function(args) {
    install('fswebcam');
    return new Camera(args);
  },
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
