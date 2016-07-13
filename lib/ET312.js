"use strict";
const async = require("marcosc-async");


/**
 * Generates an uint8 checksum for a packet. Checksums are generated any time a
 * packet returns data instead of an error code. For the ET-312, this means
 * during key exchange, and on reads.
 *
 * @param {UInt8Array} data uint8 array to create checksum for.
 * @returns {UInt8} Checksum value.
 * @private
 */
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


/**
 * Checks data in packet to make sure checksum matches. Packets with checksums
 * will always have the checksum as the last byte in the packet.
 *
 * @param {UInt8Array} data packet (uint8 array) to verify checksum for.
 * @throws {Error} Thrown if checksum does not match expected value.
 * @private
 */
function verifyChecksum(data) {
  const checksum = data[data.length - 1];
  if (checksum !== generateChecksum(data.slice(0, data.length-1))) {
    throw new Error("Invalid checksum!");
  }
}


/**
 * @classdesc Provides connection and read/write capabilities for communicating
 * with the Erostek ET-312 electrostim unit.
*/
class ET312 {
  /**
   * Sets up an ET312 object. Currently takes a serial port. This will change.
   *
   * @constructor
   * @param {SerialPort} Serial Port object to communicate with
   */
  constructor(port) {
    this._key = null;
    this._port = port;
  }

  /**
   * Writes a value to the serial port, and waits for a specified number of
   * bytes in reply. Due to how ET312 communication works, it can be assumed
   * that a value written to the ET312 will get a response. Response length is
   * also always known ahead of time.
   *
   * Note that in the situation where the ET312 is set to "Master Link" mode while
   * talking to the host, this function will fail, as bytes will be sent without
   * a command having first been sent. However, operating with the PC host in
   * slave mode is out of the scope of this library.
   *
   * @param {UInt8Array} data Data to send to ET312. Should have checksum appended
   * and be encrypted (if needed).
   * @param {uint8} length Amount of data to expect in the reply, in bytes.
   * @returns {Promise} Promise that resolves (with a Buffer object) when
   * expected number of bytes have arrived.
   * @throws {Error} Throws on wrong read length (too many bytes read), or on
   * invalid checksum.
   * @private
   */
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
          resolve(buffer);
          this._port.removeListener("data", handler);
        };
      };
      this._port.on("data", handler);
    });
  }

  /**
   * Encrypts a single byte to be transferred to the ET312. Encryption algorithm
   * is an xor of the key exchanged with the ET312, the byte, and 0x55.
   *
   * @param {uint8} byte Byte to be encrypted.
   * @returns {uint8} Encrypted byte.
   */
  encryptByte(byte) {
    return byte ^ this._key ^ 0x55;
  }

  /**
   * Exchange crypto keys with the ET312. A key is written to the ET312 (in this
   * case, always 0x0), and then one is received back. The received key is used
   * to encrypt all further communications with the ET312.
   *
   * @returns {Promise} Promise that resolves (with no argument) on success.
   * @throws {Error} Error thrown if packet received from ET312 is not the one expected.
   */
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

  /**
   * Handshake sent to the ET312 to establish communication. Sends a 0x0 to the
   * ET312, expects back [0x7]. Can also be used to synchronize commands with
   * the ET312.
   *
   * @returns {Promise} Promise that resolves on successful handshake.
   * @throws {Error} Error thrown if 0x7 is not received back.
   */
  handshake() {
    return async.task(function*() {
      const data = yield this.writeAndExpect([0x0], 1);
      if (data.readUInt8(0) !== 0x7) {
        throw new Error("Handshake failed!");
      }
    }, this);
  }

  /**
   * Read the value from an address on the ET312. Addresses are mapped to a
   * virtual space.
   *
   * - 0x0000 - 0x0200 - ROM (Last 512 bytes of Flash)
   * - 0x4000 - 0x4400 - RAM (First 1k of RAM)
   * - 0x8000 - 0x8200 - EEPROM (512 bytes of EEPROM)
   *
   * Any address values falling in between these ranges will repeat. e.g. 0x0230
   * will translate to 0x0030.
   *
   * See memory table at https://www.buttshock.com/doc/et312/ for more
   * information on memory tables and maps.
   *
   * @param {uint16} address Address to read a value from.
   * @returns {Promise} Promise that resolves on read success, with byte value
   * at the address requested as argument.
   */
  readAddress(address) {
    return async.task(function*() {
      let packet = [0x3c, address >> 8, address & 0xff];
      packet.push(generateChecksum(packet));
      let data = yield this.writeAndExpect(packet.map(this.encryptByte, this), 3);
      return data.readUInt8(1);
    }, this);
  }

  /**
   * Write between 1-8 bytes to an address on the ET312. If more than one byte
   * is written, the write is considered sequential. Addresses are mapped to a
   * virtual space.
   *
   * - 0x0000 - 0x0200 - ROM (Last 512 bytes of Flash)
   * - 0x4000 - 0x4400 - RAM (First 1k of RAM)
   * - 0x8000 - 0x8200 - EEPROM (512 bytes of EEPROM)
   *
   * Any address values falling in between these ranges will repeat. e.g. 0x0230
   * will translate to 0x0030.
   *
   * Writes to ROM will fail silently. Writes to RAM should be aware of values
   * that are being written to, as mapped RAM space does contain registered and
   * other important addresses that can affect operation.
   *
   * See memory table at https://www.buttshock.com/doc/et312/ for more
   * information on memory tables and maps.
   *
   * @param {uint16} address Address to write value(s) to.
   * @param {array} cmd Array of 1-8 bytes to write to address requested.
   * @returns {Promise} Promise that resolves on write success.
   * @throws {Error} Throws on wrong array size in arguments.
   */
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
      let data = yield this.writeAndExpect(packet.map(this.encryptByte, this), 1);
      return;
    }, this);
  }

  /**
   * Resets the crypto key on the ET312. This should be run before all
   * disconnections and shutdowns, as otherwise the crypto key must be kept
   * across ET312 power on/off sessions. By resetting the key at the end of a
   * session, the usual handshake/key exchange initialization will work multiple
   * times in the same power on/off session.
   *
   * @returns {Promise} Promise that resolves on successful key reset.
   */
  resetKey() {
    return this.writeAddress(0x4213, [0x0]);
  }

  /**
   * Read the currently running mode for the box.
   * @returns {Promise} Promise that resolves on successful read, with mode as
   * argument.
   */
  readMode() {
    return this.readAddress(0x407b);
  }
}

module.exports = ET312;
