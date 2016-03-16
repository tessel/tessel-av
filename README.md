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

- **`capture`** Capture a still shot. Returns a CaptureStream of jpeg encoded data. 


### av.Camera Events

- **`data`** when capture has data.
- **`ended`** when capture ends.

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



### av.Player API 

(Prior to v0.3.0, the `av.Speaker` class was used for audio file playback, and while that still works in versions >=0.3.0, programs will need to update to use this class before 1.0.0 (estimated release: July 1st, 2016)


- **`play([seconds])`** Play the specified file. Optionally provide a time to start at in seconds. Allowed formats: 
    + `hh:mm:ss` (string)
    + `ssss` (number)
    + `ssss.dddd` (number)
- **`pause()`** Pause playback of the current file. 
- **`stop()`** Stop playback of the current file (calling `play()` will start the playback from the beginning.)

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
- **`say(options)`** Speak the phrase with additional options in an array. 
  ```
  Options {
    phrase: "Hello Dave, you're looking well today", 
    ...
  }
  ```
- **`stop()`** Stop playback.


#### Options

Options may be any of [options supported by `espeak`](espeak.md). For example, if I wanted to set the amplitude and pitch: 

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
