'use strict';
const SerialPort = require('serialport');
const ET312 = require('./lib/ET312');
const async = require('marcosc-async');
const opts = {
  baudrate: 19200,
  // If only we had a viable parser to use
  parser: SerialPort.parsers.raw
};

const port = new SerialPort('/dev/ttyUSB0', opts);

port.on('open', function() {
  async.task(function*() {
    const e = new ET312(port);
    try {
      yield e.handshake();
      console.log('handshake succeeded!');
    } catch (err) {
      console.log('handshake failed:', err);
      return port.close();
    }
    try {
      yield e.keyExchange();
      console.log('Box key: ' + e._key);
      let mode = yield e.readMode();
      console.log('Box mode: ' + mode);
      yield e.resetKey();
    } catch (err) {
      console.log('key exchange failed!', err);
    } finally {
      return port.close();
    }
  });
});
