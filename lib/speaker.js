var cp = require('child_process');
var path = require('path');

var Emitter = require('events').EventEmitter;
var priv = new WeakMap();

function toSeconds(time) {
  if (typeof time === 'number') {
    return time;
  }

  var sets = time.split(':');
  var first = sets[0];

  return {
    1: parseFloat(first, 10),
    2: (parseInt(first, 10) * 60) +
      parseFloat(sets[1], 10),
    3: (parseInt(first, 10) * 3600) +
      (parseInt(sets[1], 10) * 60) +
      parseFloat(sets[2], 10)
  }[sets.length || 1];
}


function Speaker(filename) {
  Emitter.call(this);

  if (!filename || !filename.endsWith('.mp3')) {
    filename = filename || '';
    throw new Error(
      `av.Speaker can only playback mp3.
      To convert your audio, use:

        ffmpeg -i ${filename} ${filename.replace(path.extname(filename), '.mp3')}

      `
    );
  }

  var state = {
    filename,
    isPlaying: false,
    interval: null,
    process: null,
    time: null,
    pauseTime: 0,
    currentTime: 0,
  };

  priv.set(this, state);

  Object.defineProperties(this, {
    currentTime: {
      get: () => Number(state.currentTime.toFixed(3)),
    },
    isPlaying: {
      get: () => state.isPlaying,
    },
  });
}

Speaker.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Speaker
  }
});

Speaker.prototype.play = function(time) {
  var state = priv.get(this);
  var args = [state.filename];
  var offset = null;

  if (state.isPlaying) {
    return this;
  }

  if (typeof time === 'string') {
    if (!/[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(time)) {
      throw new Error(
        `
          The play() method expects time in: hh:mm:ss, ssss, ssss.dddd
        `
      );
    }

    time = toSeconds(time);
  }

  time = time || 0;

  if (state.pauseTime) {
    time = state.pauseTime;
  }

  if (state.process === null) {
    args.push('-s', time || 0);

    state.isPlaying = true;
    state.currentTime = state.pauseTime || 0;
    state.startTime = Date.now();
    state.interval = setInterval(() => {
      var now = Date.now();
      if (offset === null) {
        offset = now - state.startTime;
      }
      state.currentTime = time + (now - state.startTime - offset) / 1000;

      this.emit('timeupdate', this.currentTime);
    }, 100);
    state.process = cp.spawn('madplay', args);
    state.process.on('exit', (code, signal) => {
      if (code !== null && signal === null) {
        if (state.interval) {
          clearInterval(state.interval);
        }
        state.process = null;
        state.currentTime = 0;
        state.startTime = 0;
        state.isPlaying = false;
        this.emit('end');
      }
    });
  }

  this.emit('play');
  return this;
};

Speaker.prototype.stop = function() {
  var state = priv.get(this);
  if (!state.isPlaying) {
    return this;
  }
  state.isPlaying = false;
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

Speaker.prototype.pause = function() {
  var state = priv.get(this);
  if (!state.isPlaying) {
    return this;
  }
  state.isPlaying = false;
  if (state.interval) {
    clearInterval(state.interval);
  }
  state.pauseTime = state.currentTime;
  if (state.process) {
    state.process.kill('SIGTERM');
    state.process = null;
  }
  this.emit('pause');
  return this;
};

module.exports = Speaker;
