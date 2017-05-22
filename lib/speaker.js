'use strict';

// System Objects
const cp = require('child_process');
const Emitter = require('events').EventEmitter;

// Dependencies: Internal
const shared = require('./shared');

// Program Specific
const priv = new WeakMap();

shared.killAndCatch('espeak');
shared.killAndCatch('aplay');

class Speaker extends Emitter {
  constructor(options) {
    super();

    // Previously, Speaker was used for playing mp3s,
    // but that functionality now lives in Player.
    // This avoids breaking existing code.
    if (options &&
      (typeof options === 'string' && options.endsWith('.mp3'))) {
      throw new Error('Use the Player class to play audio files');
    }

    options = options || {
      debug: false
    };

    const list = cp.execSync('aplay --list-devices').toString();
    const card = list.split('\n')[1];
    const device = card.match(/(?:card|device)\s(\d):/g)
      .map(match => match.replace(/[^0-9.]/g, '')).join();

    const state = {
      device: `plughw:${device}`,
      debug: options.debug,
      queue: [],
      isSpeaking: false,
      interval: null,
      process: {
        aplay: null,
        espeak: null,
      },
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

  say(phrase) {
    const state = priv.get(this);
    let args = [];
    let offset = null;
    const time = 0;

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
        let hasPhrase;


        // Don't need to check for null, since those are handled above
        /* istanbul ignore else */
        if (typeof phrase === 'object') {
          // speaker.say({
          //  phrase: 'Hello!',
          //  a: 10,
          //  p: 50,
          // });
          //
          args = Object.keys(phrase).reduce((accum, key) => {
            const value = phrase[key];
            let option = '';

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

    /* istanbul ignore else */
    if (state.process.espeak === null) {
      state.isSpeaking = true;
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
      Object.keys(espeak.options).forEach(key => {
        /* istanbul ignore else */
        if (!args.includes(key)) {
          args.push(key, espeak.options[key]);
        }
      });

      let processStream;

      if (state.device !== 'plughw:0,0') {
        args.push('--stdout');
        state.process.espeak = cp.spawn('espeak', args);
        state.process.aplay = cp.spawn('aplay', ['-f', 'cd', '-D', state.device]);
        state.process.espeak.stdout.pipe(state.process.aplay.stdin);
        processStream = state.process.aplay;
      } else {
        state.process.espeak = cp.spawn('espeak', args);
        processStream = state.process.espeak;
      }



      /* istanbul ignore if */
      if (this.debug) {
        state.process.espeak.stderr.on('data', (data) => {
          const lines = data.toString().split('\n').filter(Boolean).map(line => line.trim());
          lines.forEach(line => {
            console.error(line);
          });
        });
      }

      processStream.on('exit', (code, signal) => {
        /* istanbul ignore else */
        if (code !== null && signal === null) {
          /* istanbul ignore else */
          if (state.interval) {
            clearInterval(state.interval);
          }
          state.process.espeak = null;
          state.currentTime = 0;
          state.startTime = 0;
          state.isSpeaking = false;

          this.emit('ended');

          if (state.queue.length) {
            this.say(state.queue.shift());
          } else {
            /* istanbul ignore else */
            if (!state.theLastWord) {
              /* istanbul ignore if */
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
  }

  stop() {
    const state = priv.get(this);
    if (!state.isSpeaking) {
      return this;
    }
    state.isSpeaking = false;
    /* istanbul ignore else */
    if (state.interval) {
      clearInterval(state.interval);
    }
    /* istanbul ignore else */
    if (state.process.espeak) {
      state.process.espeak.kill('SIGTERM');
      state.process.espeak = null;
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
