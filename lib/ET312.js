'use strict';
const Handcrank = require('./handcrank');

function generateChecksum(data) {
  var accum = 0;
  for (var i = 0; i < data.length; ++i) {
    accum += data[i];
  }
  if (accum > 256) {
    return accum % 256;
  }
  return accum;
}

function verifyChecksum(data) {
  const checksum = data.readUInt8(data.length - 1);
  return checksum === generateChecksum(data.slice(0, -1));
}

function doHandshake(data) {
  if (data.length < 1) {
    return 0;
  }
  if (data.readUInt8(0) !== 0x7) {
    throw new Error('Protocol error');
  }
  return 1;
}

function doKeyExchange(data) {
  if (data.length < 3) {
    return undefined;
  }
  if (!verifyChecksum(data)) {
    throw new Error('Checksum mismatch!');
  }
  if (data.readUInt8(0) !== 0x21) {
    throw new Error('Wrong return code on key exchange!');
  }
  this._key = data.readUInt8(1);
  return 3;
}

class ET312 {
  constructor(port) {
    this._key = null;
    this._port = port;
    this._crank = new Handcrank();
    this._port.on('data', data => {
      this._crank.input(data);
    });
  }
  _encryptCommand() {

  }

  keyExchange() {
    return new Promise((resolve, reject) => {
      const keyCommand = [0x2f, 0x00];
      const checksum = generateChecksum(keyCommand);
      keyCommand.push(checksum);
      console.log(keyCommand);
      this._port.write(keyCommand, (error) => {
        if (error) {
          return reject(error);
        }
        try {
          this._crank.add(data => doKeyExchange(data));
        } catch (err) {
          return reject(err);
        } finally {
          resolve();
        }
      });
    });
  }

  handshake() {
    return new Promise((resolve, reject) => {
      this._port.write([0x0], (error) => {
        if (error) {
          return reject(error);
        }
        this._crank.add(data => {
          doHandshake(data);
          resolve();
        });
      });
    });
  }

  get mode() {
    return null;
  }
}

module.exports = ET312;
