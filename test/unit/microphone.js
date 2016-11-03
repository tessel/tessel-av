exports['av.Microphone'] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.emitter = new Emitter();
    this.spawn = this.sandbox.stub(cp, 'spawn', () => {
      this.emitter = new Emitter();
      this.emitter.kill = this.sandbox.stub();
      this.emitter.stderr = new Emitter();
      this.emitter.stdout = new Emitter();
      return this.emitter;
    });

    this.write = this.sandbox.stub(Writable.prototype, 'write');

    done();
  },

  tearDown: function(done) {
    this.sandbox.restore();
    done();
  },

  basic: function(test) {
    test.expect(1);
    test.equal(typeof av.Microphone, 'function');
    test.done();
  },

  emitter: function(test) {
    test.expect(1);
    test.equal((new av.Microphone()) instanceof Emitter, true);
    test.done();
  },

  listenToEmitter: function(test) {
    test.expect(5);

    var buffer = new Buffer([0]);
    var mic = new av.Microphone();

    test.equal(typeof mic.listen, 'function');

    var listen = mic.listen();

    test.equal(listen instanceof CaptureStream, true);
    test.equal(listen instanceof Readable, true);

    listen.on('data', function(data) {
      test.equal(buffer.equals(data), true);
      test.ok(true);
      test.done();
    });
    this.emitter.stdout.emit('data', buffer);
  },

  listenToPipe: function(test) {
    test.expect(1);

    var buffer = new Buffer([0]);
    var mic = new av.Microphone();
    var writable = new Writable();

    writable._write = function() {};

    writable.on('pipe', () => {
      test.ok(true);
      test.done();
    });

    mic.listen().pipe(writable);

    this.emitter.stdout.emit('data', buffer);
    this.emitter.emit('close');
  },

  listenSpawnToPipe: function(test) {
    test.expect(3);

    var mic = new av.Microphone();

    mic.listen();

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'arecord');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-f', 'cd', '-r', '48000', '-c', 1
    ]);

    test.done();
  },

};
