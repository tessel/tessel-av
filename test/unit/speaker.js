require('../common/bootstrap');

exports['av.Speaker'] = {
  setUp(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.spawn = this.sandbox.stub(cp, 'spawn').callsFake(() => {
      this.emitter = new Emitter();
      this.emitter.kill = this.sandbox.stub();
      this.emitter.stderr = new Emitter();
      return this.emitter;
    });
    this.execSync = this.sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices));

    done();
  },

  tearDown(done) {
    this.sandbox.restore();
    done();
  },

  basic(test) {
    test.expect(1);
    test.equal(typeof av.Speaker, 'function');
    test.done();
  },

  mp3fileArgNoLongerSupported(test) {
    test.expect(1);
    test.throws(() => new av.Speaker('foo.mp3'));
    test.done();
  },

  emitter(test) {
    test.expect(1);
    test.equal((new av.Speaker()) instanceof Emitter, true);
    test.done();
  },

  currentTime(test) {
    test.expect(1);
    const speaker = new av.Speaker();
    test.equal(speaker.currentTime, 0);
    test.done();
  },

  sayNothing(test) {
    test.expect(2);
    const speaker = new av.Speaker();
    speaker.say();

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayNull(test) {
    test.expect(2);
    const speaker = new av.Speaker();
    speaker.say(null);

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayUndefined(test) {
    test.expect(2);
    const speaker = new av.Speaker();
    speaker.say(undefined);

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayEmpty(test) {
    test.expect(2);
    const speaker = new av.Speaker();
    speaker.say('');

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },

  sayZero(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    speaker.say(0);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], ['0', '-s', 130]);
    test.done();
  },

  sayString(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    speaker.say('hello');

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], ['hello', '-s', 130]);
    test.done();
  },

  sayManyWords(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    const message = `Hello Dave, you're looking well today`;
    speaker.say(message);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], [message, '-s', 130]);
    test.done();
  },

  sayFromArrayA(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    const a = ['foo', '-a', 10, '-p', 50];

    speaker.say(a);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.firstCall.args[0], 'espeak');
    test.deepEqual(this.spawn.firstCall.args[1], a);

    test.done();
  },

  sayFromArrayB(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    const b = ['-a', 10, '-p', 50, 'foo'];

    speaker.say(b);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], b);

    test.done();
  },

  sayFromObject(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    const args = {
      phrase: 'foo',
      '-a': 10,
      '-r': 2,
    };
    speaker.say(args);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo', '-a', 10, '-r', 2, '-s', 130]);
    test.done();
  },

  sayQueues(test) {
    test.expect(1);

    const speaker = new av.Speaker();
    const a = ['foo', '-a', 10, '-p', 50];
    const b = ['-a', 10, '-p', 50, 'foo'];

    speaker.say(a);
    speaker.say(b);


    this.emitter.emit('exit', 0, null);
    this.emitter.emit('exit', 0, null);

    test.equal(this.spawn.callCount, 2);

    test.done();
  },

  emptyQueueEmitsEmpty(test) {
    test.expect(2);
    const ended = this.sandbox.spy();
    const empty = this.sandbox.spy();

    const speaker = new av.Speaker();
    const a = ['foo', '-a', 10, '-p', 50];
    const b = ['-a', 10, '-p', 50, 'foo'];
    const c = ['-p', 50, '-a', 10, 'foo'];

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

  sayEvent(test) {
    test.expect(1);
    const speaker = new av.Speaker();
    speaker.on('say', () => {
      test.ok(true);
      test.done();
    });
    speaker.say('Hi!');
  },

  timeupdate(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('timeupdate', test.done);
    this.clock.tick(101);
  },

  ended(test) {
    test.expect(0);
    this.clock = this.sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('ended', test.done);

    this.emitter.emit('exit', 0, null);
  },

  stop(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
  },

  stopIsNotSpeaking(test) {
    test.expect(1);
    this.clock = this.sandbox.useFakeTimers();
    const speaker = new av.Speaker();

    this.sandbox.spy(speaker, 'emit');

    speaker.stop();
    test.equal(speaker.emit.callCount, 0);
    test.done();
  },

  stopTwice(test) {
    test.expect(2);
    this.clock = this.sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
    speaker.stop();
  },

  reasonableEspeakOptions(test) {
    test.expect(1);
    this.clock = this.sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');

    test.deepEqual(this.spawn.lastCall.args[1], ['Hi!', '-s', 130]);
    test.done();
  },

  sayOptions(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    const args = {
      phrase: 'Hi!',
      '-a': 10,
      '-p': 50,
    };
    speaker.say(args);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], [ 'Hi!', '-a', 10, '-p', 50, '-s', 130 ]);
    test.done();
  },

  sayOptionsOneCharacter(test) {
    test.expect(4);
    const speaker = new av.Speaker();
    const args = {
      phrase: 'Hi!',
      a: 10,
      p: 50,
    };
    speaker.say(args);

    test.equal(speaker.isSpeaking, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'espeak');
    test.deepEqual(this.spawn.lastCall.args[1], [ 'Hi!', '-a', 10, '-p', 50, '-s', 130 ]);
    test.done();
  },

  sayOptionsNoPhrase(test) {
    test.expect(2);
    const speaker = new av.Speaker();
    const args = {
      a: 10,
      p: 50,
    };
    speaker.say(args);

    test.equal(speaker.isSpeaking, false);
    test.equal(this.spawn.callCount, 0);
    test.done();
  },
};
