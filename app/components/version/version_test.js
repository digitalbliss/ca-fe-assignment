'use strict';

describe('hnReader.version module', function() {
  beforeEach(module('hnReader.version'));

  describe('version service', function() {
    it('should return current version', inject(function(version) {
      expect(version).toEqual('0.1');
    }));
  });
});
