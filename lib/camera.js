var cp = require('child_process');
var fs = require('fs');

var Emitter = require('events').EventEmitter;
var Readable = require('stream').Readable;

var priv = new Map();

function scale(value, fromLow, fromHigh, toLow, toHigh) {
  return (value - fromLow) * (toHigh - toLow) /
    (fromHigh - fromLow) + toLow;
}

function constrain(value, lower, upper) {
  return Math.min(upper, Math.max(lower, value));
}

function CaptureStream() {
  Readable.call(this);
  this._read = function() {};
}

CaptureStream.prototype = Object.create(Readable.prototype, {
  constructor: {
    value: CaptureStream
  }
});

var cameraDefaults = {
  width: 320,
  height: 240,
  // 0-1 fractional percent. 1 => best, 0 => worst.
  // maps to: ffmpeg -q:v 1-30 (Lower number is better)
  quality: 1,
  path: '/dev/video0',
  stream: false,
  pipe: true,
};

function Camera(options) {
  Emitter.call(this);

  options = Object.assign({}, cameraDefaults, options || {});

  if (options.width > cameraDefaults.width ||
    options.height > cameraDefaults.height) {
    console.log(`Those dimensions are too big, so I'm ignore them.`);

    options.width = cameraDefaults.width;
    options.height = cameraDefaults.height;
  }

  var state = {
    isStreaming: false,
    stream: options.stream,
    pipe: options.pipe,
    path: options.path,
    quality: constrain(options.quality, 0, 1),
    width: options.width,
    height: options.height,
    process: null,
  };

  priv.set(this, state);
}

Camera.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Camera
  },
  isStreaming: {
    get: function() {
      return priv.get(this).isStreaming;
    }
  }
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

  var args = [
    // Overwrite: yes
    '-y',
    // Logging: fatal
    '-v', 'fatal',
    '-r', '30',
    '-i', state.path,
    '-s', `${state.width}x${state.height}`,
    '-q:v', scale(state.quality, 0, 1, 30, 1),
  ];

  if (state.stream) {
    args.push(
      // '-r', '30',
      // '-i', '/dev/video0',
      // '-y',
      // '-s', '320x240',
      '-f', 'MJPEG',
      // '-f', 'h264',
      '-b:v', '64k',
      '-r', '30',
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
      args.push('/tmp/capture.jpg');
    }
  }

  state.process = cp.spawn('ffmpeg', args);

  if (state.stream) {
    state.isStreaming = true;
  }

  state.process.stdout.on('data', (data) => {
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
        fs.readFile('/tmp/capture.jpg', (error, data) => {
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

module.exports = Camera;

if (global.IS_TEST_ENV) {
  module.exports.CaptureStream = CaptureStream;
}
