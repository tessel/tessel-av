exports['av.Speaker'] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.emitter.kill = this.sandbox.stub();
    this.spawn = this.sandbox.stub(cp, 'spawn', () => this.emitter);
    done();
  },

  tearDown: function(done) {
    this.sandbox.restore();
    done();
  },

  basic: function(test) {
    test.expect(1);
    test.equal(typeof av.Speaker, 'function');
    test.done();
  },

  emitter: function(test) {
    test.expect(1);
    test.equal((new av.Speaker('foo.mp3')) instanceof Emitter, true);
    test.done();
  },

  unsupportedExtention: function(test) {
    test.expect(6);
    test.throws(() => {
      new av.Speaker();
    });
    test.throws(() => {
      new av.Speaker('foo.wav');
    });
    test.throws(() => {
      new av.Speaker('foo.m4a');
    });
    test.throws(() => {
      new av.Speaker('foo.mov');
    });
    test.throws(() => {
      new av.Speaker('foo.ogg');
    });
    test.throws(() => {
      new av.Speaker('foo.opus');
    });
    test.done();
  },

  currentTime: function(test) {
    test.expect(1);
    var speaker = new av.Speaker('foo.mp3');
    test.equal(speaker.currentTime, 0);
    test.done();
  },

  play: function(test) {
    test.expect(3);
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'madplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo.mp3', '-s', 0]);
    test.done();
  },

  playEvent: function(test) {
    test.expect(1);
    var speaker = new av.Speaker('foo.mp3');
    speaker.on('play', () => {
      test.ok(true);
      test.done();
    });
    speaker.play();
  },

  timeupdate: function(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();
    speaker.on('timeupdate', test.done);
    this.clock.tick(101);
  },

  end: function(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();
    speaker.on('end', test.done);
    this.spawn.lastCall.returnValue.emit('exit', 0, null);
  },

  stop: function(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();
    speaker.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
  },

  stopTwice: function(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();
    speaker.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
  },

  pause: function(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();
    speaker.on('pause', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.pause();
  },

  pauseTwice: function(test) {
    test.expect(3);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker('foo.mp3');
    speaker.play();
    speaker.pause();

    test.equal(this.emitter.kill.callCount, 1);
    test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');

    speaker.pause();
    test.equal(this.emitter.kill.callCount, 1);
    test.done();
  },

  // To Do: more detailed tests for pause time updates
};
