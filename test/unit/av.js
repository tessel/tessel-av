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
