# tessel-av

[![Travis Build Status](https://travis-ci.org/tessel/tessel-av.svg?branch=master)](https://travis-ci.org/tessel/tessel-av) 

USB Audio and Video API for Tessel 2.


- Camera, for still shots (video coming soon)
- Microphone, for sound recording
- Speaker, for sound playback 


```
npm install tessel-av
```

## Examples


### av.Camera API 

- **`capture`** Capture a still shot. Returns a CaptureStream of jpeg encoded data. 


### av.Camera Events

- **`data`** Emitted when capture has data.
- **`end`** Emitted when capture ends.

The following is an example of using both the `data` event and the capture stream to write the same JPEG data to two different files. 

```js
var av = require('tessel-av');
var fs = require('fs');

var camera = new av.Camera();
var capture = camera.capture();

capture.on('data', function(data) {
  fs.writeFile('captures/captured-via-data-event.jpg', data);
});

capture.pipe(fs.createWriteStream('captures/captured-via-pipe.jpg'));
```



### av.Speaker API 

- **`play([seconds])`** Play the specified file. Optionally provide a time to start at in seconds. Allowed formats: 
    + `hh:mm:ss` (string)
    + `ssss` (number)
    + `ssss.dddd` (number)
- **`pause()`** Pause playback of the current file. 
- **`stop()`** Stop playback of the current file (calling `play()` will start the playback from the beginning.)

### av.Speaker Events


- **`end`** Emitted when playback ends.
- **`play`** Emitted afer `play()` is called.
- **`pause`** Emitted afer `pause()` is called.
- **`stop`** Emitted afer `stop()` is called.
- **`timeupdate`** Emitted approximately every 100ms. Delivers an approximation of the playback time in milliseconds.

The following is an example of the API and events working together; the sound will play, then pause for a second just after the 2 second mark, it will resume playback from the 10 second mark, play until just after the 12 second mark, where it will stop and then play from the beginning again. 

```js
var av = require('tessel-av');
var mp3 = path.join(__dirname, '20-second-nonsense.mp3');
var sound = new av.Speaker(mp3);

sound.play();

sound.on('timeupdate', function(data) {
  if (data >= 2 && data <= 3) {
    this.pause();
  }

  if (data > 12) {
    this.stop().play();
  }
});

sound.on('pause', function() {
  setTimeout(() => this.play(10), 1000);
});
```



> Remember to always include static assets in your project's .tesselinclude file. For example, to use the file shown above, you'd make a .tesselinclude file like this: 
> ```
> song.mp3
> ```

## License

MIT.
