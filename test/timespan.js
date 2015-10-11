var assert = require("assert");
var timespan = require('../timespan.js');

describe('Timespan', function() {
  describe('getTimeSpanInMs', function () {
    it('should return 500 for 500ms', function () {
      assert.equal(500, timespan.getTimeSpanInMs('500ms'));
    });

    it('should return 20*1000 for 20s', function () {
        assert.equal(20*1000, timespan.getTimeSpanInMs('20s'));
    });

    it('should return 20*1000 for 20 S', function () {
        assert.equal(20*1000, timespan.getTimeSpanInMs('20 S'));
    });

    it('should return 15*60*1000 for 15m', function () {
      assert.equal(15*60*1000, timespan.getTimeSpanInMs('15m'));
    });

    it('should return 2*60*60*1000 for 2h', function() {
      assert.equal(2*60*60*1000, timespan.getTimeSpanInMs('2h'));
    });

    it ('should return 7*24*60*60*1000 for 7d', function() {
      assert.equal(7*24*60*60*1000, timespan.getTimeSpanInMs('7d'));
    });

    it ('should return 3*24*60*60*1000 for 3          d', function() {
      assert.equal(3*24*60*60*1000, timespan.getTimeSpanInMs('3          d'));
    });

    it('should return the same value for 2d as for 48h', function() {
      assert.equal(timespan.getTimeSpanInMs('2d'), timespan.getTimeSpanInMs('48h'));
    });
  });
});
