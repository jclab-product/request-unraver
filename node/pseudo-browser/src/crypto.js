module.exports = require('crypto');

function actualFill(buf, offset, size, cb) {
    const ourBuf = buf.buffer;
    const uint = new Uint8Array(ourBuf, offset, size);
    global.crypto.getRandomValues(uint);
    if (cb) {
        process.nextTick(function() {
            cb(null, buf);
        });
        return;
    }
    return buf;
}
function randomFill(buf, offset, size, cb) {
    // if (!Buffer.isBuffer(buf) && !(buf instanceof global.Uint8Array)) throw new TypeError("\"buf\" argument must be a Buffer or Uint8Array");
    if (typeof offset === "function") {
        cb = offset;
        offset = 0;
        size = buf.length;
    } else if (typeof size === "function") {
        cb = size;
        size = buf.length - offset;
    } else if (typeof cb !== "function") throw new TypeError("\"cb\" argument must be a function");
    // assertOffset(offset, buf.length);
    // assertSize(size, offset, buf.length);
    return actualFill(buf, offset, size, cb);
}
function randomFillSync(buf, offset, size) {
    if (typeof offset === "undefined") offset = 0;
    // assertOffset(offset, buf.length);
    if (size === void 0) size = buf.length - offset;
    // assertSize(size, offset, buf.length);
    return actualFill(buf, offset, size);
}

module.exports.randomFill = randomFill;
module.exports.randomFillSync = randomFillSync;