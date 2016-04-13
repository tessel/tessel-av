var Readable = require('stream').Readable;

function CaptureStream() {
  Readable.call(this);
  this._read = function() {};
}

CaptureStream.prototype = Object.create(Readable.prototype, {
  constructor: {
    value: CaptureStream
  }
});


module.exports = CaptureStream;
