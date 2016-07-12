"use strict";
const async = require("marcosc-async");

function generateChecksum(data) {
  var accum = 0;
  for (var i = 0; i < data.length; ++i) {
    accum += data[i];
  }
  if (accum > 255) {
    accum %= 256;
  }
  return accum;
}


function verifyChecksum(data) {
  const checksum = data.readUInt8(data.length - 1);
  if (checksum !== generateChecksum(data.slice(0, data.length-1))) {
    throw new Error("Invalid checksum!");
  }
}


class ET312 {
  constructor(port) {
    this._key = null;
    this._port = port;
  }

  writeAndExpect(data, length) {
    return new Promise((resolve, reject) => {
      const buffer = new Buffer(length);
      this._port.write(data, (error) => {
        if (error) {
          reject(error);
          return;
        }
        // After this, do nothing. We'll let things proceed via the "data" events
        // from the serial port.
      });
      let offset = 0;
      let handler = (d) => {
        try {
          Uint8Array.from(d).forEach(byte => buffer.writeUInt8(byte, offset));
          offset += d.length;
        } catch (err) {
          reject(err);
          return;
        }
        if (offset === length) {
          resolve(buffer);
          this._port.removeListener("data", handler);
        };
      };
      this._port.on("data", handler);
    });
  }

  _encryptCommand() {

  }

  keyExchange() {
    return async.task(function*() {
      let packet = [0x2f, 0x00];
      let sum = generateChecksum(packet);
      packet.push(sum);
      let data = yield this.writeAndExpect(packet, 3);
      if (data.length !== 3) {
        throw new Error("Wrong length!");
      }
      if (data.readUInt8(0) !== 0x21) {
        throw new Error("Not a key exchange packet!");
      }
      verifyChecksum(data);
      this._key = data.readUInt8(1);
    }, this);
  }

  handshake() {
    return async.task(function*() {
      const data = yield this.writeAndExpect([0x0], 1);
      if (data.length !== 1 || data.readUInt8(0) !== 0x7) {
        throw new Error("Handshake failed!");
      }
    }, this);
  }

  get mode() {
    return null;
  }
}

module.exports = ET312;
