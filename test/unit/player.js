exports['av.Player'] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.emitter.kill = this.sandbox.stub();
    this.emitter.stderr = new Emitter();
    this.spawn = this.sandbox.stub(cp, 'spawn', () => this.emitter);
    done();
  },

  tearDown: function(done) {
    this.sandbox.restore();
    done();
  },

  basic: function(test) {
    test.expect(1);
    test.equal(typeof av.Player, 'function');
    test.done();
  },

  emitter: function(test) {
    test.expect(1);
    test.equal((new av.Player('foo.mp3')) instanceof Emitter, true);
    test.done();
  },

  unsupportedExtention: function(test) {
    test.expect(5);
    test.throws(() => {
      new av.Player('foo.wav');
    });
    test.throws(() => {
      new av.Player('foo.m4a');
    });
    test.throws(() => {
      new av.Player('foo.mov');
    });
    test.throws(() => {
      new av.Player('foo.ogg');
    });
    test.throws(() => {
      new av.Player('foo.opus');
    });
    test.done();
  },

  currentTime: function(test) {
    test.expect(1);
    var player = new av.Player('foo.mp3');
    test.equal(player.currentTime, 0);
    test.done();
  },

  play: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play();

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playError: function(test) {
    test.expect(2);

    var consoleerror = this.sandbox.stub(console, 'error');
    var player = new av.Player('foo.mp3');

    player.play();

    var error = `MPEG Audio Decoder X.X.X (beta) - Copyright © 2000-2004 Robert Leslie et al.
                  foo.mp3: No such file or directory`;

    this.emitter.stderr.emit('data', new Buffer(error));
    this.emitter.emit('exit', 4);

    test.equal(consoleerror.callCount, 1);
    test.equal(consoleerror.lastCall.args[0], 'foo.mp3: No such file or directory');
    test.done();
  },

  playPausePlay: function(test) {
    test.expect(5);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');

    player.play();

    this.clock.tick(1100);

    player.pause();

    this.clock.tick(1);

    player.play();

    test.equal(this.spawn.callCount, 2);
    test.equal(this.spawn.firstCall.args[0], 'madplay');
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.firstCall.args[1], ['foo.mp3', '-s', 0]);
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1]);
    test.done();
  },

  playEvent: function(test) {
    test.expect(1);
    var player = new av.Player('foo.mp3');
    player.on('play', () => {
      test.ok(true);
      test.done();
    });
    player.play();
  },

  timeupdate: function(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');
    player.play();
    player.on('timeupdate', test.done);
    this.clock.tick(101);
  },

  ended: function(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');
    player.play();
    player.on('ended', test.done);
    this.spawn.lastCall.returnValue.emit('exit', 0, null);
  },

  stop: function(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');
    player.play();
    player.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    player.stop();
  },

  stopTwice: function(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');
    player.play();
    player.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    player.stop();
  },

  pause: function(test) {
    test.expect(4);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');
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

  pauseTwice: function(test) {
    test.expect(3);
    this.clock = this.sandbox.useFakeTimers();
    var player = new av.Player('foo.mp3');
    player.play();
    player.pause();

    test.equal(this.emitter.kill.callCount, 1);
    test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');

    player.pause();
    test.equal(this.emitter.kill.callCount, 1);
    test.done();
  },

  playMp3ImpliedStartAtZero: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playMp3ExplicitStartAtZero: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3', 0);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playMp3ExplicitStartAtZeroString: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3', '0');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playMp3ExplicitStartAtOne: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3', 1);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1]);
    test.done();
  },

  playMp3ExplicitStartAtOneString: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3', '1');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1]);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeTenMinutes: function(test) {
    test.expect(4);
    var player = new av.Player();
    // hh:mm:ss
    player.play('foo.mp3', '00:10:00');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 600]);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeTenSeconds: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3', '00:00:10');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10]);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeSecondsDs: function(test) {
    test.expect(4);
    var player = new av.Player();
    player.play('foo.mp3', '10.250');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10.25]);
    test.done();
  },


  playMp3ImpliedStartAtZero: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play();

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playMp3ExplicitStartAtZero: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play(0);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playMp3ExplicitStartAtZeroString: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play('0');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playMp3ExplicitStartAtOne: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play(1);

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1]);
    test.done();
  },

  playMp3ExplicitStartAtOneString: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play('1');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 1]);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeTenMinutes: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    // hh:mm:'foo.mp3'ss
    player.play('00:10:00');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 600]);
    test.done();
  },

  playMp3ExplicitStartAtTimeCodeTenSeconds: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play('00:00:10');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10]);
    test.done();
  },

  playAtTimeCodeSecondsDs: function(test) {
    test.expect(4);
    var player = new av.Player('foo.mp3');
    player.play('10.250');

    test.equal(player.isPlaying, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 10.25]);
    test.done();
  },

  // To Do: more detailed tests for pause time updates
};
