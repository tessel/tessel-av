var isDarwin = Camera.isDarwin;
var CaptureStream = Camera.CaptureStream;
var FSWebcam = Camera.FSWebcam;
var binding = Camera.binding;

exports['av.Camera'] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
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

  captureDarwin: function(test) {
    test.expect(4);

    var isd = isDarwin();
    isDarwin(true);

    var cam = new av.Camera();

    test.equal(typeof cam.capture, 'function');

    this.capture = this.sandbox.stub(binding, 'capture', function() {
      return new Buffer([0]);
    });

    var capStream = cam.capture();

    test.equal(capStream instanceof CaptureStream, true);
    test.equal(capStream instanceof Readable, true);

    capStream.on('data', function() {
      test.ok(true);
    });

    capStream.on('end', function() {
      isDarwin(isd);
      test.done();
    });
  },
  captureFswebcam: function(test) {
    test.expect(4);

    var isd = isDarwin();

    isDarwin(false);

    var cam = new av.Camera();

    test.equal(typeof cam.capture, 'function');

    this.capture = this.sandbox.stub(FSWebcam.prototype, 'capture', function(callback) {
      setImmediate(function() {
        callback(null, new Buffer([0]));
      });
    });

    var capStream = cam.capture();

    test.equal(capStream instanceof CaptureStream, true);
    test.equal(capStream instanceof Readable, true);

    capStream.on('data', function() {
      test.ok(true);
    });

    capStream.on('end', function() {
      isDarwin(isd);
      test.done();
    });
  }
};
