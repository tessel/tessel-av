// Dependencies: Built-in
var cp = require('child_process');
var Emitter = require('events').EventEmitter;

// Dependencies: Internal
var CaptureStream = require('./capture-stream');

// Program specific
var priv = new WeakMap();

function Microphone(options) {
  Emitter.call(this);

  options = options || {};

  var state = {
    arecord: null,
    aplay: null,
    currentTime: 0,
    isListening: false,
    interval: null,
    cs: new CaptureStream(),
    time: null,
  };

  priv.set(this, state);

  Object.defineProperties(this, {
    currentTime: {
      get: () => Number(state.currentTime.toFixed(3)),
    },
    isListening: {
      get: () => state.isListening,
    },
  });
}

Microphone.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Microphone
  }
});

var defaults = ['-f', 'cd', '-c', '1', '-r', '41100', '-D', 'plughw:0,0'];

Microphone.prototype.listen = function(options) {
  var state = priv.get(this);
  var args = [];
  var offset = null;
  var time = 0;

  if (state.isListening) {
    return state.cs;
  }

  options = options || {};

  if (Array.isArray(options)) {
    // mic.listen(['-f', 'cd', '-c', 1, '-r', 41100 ]);
    args = options;
  } else {
    // Don't need to check for null, since those are handled above
    if (typeof options === 'object') {
      //  mic.listen({
      //    ...
      //  });
      //
      args = Object.keys(options).reduce((accum, key) => {
        var value = options[key];
        var option = '';

        if (key.length === 1) {
          //  mic.listen({
          //    c: 1,
          //    f: 'cd',
          //  });
          //
          option = '-';
        }

        //  mic.listen({
        //    '-c': 1,
        //    '-f': 'cd',
        //  });
        //
        option += key;

        accum.push(option, value);

        return accum;
      }, []);
    }
  }

  if (args.length === 0) {
    args = defaults.slice();
  }

  if (state.arecord === null) {
    state.isListening = true;
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
    Object.keys(arecord.options).forEach(key => {
      if (!args.includes(key)) {
        args.push(key, arecord.options[key]);
      }
    });

    state.arecord = cp.spawn('arecord', args);

    if (this.debug) {
      state.arecord.stderr.on('data', (data) => {
        var lines = data.toString().split('\n').filter(Boolean).map(line => line.trim());
        lines.forEach(line => {
          console.error(line);
        });
      });
    }

    state.arecord.stdout.on('data', (data) => {
      state.cs.push(data);
      this.emit('data', data);
      this.emit('timeupdate', this.currentTime);
    });

    state.arecord.on('close', (code, signal) => {
      if (code !== null && signal === null) {
        if (state.interval) {
          clearInterval(state.interval);
        }
        state.arecord = null;
        state.currentTime = 0;
        state.startTime = 0;
        state.isListening = false;

        this.emit('close');
      }
    });

    this.emit('listen');
  }

  return state.cs;
};

Microphone.prototype.monitor = function(catpureStream) {
  var state = priv.get(this);

  if (state.isListening) {
    state.aplay = cp.spawn('aplay', ['-D', 'plughw:0,0']);
  }

  if (catpureStream) {
    return catpureStream.pipe(state.aplay.stdin);
  } else {
    return state.cs.pipe(state.aplay.stdin);
  }
};

Microphone.prototype.stop = function() {
  var state = priv.get(this);
  if (!state.isListening) {
    return this;
  }
  state.isListening = false;
  if (state.interval) {
    clearInterval(state.interval);
  }
  if (state.arecord) {
    state.arecord.kill('SIGTERM');
    state.arecord = null;
  }
  if (state.aplay) {
    state.aplay.kill('SIGTERM');
    state.aplay = null;
  }
  this.emit('stop');
  return this;
};


var arecord = {
  options: {
    '-f': 'cd',
    '-c': 1,
    '-r': 41100,
    '-D': 'plughw:0,0',
  },
};

arecord.keys = Object.keys(arecord.options);

module.exports = Microphone;
