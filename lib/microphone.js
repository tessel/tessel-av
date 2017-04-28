'use strict';

// Dependencies: Built-in
const cp = require('child_process');
const Emitter = require('events').EventEmitter;

// Dependencies: Internal
const CaptureStream = require('./capture-stream');

// Program specific
const priv = new WeakMap();

try {
  cp.spawnSync('kill -9 $(pgrep "aplay")');
} catch (error) {}

try {
  cp.spawnSync('kill -9 $(pgrep "arecord")');
} catch (error) {}


class Microphone extends Emitter {
  constructor(options) {
    super();

    options = options || {};

    const state = {
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

  listen(options) {
    const state = priv.get(this);
    const time = 0;
    let offset = null;
    let args = [];

    if (state.isListening) {
      return state.cs;
    }

    options = options || {};

    if (Array.isArray(options)) {
      // mic.listen(['-f', 'cd', '-c', 1, '-r', 48000 ]);
      args = options;
    } else {
      // Don't need to check for null, since those are handled above
      /* istanbul ignore else */
      if (typeof options === 'object') {
        //  mic.listen({
        //    ...
        //  });
        //
        args = Object.keys(options).reduce((accum, key) => {
          const value = options[key];
          let option = '';

          /* istanbul ignore else */
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

    /* istanbul ignore else */
    if (state.arecord === null) {
      state.isListening = true;
      state.currentTime = 0;
      state.startTime = Date.now();
      state.interval = setInterval(() => {
        const now = Date.now();
        if (offset === null) {
          offset = now - state.startTime;
        }
        state.currentTime = time + (now - state.startTime - offset) / 1000;

        this.emit('timeupdate', this.currentTime);
      }, 100);

      // Apply some reasonable defaults...
      arecord.keys.forEach(key => {
        if (!args.includes(key)) {
          args.push(key, arecord.options[key]);
        }
      });

      state.arecord = cp.spawn('arecord', args);

      /* istanbul ignore if */
      if (this.debug) {
        state.arecord.stderr.on('data', data => {
          const lines = data.toString().split('\n').filter(Boolean).map(line => line.trim());
          console.error(lines.join('\n'));
        });
      }

      state.arecord.stdout.on('data', data => {
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
  }

  monitor(catpureStream) {
    const state = priv.get(this);

    if (state.isListening) {
      state.aplay = cp.spawn('aplay', ['-f', 'cd' /*, '-D', 'plughw:0,0' */ ]);
    }

    if (catpureStream) {
      return catpureStream.pipe(state.aplay.stdin);
    } else {
      return state.cs.pipe(state.aplay.stdin);
    }
  }

  stop() {
    const state = priv.get(this);

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
  }
}

const defaults = ['-f', 'cd', '-r', '48000' /*, '-D', 'plughw:0,0' */ ];
const arecord = {
  options: {
    // Disable until we can figure out how best to
    // apply these without clumisly over-riding related flags
    // '-f': 'cd',
    // '-c': 1,
    // '-r': 48000,
    // '-D': 'plughw:0,0',
  },
};

arecord.keys = Object.keys(arecord.options);

module.exports = Microphone;
