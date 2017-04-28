require('../common/bootstrap');

exports['av.Microphone'] = {
  setUp(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.spawn = this.sandbox.stub(cp, 'spawn').callsFake(() => {
      this.emitter = new Emitter();
      this.emitter.kill = this.sandbox.stub();
      this.emitter.stderr = new Emitter();
      this.emitter.stdout = new Emitter();
      return this.emitter;
    });

    this.write = this.sandbox.stub(Writable.prototype, 'write');

    done();
  },

  tearDown(done) {
    this.sandbox.restore();
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

};
