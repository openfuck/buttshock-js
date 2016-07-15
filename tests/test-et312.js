const chai = require('chai');
const expect = chai.expect;
const buttshock = require('buttshock');
const async = require('marcosc-async');

describe('serial', () => {
  it('should throw on missing serial port parameter', () => {
    expect(() => { new buttshock.ET312Serial(); }).to.throw('ET312Serial requires a serial port address!');
  });
  it('should throw on non-string serial port parameter', () => {
    expect(() => { new buttshock.ET312Serial(123); }).to.throw('ET312Serial requires a string as serial port address!');
  });
  // This doesn't seem to throw like mocha expects.
  //
  // it('should throw on invalid serial port parameter', () => {
  //   expect(() => { async.task(function* () {
  //     try {
  //       yield (new buttshock.ET312Serial('not-a-port')).open();
  //     } catch (err) {
  //       throw(err);
  //     }
  //   });}).to.throw();
  // });
});
