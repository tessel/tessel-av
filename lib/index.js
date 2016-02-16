var cp = require('child_process');
var fs = require('fs');

var Emitter = require('events').EventEmitter;
var Readable = require('stream').Readable;

var platform = process.platform;
var isDarwin = platform === 'darwin';
var stub = {
  capture: function() {}
};

var priv = new Map();

function CaptureStream() {
  Readable.call(this);
  this._read = function() {};
}

CaptureStream.prototype = Object.create(Readable.prototype, {
  constructor: {
    value: CaptureStream
  }
});

function FSWebcam(options) {
  this.path = options.devpath;
  this.quality = options.quality;
  this.width = options.width;
  this.height = options.height;
}

FSWebcam.prototype.capture = function(callback) {
  // TODO: Stream this directly to capture stream/callback
  var fswebcam = cp.spawn('fswebcam', [
    '-i', '0', '-d', 'v4l2:' + this.path, '--no-banner', '--jpeg', this.quality, '--save', '/tmp/capture.jpg'
  ]);

  fswebcam.on('close', function(code) {
    var error = code === 0 ? null : error;

    if (error) {
      callback(error);
    } else {
      fs.readFile('/tmp/capture.jpg', callback);
    }
  });
};



function Camera(options) {
  Emitter.call(this);

  var device = isDarwin ?
    (global.IS_TEST_ENV ? stub : require('bindings')('capture.node')) :
    new FSWebcam(options);

  priv.set(this, {
    device: device,
    width: options.width,
    height: options.height,
  });
}

Camera.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Camera
  }
});

Camera.prototype.capture = function() {
  var state = priv.get(this);
  var cs = new CaptureStream();

  cs.on('data', function(result) {
    this.emit('data', result);
  }.bind(this));

  cs.on('end', function(result) {
    this.emit('end', result);
  }.bind(this));

  if (isDarwin) {
    setImmediate(function() {
      cs.push(state.device.capture());
      cs.push(null);
    });
  } else {
    state.device.capture(function(error, data) {
      cs.push(data);
      cs.push(null);
    });
  }
  return cs;
};

var defaults = {
  width: 320,
  height: 240,
  quality: 100,
  path: '/dev/video0',
};

module.exports = {
  Camera: function(options) {
    return new Camera(Object.assign({}, defaults, options || {}));
  },
  Microphone: null,
  Speaker: null,
};


if (global.IS_TEST_ENV) {
  module.exports.CaptureStream = CaptureStream;
  module.exports.FSWebcam = FSWebcam;
  module.exports.binding = global.IS_TEST_ENV ? stub : require('bindings')('capture.node');
  module.exports.isDarwin = function(value) {
    if (typeof value === 'undefined') {
      return isDarwin;
    } else {
      isDarwin = value;
    }
  };
}
