require('../common/bootstrap');

exports['av.Speaker'] = {
  setUp(done) {
    this.espeak = new Emitter();
    this.aplay = new Emitter();
    this.spawn = sandbox.stub(cp, 'spawn').callsFake((binary) => {
      if (binary === 'espeak') {
        this.espeak = new Emitter();
        this.espeak.kill = sandbox.stub();
        this.espeak.stderr = new Emitter();
        this.espeak.stdout = new Emitter();
        this.espeak.stdout.pipe = sandbox.stub();
        return this.espeak;
      } else {
        this.aplay = new Emitter();
        this.aplay.kill = sandbox.stub();
        this.aplay.stderr = new Emitter();
        this.aplay.stdout = new Emitter();
        this.aplay.stdin = new Emitter();
        return this.aplay;
      }
    });
    this.execSync = sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices));
    this.wmSet = sandbox.spy(WeakMap.prototype, 'set');
    done();
  },

  tearDown(done) {
    sandbox.restore();
    done();
  },

  basic(test) {
    test.expect(1);
    test.equal(typeof av.Speaker, 'function');
    test.done();
  },

  emitter(test) {
    test.expect(1);
    test.equal((new av.Speaker()) instanceof Emitter, true);
    test.done();
  },

  deviceDefault(test) {
    test.expect(2);
    new av.Speaker();

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device, 'plughw:0,0');
    test.done();
  },

  deviceDetected(test) {
    test.expect(2);

    this.execSync.restore();
    this.execSync = sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices.replace('card 0:', 'card 1:')));

    new av.Speaker();

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device, 'plughw:1,0');
    test.done();
  },

  deviceDefaultUsesDefault(test) {
    test.expect(3);

    const speaker = new av.Speaker();

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device, 'plughw:0,0');

    speaker.say('hello');

    test.equal(this.spawn.callCount, 1);
    test.done();
  },

  deviceDetectedUsesAplay(test) {
    test.expect(7);

    this.execSync.restore();
    this.execSync = sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices.replace('card 0:', 'card 1:')));

    const speaker = new av.Speaker();

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device, 'plughw:1,0');

    speaker.say('hello');

    test.equal(this.spawn.callCount, 2);
    test.deepEqual(this.spawn.firstCall.args, ['espeak', ['hello', '-s', 130, '--stdout']]);
    test.deepEqual(this.spawn.lastCall.args, ['aplay', ['-f', 'cd', '-D', 'plughw:1,0']]);


    speaker.stop();

    test.equal(this.espeak.kill.callCount, 1);
    test.equal(this.aplay.kill.callCount, 1);

    test.done();
  },

  mp3fileArgNoLongerSupported(test) {
    test.expect(1);
    test.throws(() => new av.Speaker('foo.mp3'));
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


    this.espeak.emit('exit', 0, null);
    this.espeak.emit('exit', 0, null);

    test.equal(this.spawn.callCount, 2);

    test.done();
  },

  emptyQueueEmitsEmpty(test) {
    test.expect(2);
    const ended = sandbox.spy();
    const empty = sandbox.spy();

    const speaker = new av.Speaker();
    const a = ['foo', '-a', 10, '-p', 50];
    const b = ['-a', 10, '-p', 50, 'foo'];
    const c = ['-p', 50, '-a', 10, 'foo'];

    speaker.say(a);
    speaker.say(b);
    speaker.say(c);

    speaker.on('ended', ended);
    speaker.on('empty', empty);


    this.espeak.emit('exit', 0, null); // a is done
    this.espeak.emit('exit', 0, null); // b is done
    this.espeak.emit('exit', 0, null); // c is done

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
    this.clock = sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('timeupdate', test.done);
    this.clock.tick(101);
  },

  ended(test) {
    test.expect(0);
    this.clock = sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('ended', test.done);

    this.espeak.emit('exit', 0, null);
  },

  stop(test) {
    test.expect(2);
    this.clock = sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('stop', () => {
      test.equal(this.espeak.kill.callCount, 1);
      test.equal(this.espeak.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
  },

  stopIsNotSpeaking(test) {
    test.expect(1);
    this.clock = sandbox.useFakeTimers();
    const speaker = new av.Speaker();

    sandbox.spy(speaker, 'emit');

    speaker.stop();
    test.equal(speaker.emit.callCount, 0);
    test.done();
  },

  stopTwice(test) {
    test.expect(2);
    this.clock = sandbox.useFakeTimers();
    const speaker = new av.Speaker();
    speaker.say('Hi!');
    speaker.on('stop', () => {
      test.equal(this.espeak.kill.callCount, 1);
      test.equal(this.espeak.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    speaker.stop();
    speaker.stop();
  },

  reasonableEspeakOptions(test) {
    test.expect(1);
    this.clock = sandbox.useFakeTimers();
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
    test.deepEqual(this.spawn.lastCall.args[1], ['Hi!', '-a', 10, '-p', 50, '-s', 130]);
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
    test.deepEqual(this.spawn.lastCall.args[1], ['Hi!', '-a', 10, '-p', 50, '-s', 130]);
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
