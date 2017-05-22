'use strict';

// System Objects
const cp = require('child_process');
const Emitter = require('events').EventEmitter;

// Dependencies: Internal
const CaptureStream = require('./capture-stream');
const shared = require('./shared');

// Program specific
const priv = new WeakMap();

shared.killAndCatch('aplay');
shared.killAndCatch('arecord');

class Microphone extends Emitter {
  constructor(options) {
    super();

    options = options || {};


    const list = cp.execSync('aplay --list-devices').toString();
    const card = list.split('\n')[1];
    const device = card.match(/(?:card|device)\s(\d):/g)
      .map(match => match.replace(/[^0-9.]/g, '')).join();

    const state = {
      cs: new CaptureStream(),
      currentTime: 0,
      device: {
        arecord: `plughw:${device}`,
        aplay: `plughw:${device}`,
      },
      isListening: false,
      interval: null,
      process: {
        arecord: null,
        aplay: null,
      },
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
    if (state.process.arecord === null) {
      state.isListening = true;
      state.currentTime = 0;
      state.startTime = Date.now();
      state.interval = setInterval(() => {
        const now = Date.now();
        /* istanbul ignore else */
        if (offset === null) {
          offset = now - state.startTime;
        }
        state.currentTime = time + (now - state.startTime - offset) / 1000;

        this.emit('timeupdate', this.currentTime);
      }, 100);

      // Apply some reasonable defaults...
      // arecord.keys.forEach(key => {
      //   if (!args.includes(key)) {
      //     args.push(key, arecord.options[key]);
      //   }
      // });

      state.process.arecord = cp.spawn('arecord', args);

      /* istanbul ignore if */
      if (this.debug) {
        state.process.arecord.stderr.on('data', data => {
          const lines = data.toString().split('\n').filter(Boolean).map(line => line.trim());
          console.error(lines.join('\n'));
        });
      }

      state.process.arecord.stdout.on('data', data => {
        state.cs.push(data);
        this.emit('data', data);
        this.emit('timeupdate', this.currentTime);
      });

      state.process.arecord.on('close', (code, signal) => {
        /* istanbul ignore if */
        if (code !== null && signal === null) {
          if (state.interval) {
            clearInterval(state.interval);
          }
          state.process.arecord = null;
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

    /* istanbul ignore else */
    if (state.isListening) {
      state.process.aplay = cp.spawn('aplay', ['-f', 'cd' /*, '-D', 'plughw:0,0' */ ]);
    }

    if (catpureStream) {
      return catpureStream.pipe(state.process.aplay.stdin);
    } else {
      return state.cs.pipe(state.process.aplay.stdin);
    }
  }

  stop() {
    const state = priv.get(this);

    if (!state.isListening) {
      return this;
    }

    state.isListening = false;

    /* istanbul ignore else */
    if (state.interval) {
      clearInterval(state.interval);
    }

    /* istanbul ignore else */
    if (state.process.arecord) {
      state.process.arecord.kill('SIGTERM');
      state.process.arecord = null;
    }

    /* istanbul ignore else */
    if (state.process.aplay) {
      state.process.aplay.kill('SIGTERM');
      state.process.aplay = null;
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
