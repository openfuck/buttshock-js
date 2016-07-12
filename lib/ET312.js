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
  const checksum = data[data.length - 1];
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
          // If we're expecting more than 1 byte back, assume we have a
          // checksum.
          if (length > 1) {
            try {
              verifyChecksum(buffer);
            } catch (err) {
              reject(err);
              throw err;
            }
          }
          console.log(buffer);
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
      if (data.readUInt8(0) !== 0x21) {
        throw new Error("Not a key exchange packet!");
      }
      this._key = data.readUInt8(1);
    }, this);
  }

  handshake() {
    return async.task(function*() {
      const data = yield this.writeAndExpect([0x0], 1);
      if (data.readUInt8(0) !== 0x7) {
        throw new Error("Handshake failed!");
      }
    }, this);
  }

  get mode() {
    return null;
  }
}

module.exports = ET312;
