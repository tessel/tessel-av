'use strict';

var av = require('tessel-av');
var fs = require('fs');
var path = require('path');
var camera = new av.Camera();


camera.capture()
  .pipe(fs.createWriteStream(path.join(__dirname, 'capture.jpg')))
  .on('finish', () => {
    console.log('Image Captured.');
    process.exit(0);
  });
