require('../common/bootstrap');

exports['av.Microphone'] = {
  setUp(done) {
    this.emitter = new Emitter();
    this.spawn = sandbox.stub(cp, 'spawn').callsFake(() => {
      this.emitter = new Emitter();
      this.emitter.kill = sandbox.stub();
      this.emitter.stderr = new Emitter();
      this.emitter.stdout = new Emitter();
      return this.emitter;
    });

    this.write = sandbox.stub(Writable.prototype, 'write');
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
    test.equal(typeof av.Microphone, 'function');
    test.done();
  },

  emitter(test) {
    test.expect(1);
    test.equal((new av.Microphone()) instanceof Emitter, true);
    test.done();
  },

  deviceDefault(test) {
    test.expect(3);
    new av.Microphone();

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device.aplay, 'plughw:0,0');
    test.equal(this.wmSet.lastCall.args[1].device.arecord, 'plughw:0,0');
    test.done();
  },

  deviceDetected(test) {
    test.expect(3);

    this.execSync.restore();
    this.execSync = sandbox.stub(cp, 'execSync').callsFake(() => new Buffer(aplayListDevices.replace('card 0:', 'card 1:')));

    new av.Microphone();

    test.equal(this.execSync.callCount, 1);
    test.equal(this.wmSet.lastCall.args[1].device.aplay, 'plughw:1,0');
    test.equal(this.wmSet.lastCall.args[1].device.arecord, 'plughw:1,0');
    test.done();
  },

  listening(test) {
    test.expect(1);

    const buffer = new Buffer([0]);
    const mic = new av.Microphone();

    const listen = mic.listen();

    test.equal(mic.isListening, true);
    test.done();
  },

  listenReturnsActiveCaptureStream(test) {
    test.expect(2);

    const buffer = new Buffer([0]);
    const mic = new av.Microphone();

    const listen = mic.listen();

    test.equal(mic.isListening, true);
    test.equal(mic.listen(), listen);
    test.done();
  },

  listenToEmitter(test) {
    test.expect(5);

    const buffer = new Buffer([0]);
    const mic = new av.Microphone();

    test.equal(typeof mic.listen, 'function');

    const listen = mic.listen();

    test.equal(listen instanceof CaptureStream, true);
    test.equal(listen instanceof Readable, true);

    listen.on('data', data => {
      test.equal(buffer.equals(data), true);
      test.ok(true);
      test.done();
    });
    this.emitter.stdout.emit('data', buffer);
  },

  listenToPipe(test) {
    test.expect(1);

    const buffer = new Buffer([0]);
    const mic = new av.Microphone();
    const writable = new Writable();

    writable._write = () => {};

    writable.on('pipe', () => {
      test.ok(true);
      test.done();
    });

    mic.listen().pipe(writable);

    this.emitter.stdout.emit('data', buffer);
    this.emitter.emit('close');
  },

  listenSpawnToPipeDefault(test) {
    test.expect(3);

    const mic = new av.Microphone();

    mic.listen();

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'arecord');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-f', 'cd', '-r', '48000'
    ]);

    test.done();
  },

  listenSpawnToPipeWithArgs(test) {
    test.expect(3);

    const mic = new av.Microphone();

    mic.listen(['foo', 'bar']);

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'arecord');
    test.deepEqual(this.spawn.lastCall.args[1], ['foo', 'bar']);
    test.done();
  },

  listenOptions(test) {
    test.expect(3);

    const mic = new av.Microphone();

    mic.listen({
      '-c': 1,
      '-f': 'cd',
    });

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'arecord');
    test.deepEqual(this.spawn.lastCall.args[1], ['-c', 1, '-f', 'cd']);
    test.done();
  },

  listenOptionsOneCharacter(test) {
    test.expect(3);

    const mic = new av.Microphone();

    mic.listen({
      c: 1,
      f: 'cd',
    });

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'arecord');
    test.deepEqual(this.spawn.lastCall.args[1], ['-c', 1, '-f', 'cd']);
    test.done();
  },

  monitorWithoutCaptureStream(test) {
    test.expect(5);

    const mic = new av.Microphone();
    const state = this.wmSet.lastCall.args[1];

    state.cs = {
      pipe: sandbox.stub(),
    };

    mic.listen({
      c: 1,
      f: 'cd',
    });

    mic.monitor();

    test.equal(this.spawn.callCount, 2);
    test.equal(this.spawn.lastCall.args[0], 'aplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['-f', 'cd']);
    test.equal(state.cs.pipe.callCount, 1);
    test.equal(state.cs.pipe.lastCall.args[0], state.process.aplay.stdin);
    test.done();
  },

  monitorWithCaptureStream(test) {
    test.expect(5);

    const mic = new av.Microphone();
    const state = this.wmSet.lastCall.args[1];

    state.cs = {
      pipe: sandbox.stub(),
    };

    mic.listen({
      c: 1,
      f: 'cd',
    });

    mic.monitor(state.cs);

    test.equal(this.spawn.callCount, 2);
    test.equal(this.spawn.lastCall.args[0], 'aplay');
    test.deepEqual(this.spawn.lastCall.args[1], ['-f', 'cd']);
    test.equal(state.cs.pipe.callCount, 1);
    test.equal(state.cs.pipe.lastCall.args[0], state.process.aplay.stdin);
    test.done();
  },

  stop(test) {
    test.expect(4);
    this.clock = sandbox.useFakeTimers();
    const mic = new av.Microphone();
    mic.listen();
    test.equal(mic.isListening, true);
    mic.on('stop', () => {
      test.equal(mic.isListening, false);
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    mic.stop();
  },

  stopListenAndMonitor(test) {
    test.expect(4);
    this.clock = sandbox.useFakeTimers();
    const mic = new av.Microphone();
    const state = this.wmSet.lastCall.args[1];

    state.cs = {
      pipe: sandbox.stub(),
    };

    mic.listen();
    mic.monitor();
    test.equal(mic.isListening, true);
    mic.on('stop', () => {
      test.equal(mic.isListening, false);
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    mic.stop();
  },

  stopIsNotSpeaking(test) {
    test.expect(1);
    this.clock = sandbox.useFakeTimers();
    const mic = new av.Microphone();

    sandbox.spy(mic, 'emit');

    mic.stop();
    test.equal(mic.emit.callCount, 0);
    test.done();
  },

  stopTwice(test) {
    test.expect(2);
    this.clock = sandbox.useFakeTimers();
    const mic = new av.Microphone();
    mic.listen();
    mic.on('stop', () => {
      test.equal(this.emitter.kill.callCount, 1);
      test.equal(this.emitter.kill.lastCall.args[0], 'SIGTERM');
      test.done();
    });
    mic.stop();
    mic.stop();
  },
};
