exports['av.Speaker'] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.spawn = this.sandbox.stub(cp, 'spawn', () => {
      this.emitter = new Emitter();
      this.emitter.kill = this.sandbox.stub();
      this.emitter.stderr = new Emitter();
      return this.emitter;
    });
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

  fileArgGetsAPlayerInstance: function(test) {
    test.expect(1);
    test.equal((new av.Speaker('foo.mp3')) instanceof Player, true);
    test.done();
  },

  emitter: function(test) {
    test.expect(1);
    test.equal((new av.Speaker()) instanceof Emitter, true);
    test.done();
  },

  currentTime: function(test) {
    test.expect(1);
    var speaker = new av.Speaker();
    test.equal(speaker.currentTime, 0);
    test.done();
  },

  sayNothing: function(test) {
    test.expect(2);
    var speaker = new av.Speaker();
    speaker.say();

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayNull: function(test) {
    test.expect(2);
    var speaker = new av.Speaker();
    speaker.say(null);

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayUndefined: function(test) {
    test.expect(2);
    var speaker = new av.Speaker();
    speaker.say(undefined);

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayEmpty: function(test) {
    test.expect(2);
    var speaker = new av.Speaker();
    speaker.say('');

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayZero: function(test) {
    test.expect(4);
    var speaker = new av.Speaker();
    speaker.say(0);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], ['0']);
    test.done();
  },

  sayString: function(test) {
    test.expect(4);
    var speaker = new av.Speaker();
    speaker.say('hello');

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], ['hello']);
    test.done();
  },

  sayManyWords: function(test) {
    test.expect(4);
    var speaker = new av.Speaker();
    var message = `Hello Dave, you're looking well today`;
    speaker.say(message);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], [message]);
    test.done();
  },

  sayFromArrayA: function(test) {
    test.expect(4);
    var speaker = new av.Speaker();
    var a = ['foo', '-a', 10, '-p', 50];

    speaker.say(a);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.firstCall.args[0], 'espeak');
    test.deepEqual(this.spawn.firstCall.args[1], a);

    test.done();
  },

  sayFromArrayB: function(test) {
    test.expect(4);
    var speaker = new av.Speaker();
    var b = ['-a', 10, '-p', 50, 'foo'];

    speaker.say(b);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], b);

    test.done();
  },

  sayFromObject: function(test) {
    test.expect(4);
    var speaker = new av.Speaker();
    var args = ['foo', '-a', 10, '-p', 50];
    speaker.say(args);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], args);
    test.done();
  },

  sayQueues: function(test) {
    test.expect(1);

    var speaker = new av.Speaker();
    var a = ['foo', '-a', 10, '-p', 50];
    var b = ['-a', 10, '-p', 50, 'foo'];

    speaker.say(a);
    speaker.say(b);


    this.emitter.emit('exit', 0, null);
    this.emitter.emit('exit', 0, null);

    test.equal(this.spawn.callCount, 2);

    test.done();
  },

  emptyQueueEmitsEmpty: function(test) {
    test.expect(2);
    var ended = this.sandbox.spy();
    var empty = this.sandbox.spy();

    var speaker = new av.Speaker();
    var a = ['foo', '-a', 10, '-p', 50];
    var b = ['-a', 10, '-p', 50, 'foo'];
    var c = ['-p', 50, '-a', 10, 'foo'];

    speaker.say(a);
    speaker.say(b);
    speaker.say(c);

    speaker.on('ended', ended);
    speaker.on('empty', empty);


    this.emitter.emit('exit', 0, null); // a is done
    this.emitter.emit('exit', 0, null); // b is done
    this.emitter.emit('exit', 0, null); // c is done

    test.equal(ended.callCount, 3);
    test.equal(empty.callCount, 1);

    test.done();
  },

  sayEvent: function(test) {
    test.expect(1);
    var speaker = new av.Speaker();
    speaker.on('say', () => {
      test.ok(true);
      test.done();
    });
    speaker.say('Hi!');
  },

  timeupdate: function(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('timeupdate', test.done);
    this.clock.tick(101);
  },

  ended: function(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('ended', test.done);

    this.emitter.emit('exit', 0, null);
  },

  stop: function(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    var speaker = new av.Speaker();
    speaker.say('Hi!');
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
    var speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
  },
};
