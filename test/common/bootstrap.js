global.IS_TEST_ENV = true;

// System Objects
global.cp = require('child_process');
global.events = require('events');
global.path = require('path');
global.stream = require('stream');
global.util = require('util');

global.Emitter = events.EventEmitter;
global.Readable = stream.Readable;


// Third Party
global.sinon = require('sinon');


// Module
global.av = require('../../lib/index.js');
