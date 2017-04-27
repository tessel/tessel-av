'use strict';

require('../common/bootstrap');

exports['av'] = {
  api(test) {
    test.expect(3);
    test.equal(av.hasOwnProperty('Camera'), true);
    test.equal(av.hasOwnProperty('Microphone'), true);
    test.equal(av.hasOwnProperty('Speaker'), true);
    test.done();
  }
};
