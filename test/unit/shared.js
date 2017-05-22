'use strict';

require('../common/bootstrap');

exports['shared.killAndCatch'] = {
  setUp(done) {
    done();
  },

  tearDown(done) {
    sandbox.restore();
    done();
  },

  killAndCatch(test) {
    test.expect(14);

    // These are testing from a sandbox created BEFORE
    // "shared.js" is required by any of the component classes
    test.equal(shared.killAndCatch.callCount, 6);
    test.equal(shared.killAndCatch.getCall(0).args[0], 'mjpg_streamer');
    test.equal(shared.killAndCatch.getCall(1).args[0], 'aplay');
    test.equal(shared.killAndCatch.getCall(2).args[0], 'arecord');
    test.equal(shared.killAndCatch.getCall(3).args[0], 'madplay');
    test.equal(shared.killAndCatch.getCall(4).args[0], 'espeak');
    test.equal(shared.killAndCatch.getCall(5).args[0], 'aplay');

    test.equal(cp.spawnSync.callCount, 6);
    test.equal(cp.spawnSync.getCall(0).args[0], 'kill -9 $(pgrep "mjpg_streamer")');
    test.equal(cp.spawnSync.getCall(1).args[0], 'kill -9 $(pgrep "aplay")');
    test.equal(cp.spawnSync.getCall(2).args[0], 'kill -9 $(pgrep "arecord")');
    test.equal(cp.spawnSync.getCall(3).args[0], 'kill -9 $(pgrep "madplay")');
    test.equal(cp.spawnSync.getCall(4).args[0], 'kill -9 $(pgrep "espeak")');
    test.equal(cp.spawnSync.getCall(5).args[0], 'kill -9 $(pgrep "aplay")');

    test.done();
  },
};

exports['shared.install'] = {
  setUp(done) {
    sandbox.spy(shared, 'install');

    this.status = {
      which: 0,
      opkgUpdate: 0,
      opkgInstall: 0,
    };
    sandbox.stub(cp, 'spawnSync').callsFake((binary, args) => {
      if (binary === 'which') {
        return {
          status: this.status.which,
        };
      }
      if (binary === 'opkg') {
        if (args[0] === 'update') {
          return {
            status: this.status.opkgUpdate,
          };
        }
        if (args[0] === 'install') {
          return {
            status: this.status.opkgInstall,
          };
        }
      }
    });
    sandbox.stub(cp, 'execSync');

    global.IS_TEST_ENV = false;
    this.arch = process.arch;

    Object.defineProperty(process, 'arch', {
      value: 'mipsel',
    });
    done();
  },

  tearDown(done) {
    sandbox.restore();
    global.IS_TEST_ENV = true;
    Object.defineProperty(process, 'arch', {
      value: this.arch,
    });
    done();
  },

  attemptToInstallExisting(test) {
    test.expect(1);

    shared.install('aplay');

    // No calls to spawnSync occur
    test.equal(cp.spawnSync.callCount, 0);
    test.done();
  },

  attemptToReinstall(test) {
    test.expect(2);

    process.env.AV_INSTALLED_BOGUS = true;
    shared.install('bogus');

    // No calls to spawnSync occur
    test.equal(cp.spawnSync.callCount, 0);
    test.equal(cp.execSync.callCount, 0);
    test.done();
  },

  attemptToInstallMissingButWhichSaysOtherwise(test) {
    test.expect(2);

    shared.install('missing');
    test.equal(cp.spawnSync.callCount, 1);
    test.equal(cp.execSync.callCount, 0);

    test.done();
  },

  attemptToInstallMissing(test) {
    test.expect(8);

    sandbox.stub(console, 'log');

    this.status.which = 1;

    shared.install('success');
    test.equal(console.log.callCount, 2);
    test.equal(console.log.firstCall.args[0], 'Install: "success"');
    test.equal(console.log.lastCall.args[0], 'Completed.');

    test.equal(cp.spawnSync.callCount, 3);

    console.log.restore();

    test.deepEqual(cp.spawnSync.getCall(0).args, ['which', ['success']]);
    test.deepEqual(cp.spawnSync.getCall(1).args, ['opkg', ['update']]);
    test.deepEqual(cp.spawnSync.getCall(2).args, ['opkg', ['install', 'success']]);

    test.equal(cp.execSync.callCount, 1);

    test.done();
  },

  attemptToInstallMissingFails(test) {
    test.expect(8);

    sandbox.stub(console, 'log');

    this.status.which = 1;
    this.status.opkgInstall = 1;

    shared.install('failure');
    test.equal(console.log.callCount, 2);
    test.equal(console.log.firstCall.args[0], 'Install: "failure"');
    test.equal(console.log.lastCall.args[0], 'Error: install "failure" failed.');

    test.equal(cp.spawnSync.callCount, 3);

    console.log.restore();

    test.deepEqual(cp.spawnSync.getCall(0).args, ['which', ['failure']]);
    test.deepEqual(cp.spawnSync.getCall(1).args, ['opkg', ['update']]);
    test.deepEqual(cp.spawnSync.getCall(2).args, ['opkg', ['install', 'failure']]);

    test.equal(cp.execSync.callCount, 0);
    test.done();
  },
};


//
// This set of test fixtures was originally written for Popcorn.js
// https://github.com/mozilla/popcorn-js/blob/master/test/popcorn.unit.js
//
const timePeriods = [{
    start: '01.234',
    end: '4.003',
    correctStartTime: 1.234,
    correctEndTime: 4.003
  },
  {
    start: 5.333,
    end: 6,
    correctStartTime: 5.333,
    correctEndTime: 6.000
  },
  {
    start: 6.004,
    end: '6.78',
    correctStartTime: 6.004,
    correctEndTime: 6.780
  },
  {
    start: '8.090',
    end: 9.11111111,
    correctStartTime: 8.090,
    correctEndTime: 9.11111111
  },
  {
    start: '10;4',
    end: '10;17',
    correctStartTime: 10.1666,
    correctEndTime: 10.7083
  },
  {
    start: '12;1',
    end: '13;2',
    correctStartTime: 12.0416,
    correctEndTime: 13.0833
  },
  {
    start: '20;11',
    end: '23;17',
    correctStartTime: 20.4583,
    correctEndTime: 23.7083
  },
  {
    start: '27;7',
    end: '27;22',
    correctStartTime: 27.2916,
    correctEndTime: 27.9166
  },
  {
    start: '12:04;12',
    end: '22:59;23',
    correctStartTime: 724.5,
    correctEndTime: 1379.9583
  },
  {
    start: '1:48:27;9',
    end: '3:23:15;1',
    correctStartTime: 6507.375,
    correctEndTime: 12195.0416
  },
  {
    start: '12:56;7',
    end: '2:02:42;8',
    correctStartTime: 776.2916,
    correctEndTime: 7362.3333
  },
];

//
// `equivalentTimes` was originally written for Popcorn.js
// https://github.com/mozilla/popcorn-js/blob/master/test/popcorn.unit.js
//
function equivalent(testedTime, correctTime) {
  const tolerance = 0.0001;
  return (testedTime < (correctTime + tolerance)) &&
    (testedTime > (correctTime - tolerance));
}

exports['shared.toSeconds'] = {
  setUp(done) {
    done();
  },

  tearDown(done) {
    sandbox.restore();
    done();
  },

  toSecondsWithFramerate(test) {
    test.expect(22);

    const framerate = 24;

    timePeriods.forEach(group => {
      const start = shared.toSeconds(group.start, framerate);
      const end = shared.toSeconds(group.end, framerate);
      const correctStartTime = group.correctStartTime;
      const correctEndTime = group.correctEndTime;


      test.ok(
        equivalent(start, correctStartTime), `${start} is equivalent to ${correctStartTime}`
      );
      test.ok(
        equivalent(end, correctEndTime), `${end} is equivalent to ${correctEndTime}`);
    });

    test.done();
  },

  toSecondsWithoutFramerate(test) {
    test.expect(22);

    const framerate = 24;

    timePeriods.forEach(group => {
      const start = shared.toSeconds(group.start);
      const end = shared.toSeconds(group.end);
      const correctStartTime = String(group.start).includes(';') ?
        parseInt(group.correctStartTime) :
        parseFloat(group.correctStartTime);
      const correctEndTime = String(group.end).includes(';') ?
        parseInt(group.correctEndTime) :
        parseFloat(group.correctEndTime);

      test.ok(
        equivalent(start, correctStartTime), `${start} is equivalent to ${correctStartTime}`
      );
      test.ok(
        equivalent(end, correctEndTime), `${end} is equivalent to ${correctEndTime}`);
    });

    test.done();
  },
};
