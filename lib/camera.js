'use strict';

// Dependencies: Built-in
const cp = require('child_process');
const Stream = require('stream');

// Dependencies: Third Party
const got = require('got');
const ip = require('ip');
const MjpegConsumer = require('tessel-mjpeg-consumer');

// Dependencies: Internal
const CaptureStream = require('./capture-stream');

const priv = new WeakMap();

const isValidVideoDevice = device => {
  return device && /\/dev\/video\d/.test(device);
};

const isValidRemoteStream = url => {
  return url && url.endsWith('?action=stream');
};

const videoUrl = port => {
  return `http://${ip.address()}:${port}/?action=stream`;
};

class Camera extends Stream {

  constructor(options) {
    super();

    let device = '/dev/video0';
    let dimensions = '800x600';
    let fps = 30;
    let port = 8080;
    let quality = 100;
    let timeout = 10000;
    let url = ''; //  use ip.address()
    let state = {
      frame: null,
      mjpg: null,
      process: null,
      remote: null,
      stream: null,
    };

    if (typeof options === 'undefined') {
      options = {};
    }

    if (typeof options === 'string') {
      url = options;
      options = {};
    }

    // -r
    if (options.dimensions) {
      dimensions = options.dimensions;
    } else {
      if (options.width && options.height) {
        dimensions = `${options.width}x${options.height}`;
      }
    }

    // -q
    if (options.fps) {
      fps = options.fps;
    }

    // -q
    if (options.quality) {
      quality = options.quality;
    }

    // XXXX
    if (options.port) {
      port = options.port;
    }

    // /dev/video0|1
    if (isValidVideoDevice(options.device)) {
      device = options.device;
    }

    // No string url provided
    if (!url) {
      if (options.url && isValidRemoteStream(options.url)) {
        url = options.url;
      } else {
        url = videoUrl(port);
      }
    }

    if (options.timeout) {
      timeout = options.timeout;
    }

    state.mjpg = {
      fps,
      device,
      dimensions,
      quality,
      port,
    };

    state.remote = {
      url,
      timeout,
      start() {
        state.process = cp.spawn('mjpg_streamer', [
          '-i',
          `/usr/lib/input_uvc.so -n -q ${quality} -r ${dimensions} -f ${fps} -d ${device} `,
          '-o',
          `/usr/lib/output_http.so -p ${port}`,
        ]);
      },
      stop() {
        state.process.kill('SIGTERM');
        state.process = null;
      }
    };

    priv.set(this, state);

    Object.defineProperties(this, {
      frame: {
        get() {
          return state.frame;
        }
      },
      url: {
        get() {
          return url;
        }
      }
    });

    // state.process.stdout.on("data", (buffer) => {
    //   console.log(buffer.toString());
    // });
    // state.process.stderr.on("data", (buffer) => {
    //   console.log(buffer.toString());
    // });

    this.highWaterMark = 0;
    this.readable = true;
    this.writable = true;

    this.stream();
  }

  stream() {
    let state = priv.get(this);

    if (!state.process) {
      state.remote.start();
    }

    if (!state.stream) {
      state.stream = got.stream(state.remote.url);
      state.stream.on('error', () => {
        state.stream = null;
        this.stream();
      });
    }

    let incoming = state.stream.pipe(new MjpegConsumer());

    incoming.on('data', frame => state.frame = frame);
    incoming.on('error', () => this.stream());
    incoming.pipe(this);

    return this;
  }

  capture() {
    var state = priv.get(this);
    var cs = new CaptureStream();
    process.nextTick(() => {
      cs.push(state.frame);
      cs.push(null);
    });
    return cs;
  }

  stop() {
    priv.get(this).remote.stop();
    this.emit('stop');
    return this;
  }

  // start() {
  //   priv.get(this).remote.start();
  //   return this;
  // }

  write(chunk) {
    if (chunk) {
      this.emit('data', chunk);
      this.emit('frame', chunk);
    }
  }
}

module.exports = Camera;
