exports['av'] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    done();
  },

  tearDown: function(done) {
    this.sandbox.restore();
    done();
  },

  api: function(test) {
    test.expect(3);

    test.equal(av.hasOwnProperty('Camera'), true);
    test.equal(av.hasOwnProperty('Microphone'), true);
    test.equal(av.hasOwnProperty('Speaker'), true);
    test.done();
  }
};

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

    var isd = av.isDarwin();
    av.isDarwin(true);

    var cam = new av.Camera();

    test.equal(typeof cam.capture, 'function');

    this.capture = this.sandbox.stub(av.binding, 'capture', function() {
      return new Buffer([0]);
    });

    var capStream = cam.capture();

    test.equal(capStream instanceof av.CaptureStream, true);
    test.equal(capStream instanceof Readable, true);

    capStream.on('data', function() {
      test.ok(true);
    });

    capStream.on('end', function() {
      av.isDarwin(isd);
      test.done();
    });
  },
  captureFswebcam: function(test) {
    test.expect(4);

    var isd = av.isDarwin();

    av.isDarwin(false);

    var cam = new av.Camera();

    test.equal(typeof cam.capture, 'function');

    this.capture = this.sandbox.stub(av.FSWebcam.prototype, 'capture', function(callback) {
      setImmediate(function() {
        callback(null, new Buffer([0]));
      });
    });

    var capStream = cam.capture();

    test.equal(capStream instanceof av.CaptureStream, true);
    test.equal(capStream instanceof Readable, true);

    capStream.on('data', function() {
      test.ok(true);
    });

    capStream.on('end', function() {
      av.isDarwin(isd);
      test.done();
    });
  }
};
