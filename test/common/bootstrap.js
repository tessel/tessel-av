global.IS_TEST_ENV = true;

// Dependencies: Built-in
global.cp = require('child_process');
global.events = require('events');
global.fs = require('fs');
global.path = require('path');
global.stream = require('stream');
global.util = require('util');

global.Emitter = events.EventEmitter;
global.Readable = stream.Readable;
global.Writable = stream.Writable;


// Dependencies: Third Party
global.sinon = require('sinon');
global.MjpegConsumer = require('tessel-mjpeg-consumer');


// Dependencies: Internal
global.av = require('../../lib/index');
global.CaptureStream = require('../../lib/capture-stream');
global.Camera = require('../../lib/camera');
global.Microphone = require('../../lib/microphone');
global.Player = require('../../lib/player');
global.Speaker = require('../../lib/speaker');

// Binaries
// global.isDarwin = process.platform === 'darwin';
// global.binding = global.isDarwin && require('bindings')('capture.node');
