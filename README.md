# tessel-av

[![Travis Build Status](https://travis-ci.org/tessel/tessel-av.svg?branch=master)](https://travis-ci.org/tessel/tessel-av) 

USB Audio and Video API for Tessel 2.


- Camera, for still shots (video coming soon)
- Microphone, for sound recording (coming soon)
- Speaker, for sound playback 


```
npm install tessel-av
```

## Examples


### av.Camera API 

- **`capture`** Capture a still shot. Returns a CaptureStream of jpeg encoded data. 


### av.Camera Events

- **`data`** when capture has data.
- **`end`** when capture ends.

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

- **`end`** when playback ends.
- **`play`** after `play()` is called.
- **`pause`** after `pause()` is called.
- **`stop`** after `stop()` is called.
- **`timeupdate`** approximately every 100ms. Delivers an approximation of the playback time in seconds, as `ssss.ddd`.

The following is an example of the API and events working together: 

- The sound will play from the beginning
- After approximate 2 seconds, the sound will pause
- After 1 second pause, sound will resume  , it will resume playback from the 10 second mark, play until just after the 12 second mark, where it will stop and then play from the beginning again. 

```js
var path = require('path');
var av = require('tessel-av');
var mp3 = path.join(__dirname, '20-second-nonsense.mp3');
var sound = new av.Speaker(mp3);

sound.play();

sound.on('timeupdate', function(seconds) {
  seconds = Math.round(seconds);

  if (seconds === 2) {
    this.pause();
  }

  if (seconds > 12) {
    this.stop().play();
  }
});

sound.on('pause', function() {
  setTimeout(() => this.play(10), 1000);
});
```



> Remember that you **must** explicitly specify static assets by listing them in a `.tesselinclude` file. For example, to ensure the `song.mp3` file is deployed to your Tessel 2, you'll create a file called `.tesselinclude` that contains the following:
> ```
> song.mp3
> ```
> 
> You may find it easier to put all static assets in a sub-directory, such as `public/`, or similar. Then you can include _all_ files and sub-directories by creating a `.tesselinclude` file and listing that assets directory like this: 
> 
> ```
> public
> ```
> 

## License

MIT.
