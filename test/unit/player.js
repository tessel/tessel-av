'use strict';

require('../common/bootstrap');

exports['av.Player'] = {
  setUp(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.emitter.kill = this.sandbox.stub();
    this.emitter.stderr = new Emitter();
    this.spawn = this.sandbox.stub(cp, 'spawn').callsFake(() => this.emitter);
    this.execSync = this.sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices));
    done();
  },

  tearDown(done) {
    this.sandbox.restore();
    done();
  },

  basic(test) {
    test.expect(1);
    test.equal(typeof av.Player, 'function');
    test.done();
  },

  emitter(test) {
    test.expect(1);
    test.equal((new av.Player('foo.mp3')) instanceof Emitter, true);
    test.done();
  },

  deviceDefault(test) {
    test.expect(2);

    this.wmSet = this.sandbox.spy(WeakMap.prototype, 'set');
    this.execSync.restore();
    this.execSync = this.sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices.replace('card 1:', 'card 0:')));

    new av.Player('foo.mp3');

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device, '/dev/dsp');
    test.done();
  },

  deviceDetected(test) {
    test.expect(2);
    this.wmSet = this.sandbox.spy(WeakMap.prototype, 'set');

    new av.Player('foo.mp3');

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device, '/dev/dsp1');
    test.done();
  },

  unsupportedExtention(test) {
    test.expect(7);
    test.throws(() => new av.Player('foo.wav'));
    test.throws(() => new av.Player('foo.m4a'));
    test.throws(() => new av.Player('foo.mov'));
    test.throws(() => new av.Player('foo.ogg'));
    test.throws(() => new av.Player('foo.opus'));
    test.throws(() => new av.Player('foo'));
    test.throws(() => new av.Player(''));
    test.done();
  },

  currentTime(test) {
    test.expect(1);
    const player = new av.Player('foo.mp3');
    test.equal(player.currentTime, 0);
    test.done();
  },

  play(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play();

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playAlreadyActive(test) {
    test.expect(1);
    const player = new av.Player('foo.mp3');
    player.play();

    test.equal(player.play(), player);
    test.done();
  },

  playError(test) {
    test.expect(2);

    const consoleerror = this.sandbox.stub(console, 'error');
    const player = new av.Player('foo.mp3');

    player.play();

    const error = `MPEG Audio Decoder X.X.X (beta) - Copyright © 2000-2004 Robert Leslie et al.
                  foo.mp3: No such file or directory`;

    this.emitter.stderr.emit('data', new Buffer(error));
    this.emitter.emit('exit', 4);

    test.equal(consoleerror.callCount, 1);
    test.equal(consoleerror.lastCall.args[0], 'foo.mp3: No such file or directory');
    test.done();
  },

  playPausePlay(test) {
    test.expect(5);
    this.clock = this.sandbox.useFakeTimers();
    const player = new av.Player('foo.mp3');

    player.play();

    this.clock.tick(1100);

    player.pause();

    this.clock.tick(1);

    player.play();

    test.equal(this.spawn.callCount, 2);
    test.equal(this.spawn.firstCall.args[0], 'madplay');
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.firstCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1, '-o', '/dev/dsp1']);
    test.done();
  },

  playEvent(test) {
    test.expect(1);
    const player = new av.Player('foo.mp3');
    player.on('play', () => {
      test.ok(true);
      test.done();
    });
    player.play();
  },

  timeupdate(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    const player = new av.Player('foo.mp3');
    player.play();
    player.on('timeupdate', test.done);
    this.clock.tick(101);
  },

  ended(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    const player = new av.Player('foo.mp3');
    player.play();
    player.on('ended', test.done);
    this.spawn.lastCall.returnValue.emit('exit', 0, null);
  },

  stop(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    const player = new av.Player('foo.mp3');
    player.play();
    player.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    player.stop();
  },

  stopTwice(test) {
    test.expect(1);
    const player = new av.Player('foo.mp3');
    player.play();
    player.stop();
    test.equal(player.stop(), player);
    test.done();
  },

  pause(test) {
    test.expect(4);
    this.clock = this.sandbox.useFakeTimers();
    const player = new av.Player('foo.mp3');
    player.play();
    test.equal(player.isPlaying, true);

    player.on('pause', () => {
      test.equal(player.isPlaying, false);
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    player.pause();
  },

  pauseTwice(test) {
    test.expect(3);
    this.clock = this.sandbox.useFakeTimers();
    const player = new av.Player('foo.mp3');
    player.play();
    player.pause();

    test.equal(this.emitter.kill.callCount, 1);
    test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');

    player.pause();
    test.equal(this.emitter.kill.callCount, 1);
    test.done();
  },

  playMp3ImpliedAll(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play();

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ImpliedStartAtZero(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtZero(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', 0);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtZeroString(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', '0');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtOne(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', 1);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtOneString(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', '1');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeTenMinutes(test) {
    test.expect(4);
    const player = new av.Player();
    // hh:mm:ss
    player.play('foo.mp3', '00:10:00');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 600, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeTenSeconds(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', '00:00:10');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10, '-o', '/dev/dsp1']);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeSecondsDs(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', '10.250');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10.25, '-o', '/dev/dsp1']);
    test.done();
  },


  playImpliedStartAtZero(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play();

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playExplicitStartAtZero(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play(0);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playExplicitStartAtZeroString(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play('0');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.done();
  },

  playExplicitStartAtOne(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play(1);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1, '-o', '/dev/dsp1']);
    test.done();
  },

  playExplicitStartAtOneString(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play('1');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1, '-o', '/dev/dsp1']);
    test.done();
  },

  playExplicitStartAtTimeCodeTenMinutes(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    // hh:mm:'foo.mp3'ss
    player.play('00:10:00');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 600, '-o', '/dev/dsp1']);
    test.done();
  },

  playExplicitStartAtTimeCodeTenSeconds(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play('00:00:10');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10, '-o', '/dev/dsp1']);
    test.done();
  },

  playAtTimeCodeSecondsDs(test) {
    test.expect(4);
    const player = new av.Player('foo.mp3');
    player.play('10.250');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10.25, '-o', '/dev/dsp1']);
    test.done();
  },

  playDifferentMp3(test) {
    test.expect(5);
    const player = new av.Player('foo.mp3');
    player.play('bar.mp3');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['bar.mp3', '-s', 0, '-o', '/dev/dsp1']);
    test.equal(player.file, 'bar.mp3');
    test.done();
  },

  playFromArray(test) {
    test.expect(4);
    const player = new av.Player();
    const args = ['foo.mp3', '-a', 10, '-p', 2, '-o', '/dev/dsp1'];

    player.play(args);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.firstCall.args[0], 'madplay');
    test.deepEqual(this.spawn.firstCall.args[1], args);

    test.done();
  },

  playOptions(test) {
    test.expect(4);
    const player = new av.Player();
    const args = {
      file: 'foo.mp3',
      '-a': 10,
      '-r': 2,
    };
    player.play(args);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-a', 10, '-r', 2, '-o', '/dev/dsp1']);
    test.done();
  },

  playOptionsOneCharacter(test) {
    test.expect(4);
    const player = new av.Player();
    const args = {
      file: 'foo.mp3',
      a: 10,
      r: 2,
    };
    player.play(args);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-a', 10, '-r', 2, '-o', '/dev/dsp1']);
    test.done();
  },

  playOptionsNoFile(test) {
    test.expect(2);
    const player = new av.Player();
    const args = {
      a: 10,
      r: 2,
    };
    player.play(args);

    test.equal(player.isPlaying, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  playFileAtTime(test) {
    test.expect(4);
    const player = new av.Player();
    player.play('foo.mp3', '00:00:10');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10, '-o', '/dev/dsp1']);
    test.done();
  },

  playFileAtBogusTime(test) {
    test.expect(1);
    const player = new av.Player();

    test.throws(() => player.play('foo.mp3', 'bogus'));
    test.done();
  },
  // To Do: more detailed tests for pause time updates
};
