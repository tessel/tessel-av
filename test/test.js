var av = require('../');
var fs = require('fs');
var imagesize = require('imagesize');
var assert = require('assert');

var Camera = av.Camera;
var Microphone = av.Microphone;
var Speaker = av.Speaker;

console.log(Camera, Microphone, Speaker);

var camera = new Camera();
var capture = camera.capture();

imagesize(capture, function(error, result) {
  assert.ok(error === null);
  assert.ok(result.format === 'jpeg');
  assert.ok(result.width > 0);
  assert.ok(result.height > 0);
  console.log('passed');
});

capture.on('data', function(data) {
  fs.writeFileSync('captures/captured-via-data-event.jpg', data);
});

capture.pipe(fs.createWriteStream('captures/captured-via-pipe.jpg'));
