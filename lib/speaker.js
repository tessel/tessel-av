var cp = require('child_process');

var Emitter = require('events').EventEmitter;
var priv = new WeakMap();

var Player = require('./player');


function Speaker(options) {
  Emitter.call(this);

  // Previously, Speaker was used for playing mp3s,
  // but that functionality now lives in Player.
  // This avoids breaking existing code.
  if (options &&
    (typeof options === 'string' && options.endsWith('.mp3'))) {
    return new Player(options);
  }

  options = options || {
    debug: false
  };

  var state = {
    debug: options.debug,
    queue: [],
    isSpeaking: false,
    interval: null,
    process: null,
    time: null,
    currentTime: 0,
    theLastWord: false,
  };

  priv.set(this, state);

  Object.defineProperties(this, {
    currentTime: {
      get: () => Number(state.currentTime.toFixed(3)),
    },
    isSpeaking: {
      get: () => state.isSpeaking,
    },
  });
}

Speaker.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Speaker
  }
});

Speaker.prototype.say = function(phrase) {
  var state = priv.get(this);
  var args = [];
  var offset = null;
  var time = 0;

  if (state.isSpeaking) {
    state.queue.push(phrase);
    return this;
  }

  // If phrase was nothing at all, nothing to do
  if (phrase == null) {
    // speaker.say();
    // speaker.say(null);
    // speaker.say(undefined);
    return this;
  }

  if (typeof phrase === 'string' ||
    typeof phrase === 'number') {
    // speaker.say('Hello!');
    // speaker.say(1);

    // Ensures: 0 -> "0"
    phrase = String(phrase).trim();

    // If the phrase is empty, nothing to do.
    if (!phrase) {
      return this;
    }

    args.push(phrase);
  } else {
    if (Array.isArray(phrase)) {
      // speaker.say(['Hello!', '-a', 10, '-p', 50 ]);
      args = phrase;
    } else {
      var hasPhrase;


      // Don't need to check for null, since those are handled above
      if (typeof phrase === 'object') {
        // speaker.say({
        //  phrase: 'Hello!',
        //  a: 10,
        //  p: 50,
        // });
        //
        args = Object.keys(phrase).reduce((accum, key) => {
          var value = phrase[key];
          var option = '';

          // When the key is "phrase", we only want the value
          if (key === 'phrase') {
            hasPhrase = true;
            accum.push(value.trim());
          } else {
            if (key.length === 1) {
              option = '-';
            }

            option += key;

            accum.push(option);
            accum.push(value);
          }
          return accum;
        }, []);

        // If no "phrase" property was provided, nothing to do.
        if (!hasPhrase) {
          return this;
        }
      }
    }
  }

  if (state.process === null) {
    state.isSpeaking = true;
    state.currentTime = 0;
    state.startTime = Date.now();
    state.interval = setInterval(() => {
      var now = Date.now();
      if (offset === null) {
        offset = now - state.startTime;
      }
      state.currentTime = time + (now - state.startTime - offset) / 1000;

      this.emit('timeupdate', this.currentTime);
    }, 100);

    // Apply some reasonable defaults...
    Object.keys(espeak.options).forEach(key => {
      if (!args.includes(key)) {
        args.push(key, espeak.options[key]);
      }
    });

    state.process = cp.spawn('espeak', args);

    if (this.debug) {
      state.process.stderr.on('data', (data) => {
        var lines = data.toString().split('\n').filter(Boolean).map(line => line.trim());
        lines.forEach(line => {
          console.error(line);
        });
      });
    }

    state.process.on('exit', (code, signal) => {
      if (code !== null && signal === null) {
        if (state.interval) {
          clearInterval(state.interval);
        }
        state.process = null;
        state.currentTime = 0;
        state.startTime = 0;
        state.isSpeaking = false;

        this.emit('ended');

        if (state.queue.length) {
          this.say(state.queue.shift());
        } else {
          if (!state.theLastWord) {
            if (this._events.lastword) {
              this.emit('lastword');
            }
            state.theLastWord = true;
          }

          this.emit('empty');
        }
      }
    });

    this.emit('say');
  }

  return this;
};

Speaker.prototype.stop = function() {
  var state = priv.get(this);
  if (!state.isSpeaking) {
    return this;
  }
  state.isSpeaking = false;
  if (state.interval) {
    clearInterval(state.interval);
  }
  if (state.process) {
    state.process.kill('SIGTERM');
    state.process = null;
  }
  this.emit('stop');
  return this;
};


var espeak = {
  options: {
    // Words per minute defaults to 160.
    // Tweaking this to 130 makes the output speed
    // much easier to hear and follow.
    '-s': 130,
  }
};

espeak.keys = Object.keys(espeak.options);

module.exports = Speaker;
