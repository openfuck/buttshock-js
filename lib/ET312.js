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

  encryptByte(byte) {
    return byte ^ this._key ^ 0x55;
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

  readAddress(address) {
    return async.task(function*() {
      let packet = [0x3c, address >> 8, address & 0xff];
      packet.push(generateChecksum(packet));
      console.log(packet);
      let data = yield this.writeAndExpect(packet.map(this.encryptByte, this), 3);
      return data.readUInt8(1);
    }, this);
  }

  writeAddress(address, cmd) {
    return async.task(function*() {
      if (cmd.length > 8) {
        throw new Error("Cannot write more than 8 bytes per command!");
      }
      if (cmd.length < 1) {
        throw new Error("Must write at least 1 byte per command!");
      }
      let packet = [((0x3 + cmd.length) << 0x4) | 0xd,
                    address >> 8,
                    address & 0xff];
      packet = packet.concat(cmd);
      packet.push(generateChecksum(packet));
      console.log(packet);
      let data = yield this.writeAndExpect(packet.map(this.encryptByte, this), 1);
      return;
    }, this);
  }

  resetKey() {
    return this.writeAddress(0x4213, [0x0]);
  }

  readMode() {
    return this.readAddress(0x407b);
  }
}

module.exports = ET312;
