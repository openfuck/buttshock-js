'use strict';
const buttshock = require('buttshock');
const async = require('marcosc-async');
const e = new buttshock.ET312Serial('/dev/ttyUSB0');

async.task(function*() {
  try {
    yield e.open();
  } catch (err) {
    console.log("Cannot open port!");
    return;
  }
  try {
    yield e.handshake();
    console.log('handshake succeeded!');
  } catch (err) {
    console.log('handshake failed:', err);
    yield e.close();
    return;
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
    yield e.close();
    return;
  }
});

