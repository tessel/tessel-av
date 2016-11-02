const av = require("tessel-av");
const mic = new av.Microphone();

/*
  1. Plug in the USB audio adapter to the Tessel 2
  2. Plug in speakers to the USB audio adapter's speaker jack
  3. Plug in a microphone to the USB audio adapter's microphone jack
  4. Deploy with `t2 run microphone.js`

  Speaking into the microphone should immediately
  be heard through the connected speakers.
*/


// Initialize the microphone input
mic.listen();

// This will automattically pipe the microphone
// input to an available speaker output.
mic.monitor();

/*
listen.on("data", buffer => console.log(`buffer: ${buffer.length}`));
*/

