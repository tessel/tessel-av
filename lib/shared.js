'use strict';

// System Objects
const cp = require('child_process');

// Program specific
const profile = '/etc/profile';
const installed = {
  aplay: true,
  arecord: true,
  espeak: false,
  fswebcam: true,
  ffmpeg: true,
  madplay: false,
  'mjpg-streamer': false,
};

module.exports = {

  killAndCatch(binary) {
    try {
      cp.spawnSync(`kill -9 $(pgrep "${binary}")`);
    } catch (error) {}
  },

  // toSeconds was adapted from Popcorn.js
  // https://github.com/mozilla/popcorn-js/blob/master/popcorn.js#L2598-L2648
  toSeconds(time, framerate) {
    if (typeof time === 'number') {
      return time;
    }

    const pairs = time.split(':');
    const lastIndex = pairs.length - 1;
    const last = pairs[lastIndex];

    if (last.includes(';')) {
      let frameInfo = last.split(';');
      let frameTime = 0;

      if (framerate && typeof framerate === 'number') {
        frameTime = parseFloat(frameInfo[1], 10) / framerate;
      }

      pairs[lastIndex] = parseInt(frameInfo[0], 10) + frameTime;
    }

    const first = pairs[0];

    return {
      1: parseFloat(first, 10),
      2: (parseInt(first, 10) * 60) + parseFloat(pairs[1], 10),
      3: (parseInt(first, 10) * 3600) + (parseInt(pairs[1], 10) * 60) + parseFloat(pairs[2], 10)
    }[pairs.length];
  },

  /*
    All of the operations in the install function are synchronous
    because without them, the environment cannot support
    the features provided by tessel-av and it's best
    to get it done and out of the way before proceeding
    with the program's exection.

    Generally speaking, the detection and installation
    path will never be taken, as it serves to provide a
    fallback, not a primary execution path.


    Average execution times

    | Avg Exec Time    | Operation                                                    |
    | ---------------- | ------------------------------------------------------------ |
    | 50ms             | cp.spawnSync('which', [binary])                              |
    | 601ms            | cp.spawnSync('opkg', ['update'])                             |
    | 24s !!!!!!!!!!!! | cp.spawnSync('opkg', ['install', binary])                    |

   */


  // TODO: this can only work if the Tessel is connected to the network...
  // const os = require('os');
  // const wlan0 = os.os.networkInterfaces().wlan0[0];


  install(binary) {
    const env = `AV_INSTALLED_${binary.toUpperCase()}`;

    /* istanbul ignore else */
    if (global.IS_TEST_ENV || process.arch !== 'mipsel') {
      return true;
    }
    // If this binary is known to be published in the
    // openwrt build, DO NOT PROCEED.
    if (installed[binary]) {
      return true;
    }
    // If this binary has already been installed via
    // tessel-av installation operations, DO NOT PROCEED.
    if (process.env[env]) {
      return true;
    }

    const which = cp.spawnSync('which', [binary]);
    let install;

    // According to `which`, this binary does not exist
    if (which.status === 1) {
      // opkg update will return with a status = 1,
      // but that's just because it might fail to wget a package list,
      // which is not fatal.
      cp.spawnSync('opkg', ['update']);

      console.log(`Install: "${binary}"`);

      install = cp.spawnSync('opkg', ['install', binary]);

      if (install.status === 0) {
        console.log('Completed.');

        cp.execSync(`echo 'export ${env}=1' >> ${profile}; source ${profile}`);
        installed[binary] = true;
      } else {
        console.log(`Error: install "${binary}" failed.`);
      }
    }
  },
};
