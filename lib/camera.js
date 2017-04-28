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

try {
  cp.spawnSync('kill -9 $(pgrep "mjpg_streamer")');
} catch (error) {}


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

    /* istanbul ignore else */
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
    /* istanbul ignore else */
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
        /* istanbul ignore else */
        if (state.process) {
          state.process.kill('SIGTERM');
          state.process = null;
        }
      }
    };

    priv.set(this, state);

    Object.defineProperties(this, {
      dimensions: {
        get() {
          return dimensions;
        }
      },
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
      let incoming = state.stream.pipe(new MjpegConsumer());

      incoming.on('data', frame => state.frame = frame);
      incoming.on('error', () => {
        state.stream = null;
        this.stream();
      });
      incoming.pipe(this);
    }
    return this;
  }

  capture() {
    let cs = new CaptureStream(this);

    this.stream();
    this.once('data', data => {
      cs.push(data);
      cs.push(null);
      cs.on('end', () => this.stop());
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
    /* istanbul ignore else */
    if (chunk) {
      this.emit('data', chunk);
      this.emit('frame', chunk);
    }
  }
}

module.exports = Camera;
