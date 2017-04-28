'use strict';

// Dependencies: Built-in
const cp = require('child_process');
const Emitter = require('events').EventEmitter;
const path = require('path');

// Program Specific
const priv = new WeakMap();

try {
  cp.spawnSync('kill -9 $(pgrep "madplay")');
} catch (error) {}


function toSeconds(time) {
  if (typeof time === 'number') {
    return time;
  }

  const num = Number(time);
  if (!Number.isNaN(num)) {
    return num;
  }

  const sets = time.split(':');
  const first = sets[0];

  return {
    1: parseFloat(first, 10),
    2: (parseInt(first, 10) * 60) + parseFloat(sets[1], 10),
    3: (parseInt(first, 10) * 3600) + (parseInt(sets[1], 10) * 60) + parseFloat(sets[2], 10)
  }[sets.length || 1];
}

class Player extends Emitter {
  constructor(filename) {
    super();

    if (typeof filename === 'string' && !filename.endsWith('.mp3')) {
      filename = filename || '';
      throw new Error(
        `av.Player can only playback mp3.
        To convert your audio, use:

          ffmpeg -i ${filename} ${filename.replace(path.extname(filename), '.mp3')}

        `
      );
    }

    const device = '/dev/dsp';
    const card = +cp.execSync('aplay --list-devices')
      .toString().split('\n')[1].match(/(?:\s)(\d)(?:\:)/)[1];

    const state = {
      filename,
      device: `${device}${card ? card : ''}`,
      isPlaying: false,
      interval: null,
      process: null,
      time: null,
      pauseTime: 0,
      currentTime: 0,
    };

    priv.set(this, state);

    Object.defineProperties(this, {
      file: {
        get: () => state.filename,
      },
      currentTime: {
        get: () => Number(state.currentTime.toFixed(3)),
      },
      isPlaying: {
        get: () => state.isPlaying,
      },
    });
  }

  play(file, time) {
    const state = priv.get(this);
    let offset = null;
    let args = [];
    let hasFile = false;
    let pushFile = true;

    if (state.isPlaying || (!state.filename && file == null)) {
      return this;
    }

    if (typeof time === 'undefined') {
      time = 0;
    }

    if (typeof file === 'string') {
      if (file.endsWith('.mp3')) {
        state.filename = file;
      } else {
        // We'll attempt to accept this as a time code
        time = file;
      }

      /* istanbul ignore else */
      if (typeof time !== 'undefined') {
        if (!/^([0-9]+:){0,2}[0-9]+([.;][0-9]+)?$/.test(time)) {
          throw new Error(
            `
              The play() method expects time in: hh:mm:ss, ssss, ssss.dddd
            `
          );
        }
        time = toSeconds(time);
      }
    } else {

      if (typeof file === 'number') {
        time = file;
      }

      if (Array.isArray(file)) {
        // player.play(['file.mp3', '-a', 10, '-r', 2 ]);
        args = file;
        time = null;
        pushFile = false;
      } else {
        // Don't need to check for null, since those are handled above
        if (typeof file === 'object') {
          // player.play({
          //  file: 'file.mp3',
          //  a: 10,
          //  r: 2,
          // });
          //
          args = Object.keys(file).reduce((accum, key) => {
            const value = file[key];
            let option = '';

            // When the key is "file", we only want the value
            if (key === 'file') {
              hasFile = true;
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

          time = null;
          pushFile = false;

          // If no "file" property was provided, nothing to do.
          if (!hasFile) {
            return this;
          }
        }
      }
    }

    if (pushFile) {

      if (!state.filename) {
        return this;
      }

      args.push(state.filename);
    }

    if (state.pauseTime) {
      time = state.pauseTime;
    }

    /* istanbul ignore else */
    if (state.process === null) {

      if (time !== null) {
        args.push('-s', time || 0);
      }

      state.isPlaying = true;
      state.currentTime = state.pauseTime || 0;
      state.startTime = Date.now();
      state.interval = setInterval(() => {
        const now = Date.now();
        if (offset === null) {
          offset = now - state.startTime;
        }
        state.currentTime = time + (now - state.startTime - offset) / 1000;

        this.emit('timeupdate', this.currentTime);
      }, 100);

      args.push('-o', state.device);

      state.process = cp.spawn('madplay', args);

      state.process.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean).map(line => line.trim());
        lines.forEach(line => {
          if (line.includes('No such file or directory')) {
            console.error(line);
          }
        });
      });

      state.process.on('exit', (code, signal) => {
        if (code !== null && signal === null) {
          /* istanbul ignore else */
          if (state.interval) {
            clearInterval(state.interval);
          }

          state.process = null;
          state.currentTime = 0;
          state.startTime = 0;
          state.isPlaying = false;
          this.emit('ended');
        }
      });
    }

    this.emit('play');
    return this;
  }

  stop() {
    const state = priv.get(this);
    if (!state.isPlaying) {
      return this;
    }
    state.isPlaying = false;
    /* istanbul ignore else */
    if (state.interval) {
      clearInterval(state.interval);
    }
    /* istanbul ignore else */
    if (state.process) {
      state.process.kill('SIGTERM');
      state.process = null;
    }
    this.emit('stop');
    return this;
  }

  pause() {
    const state = priv.get(this);
    if (!state.isPlaying) {
      return this;
    }
    state.isPlaying = false;
    /* istanbul ignore else */
    if (state.interval) {
      clearInterval(state.interval);
    }
    state.pauseTime = state.currentTime;
    /* istanbul ignore else */
    if (state.process) {
      state.process.kill('SIGTERM');
      state.process = null;
    }
    this.emit('pause');
    return this;
  }
}

module.exports = Player;
