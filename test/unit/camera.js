var CaptureStream = Camera.CaptureStream;

exports['av.Camera'] = {
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
    test.equal(typeof av.Camera, 'function');
    test.done();
  },

  emitter: function(test) {
    test.expect(1);
    test.equal((new av.Camera()) instanceof Emitter, true);
    test.done();
  },

  captureEmitter: function(test) {
    test.expect(5);

    var buffer = new Buffer([0]);
    var cam = new av.Camera();

    test.equal(typeof cam.capture, 'function');

    var capture = cam.capture();

    test.equal(capture instanceof CaptureStream, true);
    test.equal(capture instanceof Readable, true);

    capture.on('data', function(data) {
      test.equal(buffer.equals(data), true);
      test.ok(true);
    });

    capture.on('end', function() {
      test.done();
    });

    this.emitter.stdout.emit('data', buffer);
    this.emitter.emit('close');
  },

  capturePipe: function(test) {
    // test.expect(5);

    var buffer = new Buffer([0]);
    var cam = new av.Camera();
    var writable = new Writable();

    writable._write = function(data) {
      test.equal(buffer.equals(data), true);
    };

    writable.on('pipe', () => {
      test.done();
    });

    cam.capture().pipe(writable);

    this.emitter.stdout.emit('data', buffer);
    this.emitter.emit('close');
  },

  stream: function(test) {
    test.expect(4);

    var cam = new av.Camera();

    var capture = this.sandbox.spy(cam, 'capture');

    var s = cam.stream();


    test.equal(capture.callCount, 1);
    test.deepEqual(capture.lastCall.args[0], {
      stream: true,
      pipe: true
    });

    test.equal(s instanceof CaptureStream, true);
    test.equal(s instanceof Readable, true);

    test.done();
  }
};
