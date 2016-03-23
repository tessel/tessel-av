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

  captureToEmitter: function(test) {
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

  captureToPipe: function(test) {
    test.expect(1);

    var buffer = new Buffer([0]);
    var cam = new av.Camera();
    var writable = new Writable();

    writable._write = function() {};

    writable.on('pipe', () => {
      test.ok(true);
      test.done();
    });

    cam.capture().pipe(writable);

    this.emitter.stdout.emit('data', buffer);
    this.emitter.emit('close');
  },

  captureSpawnToPipe: function(test) {
    test.expect(3);

    var cam = new av.Camera();

    cam.capture();

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'ffmpeg');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-y',
      '-v',
      'fatal',
      '-f',
      'v4l2',
      '-r',
      8,
      '-s',
      '320x240',
      '-i',
      '/dev/video0',
      '-s',
      '320x240',
      '-q:v',
      1,
      '-f',
      'MJPEG',
      '-vframes',
      1,
      'pipe:1'
    ]);

    test.done();
  },

  captureToFilePipeFalse: function(test) {
    test.expect(3);

    var cam = new av.Camera({
      // default to /tmp/capture.jpg
      pipe: false
    });

    cam.capture();

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'ffmpeg');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-y',
      '-v',
      'fatal',
      '-f',
      'v4l2',
      '-r',
      8,
      '-s',
      '320x240',
      '-i',
      '/dev/video0',
      '-s',
      '320x240',
      '-q:v',
      1,
      '-f',
      'MJPEG',
      '-vframes',
      1,
      '/tmp/capture.jpg'
    ]);

    test.done();
  },

  captureToFileOutputFile: function(test) {
    test.expect(3);

    var cam = new av.Camera({
      output: 'foo.jpg'
    });

    cam.capture();

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'ffmpeg');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-y',
      '-v',
      'fatal',
      '-f',
      'v4l2',
      '-r',
      8,
      '-s',
      '320x240',
      '-i',
      '/dev/video0',
      '-s',
      '320x240',
      '-q:v',
      1,
      '-f',
      'MJPEG',
      '-vframes',
      1,
      'foo.jpg'
    ]);

    test.done();
  },

  captureToFileOutputFileCaptureCall: function(test) {
    test.expect(3);

    var cam = new av.Camera();

    cam.capture({
      output: 'foo.jpg'
    });

    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'ffmpeg');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-y',
      '-v',
      'fatal',
      '-f',
      'v4l2',
      '-r',
      8,
      '-s',
      '320x240',
      '-i',
      '/dev/video0',
      '-s',
      '320x240',
      '-q:v',
      1,
      '-f',
      'MJPEG',
      '-vframes',
      1,
      'foo.jpg'
    ]);

    test.done();
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
  },

  streamUnaffectedByOutputFile: function(test) {
    test.expect(7);

    var cam = new av.Camera({
      output: 'foo.jpg'
    });

    var capture = this.sandbox.spy(cam, 'capture');

    var s = cam.stream();


    test.equal(capture.callCount, 1);
    test.deepEqual(capture.lastCall.args[0], {
      stream: true,
      pipe: true
    });

    test.equal(s instanceof CaptureStream, true);
    test.equal(s instanceof Readable, true);
    test.equal(this.spawn.callCount, 1);
    test.equal(this.spawn.lastCall.args[0], 'ffmpeg');
    test.deepEqual(this.spawn.lastCall.args[1], [
      '-y',
      '-v',
      'fatal',
      '-f',
      'v4l2',
      '-r',
      8,
      '-s',
      '320x240',
      '-i',
      '/dev/video0',
      '-s',
      '320x240',
      '-q:v',
      3,
      '-f',
      'MJPEG',
      '-b:v',
      '64k',
      '-r',
      8,
      'pipe:1',
    ]);

    test.done();
  }
};
