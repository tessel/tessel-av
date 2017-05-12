'use strict';
const os = require('os');
const path = require('path');
const av = require('../lib');

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
const speaker = new av.Speaker();

speaker.say(`
  Hello, this is ${os.hostname()}.
  I'm going to say my A-B-C's now
`);

speaker.on('ended', function() {
  if (alphabet.length) {
    this.say(alphabet.shift());
  }
});
