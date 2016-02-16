# tessel-av

[![Travis Build Status](https://travis-ci.org/tessel/tessel-av.svg?branch=master)](https://travis-ci.org/tessel/tessel-av) 

USB Camera, Microphone and Speaker API for Tessel 2


```
npm install tessel-av
```

## Example

```js
var av = require('audiovideo');
var fs = require('fs');
var Camera = av.Camera;

var camera = new Camera();
var capture = camera.capture();

capture.on('data', function(data) {
  fs.writeFileSync('captures/captured-via-data-event.jpg', data);
});

// or...

capture.pipe(fs.createWriteStream('captures/captured-via-pipe.jpg'));
```

## License

MIT.
