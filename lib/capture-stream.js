'use strict';

const Readable = require('stream').Readable;

class CaptureStream extends Readable {
  constructor() {
    super();
  }
  _read() {}
}

module.exports = CaptureStream;
