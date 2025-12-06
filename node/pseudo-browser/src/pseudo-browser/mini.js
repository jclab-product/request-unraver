/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import './sys';
import './text-encoder';
import './node-polyfill';
import './msgpack';

export function randomUUID() {
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);

    // 2) 버전(v4) 및 변형(RFC 4122) 비트 설정
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // 0100xxxx
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // 10xxxxxx

    // 3) 바이트를 16진수 문자열로 변환 (lookup 테이블로 빠르게)
    const lut = [];
    for (let i = 0; i < 256; i++) lut[i] = (i + 0x100).toString(16).slice(1);

    return (
        lut[bytes[0]] + lut[bytes[1]] + lut[bytes[2]] + lut[bytes[3]] + '-' +
        lut[bytes[4]] + lut[bytes[5]] + '-' +
        lut[bytes[6]] + lut[bytes[7]] + '-' +
        lut[bytes[8]] + lut[bytes[9]] + '-' +
        lut[bytes[10]] + lut[bytes[11]] + lut[bytes[12]] +
        lut[bytes[13]] + lut[bytes[14]] + lut[bytes[15]]
    );
}

__sys.createWindow = function(content, windowOptions) {
    const w = {
        crypto: {
            getRandomValues: global.crypto.getRandomValues.bind(global.crypto),
            randomUUID: randomUUID,
        },
        document: {
            nodeType: 9,
            // createElement: function() {}
            write: function() {},
        }
    };
    w.ownerDocument = w.document;
    Object.assign(w, __sys.overrideWindow);

    const jQuery = function (target) {
        if (typeof target === 'function') {
            return ;
        }
        return {
            ready: function (fn) {},
        };
    }
    jQuery.ready = function (fn) {}
    w.jQuery = jQuery;
    w.$ = jQuery;

    return new Proxy(w, {
        set(target, p, newValue, receiver) {
            // console.log(`window : SET (${p}) : `, newValue);
            target[p] = newValue;
            global[p] = newValue;
        }
    });
}
