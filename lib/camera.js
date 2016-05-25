// Dependencies: Built-in
var cp = require('child_process');
var Emitter = require('events').EventEmitter;
var fs = require('fs');

// Dependencies: Internal
var CaptureStream = require('./capture-stream');

// Program Specific
var priv = new Map();

function scale(value, fromLow, fromHigh, toLow, toHigh) {
  return ((value - fromLow) * (toHigh - toLow) /
    (fromHigh - fromLow) + toLow) | 0;
}

function constrain(value, lower, upper) {
  return Math.min(upper, Math.max(lower, value));
}

var cameraDefaults = {
  width: 320,
  height: 240,
  // 0-1 fractional percent. 1 => best, 0 => worst.
  // maps to: ffmpeg -q:v 1-30 (Lower number is better)
  quality: 1,
  path: '/dev/video0',
  output: '/tmp/capture.jpg',
  stream: false,
  pipe: true,
};

function Camera(options) {
  Emitter.call(this);

  options = options || {};

  var settings = Object.assign({}, cameraDefaults, options || {});

  if (settings.width > cameraDefaults.width ||
    settings.height > cameraDefaults.height) {
    console.log(`Those dimensions are too big, so I'm going to ignore them.`);
    settings.width = cameraDefaults.width;
    settings.height = cameraDefaults.height;
  }

  // We need to look at actual user input, not merged defaults.
  if (typeof options.output !== 'undefined') {
    settings.pipe = false;
  }

  var state = {
    isStreaming: false,
    stream: settings.stream,
    pipe: settings.pipe,
    path: settings.path,
    quality: constrain(settings.quality, 0, 1),
    width: settings.width,
    height: settings.height,
    output: settings.output,
    process: null,
  };

  priv.set(this, state);

  Object.defineProperties(this, {
    isStreaming: {
      get: () => state.isStreaming,
    },
  });
}

Camera.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Camera
  },
});

Camera.prototype.stop = function() {
  var state = priv.get(this);
  state.process.kill('SIGTERM');
  state.process = null;
};

Camera.prototype.capture = function(options) {
  var state = priv.get(this);
  var cs = new CaptureStream();
  var buffer;

  options = options || {};

  if (typeof options.pipe !== 'undefined') {
    state.pipe = options.pipe;
  }

  if (typeof options.stream !== 'undefined') {
    state.stream = options.stream;
  }

  if (typeof options.output !== 'undefined') {
    state.output = options.output;
    state.pipe = false;
  }

  if (state.pipe === false && typeof state.output === 'undefined') {
    state.output = cameraDefaults.output;
  }

  if (state.stream && state.quality > 0.9) {
    state.quality = 0.9;
  }

  var args = [
    // Overwrite: yes
    '-y',
    // Logging: fatal
    '-v', 'fatal',

    // Input...
    '-f', 'v4l2',
    '-r', 8,
    '-s', `${state.width}x${state.height}`,
    '-i', state.path,

    // Output...
    '-s', `${state.width}x${state.height}`,
    '-q:v', scale(state.quality, 0, 1, 30, 1),
  ];

  if (state.stream) {
    // args.splice(2, 0, '-f', 'v4l2');

    args.push(
      // '-r', 8,
      // '-i', '/dev/video0',
      // '-y',
      // '-s', '320x240',
      '-f', 'MJPEG',
      // '-f', 'h264',
      '-b:v', '64k',
      // '-maxrate', '64k',
      // '-movflags', '+faststart',
      '-r', 8,
      'pipe:1'
    );
  } else {
    args.push(
      // '-v', 'fatal',
      // '-i', state.path,
      // '-s', `${state.width}x${state.height}`,
      // '-f', 'MJPEG',
      // '-f', 'h264', '-vcodec',
      // '-q:v', scale(state.quality, 0, 1, 30, 1),
      '-f', 'MJPEG',
      '-vframes', 1
    );

    if (state.pipe) {
      args.push('pipe:1');
    } else {
      args.push(state.output);
    }
  }


  if (state.process && state.isStreaming) {
    return this;
  }

  state.process = cp.spawn('ffmpeg', args);

  if (state.stream) {
    state.isStreaming = true;
  }

  state.process.stdout.on('data', (data) => {
    if (!data) {
      return;
    }

    if (data && !data.length) {
      return;
    }

    if (state.isStreaming) {
      cs.push(data);
      this.emit('data', data);
    } else {
      buffer = data;
    }
  });

  state.process.on('close', (code) => {
    var error = code === 0 ? null : error;

    state.isStreaming = false;

    if (!buffer) {
      return;
    }

    if (buffer && !buffer.length) {
      return;
    }

    if (error) {
      this.emit('error', error);
    } else {
      if (state.pipe) {
        this.emit('data', buffer);
        cs.push(buffer);
        cs.push(null);
      } else {
        // This path is only taken for still captures that
        // would like to store the image on the disc.
        //
        // TODO: allow program specified target locations
        //
        fs.readFile(state.output, (error, data) => {
          this.emit('data', data);
          cs.push(data);
          cs.push(null);
        });
      }
    }
  });

  return cs;
};

Camera.prototype.stream = function() {
  // TODO: Accept options/array of custom ffmpeg settings
  return this.capture({
    stream: true,
    pipe: true
  });
};

Camera.prototype.stop = function() {
  var state = priv.get(this);
  if (!state.isStreaming) {
    return this;
  }
  state.isStreaming = false;

  if (state.process) {
    state.process.kill('SIGTERM');
    state.process = null;
  }
  this.emit('stop');
  return this;
};


module.exports = Camera;
