global.IS_TEST_ENV = true;

// System Objects
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
global.got = require('got');
global.MjpegConsumer = require('tessel-mjpeg-consumer');


// Create a sandbox
global.sandbox = sinon.sandbox.create();

// Dependencies: Internal (pre-stub/spy)
global.shared = require('../../lib/shared');

// used in the tests to check for calls that occur when
// the dependency if first used by the component classes.
global.sandbox.stub(cp, 'spawnSync');
global.sandbox.spy(shared, 'killAndCatch');


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


global.aplayListDevices = [
  '**** List of PLAYBACK Hardware Devices ****',
  'card 0: Device [USB Audio Device], device 0: USB Audio [USB Audio]',
  '  Subdevices: 1/1',
  '  Subdevice #0: subdevice #0',
  ''
].join('\n');
