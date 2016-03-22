# tessel-av

[![Travis Build Status](https://travis-ci.org/tessel/tessel-av.svg?branch=master)](https://travis-ci.org/tessel/tessel-av) 

USB Audio and Video API for Tessel 2.


- Camera, for still shots (video coming soon)
- Microphone, for sound recording (coming soon)
- Player, for sound playback 
- Speaker, for text-to-speech playback


```
npm install tessel-av
```

## Examples


### av.Camera API 

The `Camera` class produces instances that may be used to capture a still frame or stream frames from a capable USB camera. 


#### Constructor Parameters

| Property | Type    | Value/Description  | Default  | Required        |
|----------|---------|--------------------|----------|-----------------|
| width    | number  | Set the width of the captured or streamed frames. | 320 | no |
| height   | number  | Set the height of the captured or streamed frames. | 240 | no |
| path     | string  | The system path to the video device | `/dev/video0` | no |  
| quality  | number  | Set the quality from 0...1 | 1 | no |  
| output   | string  | Name of an output file to direct still frame capture data. By default, no captures are written to disc. Setting `output` results in `pipe: false` | `/tmp/capture.jpg` | no |  



- **`capture`** Take a still frame. Returns a `CaptureStream` of jpeg encoded data. 
- **`stream`** Capture a stream of frames. Returns a `CaptureStream` of jpeg encoded frame data. 


### av.Camera Events

- **`data`** when capture has data.
- **`ended`** when capture ends.

The following is an example of using both the `data` event and the capture stream to write the same JPEG data to two different files. 

```js
var av = require('tessel-av');
var fs = require('fs');
var path = require('path');

var camera = new av.Camera();
var capture = camera.capture();

capture.on('data', function(data) {
  fs.writeFile(path.join(__dirname, 'captures/captured-via-data-event.jpg'), data);
});

capture.pipe(fs.createWriteStream(path.join(__dirname, 'captures/captured-via-data-event.jpg')));
```

Next, an example of streaming video frames to the browser from an Express + Socket.IO server:

```js
var av = require('tessel-av');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var os = require('os');
var path = require('path');
var cp = require('child_process');
var port = 8080;

server.listen(port, function () {
  console.log(`http://${os.hostname()}.local:${port}`);
});

app.use(express.static(path.join(__dirname, '/public')));

io.on('connection', (socket) => {
  var camera = new av.Camera();

  socket.on('ready', () => camera.stream());
  camera.on('data', (data) => {
    socket.emit('image', data.toString('base64'));
  });
});

process.on("SIGINT", _ => server.close());
```

And here's the `public/index.html` file: 

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>stream</title>
    <script src="/socket.io/socket.io.js"></script>
  </head>
  <body>
    <canvas id="output" width="320" height="240" style="border:solid;"></canvas>
    <script>
    window.onload = function() {
      var context = document.getElementById("output").getContext("2d");
      var socket = io();
      var frame = null;

      socket.on("image", (encoded) => {
        frame = "data:image/jpeg;base64," + encoded;
      });

      socket.emit("ready");

      setInterval(() => {
        if (frame) {
          var image = new Image();
          image.src = frame;
          try {
            context.drawImage(image, 0, 0);
          } catch (e) {
            // ... suppress InvalidStateError
          }
        }
      }, 1000 / 24);
    };
  </script>    
  </body>
</html>
```

### av.Player API 

The `Player` class produces instances that may be used to play audio from an mp3 file stored on the Tessel 2.

(Prior to v0.3.0, the `av.Speaker` class was used for audio file playback, and while that still works in versions >=0.3.0, programs will need to update to use this class before 1.0.0 (estimated release: July 1st, 2016)


#### Constructor Parameters

The `Player` class constructor accepts one argument, which is optional, that specifies an mp3 file to play when the `play()` method is called. The may be omitted and supplied directly to `play(file [, time])` at a later time in the object's lifecycle.


- **`play([seconds])`** Play the specified file. Optionally provide a time to start at in seconds. See Allowed Time String Formats
- **`play([ file [, seconds])`** Play the specified file. Optionally provide a time to start at in seconds. See Allowed Time String Formats
- **`play([ 'file.mp3', ...options ])`** Play the file with additional options in an array. 
- **`play(options)`** Play the file with additional options in an object. 
  ```
  Options {
    phrase: "Hello Dave, you're looking well today", 
    ...
  }
  ```

- **`pause()`** Pause playback of the current file. 
- **`stop()`** Stop playback of the current file (calling `play()` will start the playback from the beginning.)

Allowed Time String Formats:

| Format | Type |
| ------ | ---- |
| `hh:mm:ss` | string |
| `ssss.dddd` | number |
| `ssss` | number |


#### Options

Options may be _most_ of [options supported by `madplay`](madplay.md). For example, if I wanted to set the amplitude and pitch: 

```js
player.play(['foo.mp3', '-a', 10, '-r', 2 ]);
player.play(['foo.mp3', 'a', 10, 'r', 2 ]);
```

or 

```js
player.play({
  file: 'foo.mp3',
  a: 10,
  r: 2,
});
```


### av.Player Events

- **`ended`** when playback ends.
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
var sound = new av.Player(mp3);

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


Alternatively, an mp3 file may be provided at the `play(...)` call site: 

```js
var path = require('path');
var av = require('./lib/index');
var mp3 = path.join(__dirname, 'some-audio-file.mp3');
var sound = new av.Player();

// Play the mp3, starting at the 10 second mark.
sound.play(mp3, "10");

sound.on('ended', function() {
  console.log('This is not the end!');
  sound.play();
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


### av.Speaker API 

(Prior to v0.3.0, the `av.Speaker` class was used for audio file playback, and while that still works in versions >=0.3.0, programs will need to update to use this class before 1.0.0 (estimated release: July 1st, 2016)


- **`say("phrase")`** Speak the phrase (string). 
- **`say(["phrase", ...])`** Speak the phrase with additional options in an array. 
- **`say(options)`** Speak the phrase with additional options in an object. 
  ```
  Options {
    phrase: "Hello Dave, you're looking well today", 
    ...
  }
  ```
- **`stop()`** Stop playback.


#### Options

Options may be _most_ of the [options supported by `espeak`](espeak.md). For example, if I wanted to set the amplitude and pitch: 

```js
speaker.say(['Hello!', '-a', 10, '-p', 50 ]);
speaker.say(['Hello!', 'a', 10, 'p', 50 ]);
```

or 

```js
speaker.say({
  phrase: 'Hello!',
  a: 10,
  p: 50,
});
```


#### Queuing

Back to back calls to `speaker.say(...)` will result in each phrase being queued. Once a phrase has been said, the next phrase in the queue will be spoken.


### av.Speaker Events

- **`ended`** when speech ends.
- **`empty`** when speech ends and the speech queue is empty.
- **`lastword`** when speech ends and the speech queue is empty and the program should **prevent** any further `empty` events from being emitted. This allows your robot to get the last word in without repeating themselves forever.
- **`say`** after `say()` is called.
- **`stop`** after `stop()` is called.
- **`timeupdate`** approximately every 100ms. Delivers an approximation of the speech time in seconds, as `ssss.ddd`.

The following is an example of the API and events working together: 

- The first phrase will be said.
- Once spoken, the `ended` event will trigger, which will start the "cycle" through the letters of the alphabet.

```js
var os = require('os');
var path = require('path');
var av = require('tessel-av');

var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
var speaker = new av.Speaker();

speaker.say(`
  Hello, this is ${os.hostname()}. I'm going to say my A-B-C's now
`);

speaker.on('ended', function() {
  if (alphabet.length) {
    this.say(alphabet.shift());
  }
});
```

Alternatively, each letter can be "queued": 

```js
var os = require('os');
var av = require('tessel-av');

var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
var speaker = new av.Speaker();

speaker.say(`
  Hello, this is ${os.hostname()}. I'm going to say my A-B-C's now
`);

alphabet.forEach(letter => speaker.say(letter));

speaker.on('lastword', function() {
  // If this had been an `empty` event, it would've 
  // been emitted again as soon as the next phrase 
  // was spoken.
  this.say('And now I know my A-B-Cs');
});
```


## License

MIT.
