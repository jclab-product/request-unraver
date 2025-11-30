/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import {toByteArray} from 'base64-js';

// __sys_host
//  - performance_now(): double
// __sys_js

// function isAllowTimerInterval() {
//     return (typeof __sys_allow_timer_interval) === 'undefined' ? false : __sys_allow_timer_interval;
// }

const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * btoa() as defined by the HTML and Infra specs, which mostly just references
 * RFC 4648.
 */
function btoa(s) {
    if (arguments.length === 0) {
        throw new TypeError("1 argument required, but only 0 present.");
    }

    let i;
    // String conversion as required by Web IDL.
    s = `${s}`;
    // "The btoa() method must throw an "InvalidCharacterError" DOMException if
    // data contains any character whose code point is greater than U+00FF."
    for (i = 0; i < s.length; i++) {
        if (s.charCodeAt(i) > 255) {
            return null;
        }
    }
    let out = "";
    for (i = 0; i < s.length; i += 3) {
        const groupsOfSix = [undefined, undefined, undefined, undefined];
        groupsOfSix[0] = s.charCodeAt(i) >> 2;
        groupsOfSix[1] = (s.charCodeAt(i) & 0x03) << 4;
        if (s.length > i + 1) {
            groupsOfSix[1] |= s.charCodeAt(i + 1) >> 4;
            groupsOfSix[2] = (s.charCodeAt(i + 1) & 0x0f) << 2;
        }
        if (s.length > i + 2) {
            groupsOfSix[2] |= s.charCodeAt(i + 2) >> 6;
            groupsOfSix[3] = s.charCodeAt(i + 2) & 0x3f;
        }
        for (let j = 0; j < groupsOfSix.length; j++) {
            if (typeof groupsOfSix[j] === "undefined") {
                out += "=";
            } else {
                out += btoaLookup(groupsOfSix[j]);
            }
        }
    }
    return out;
}

function btoaLookup(index) {
    if (index >= 0 && index < 64) {
        return b64Chars[index];
    }

    // Throw INVALID_CHARACTER_ERR exception here -- won't be hit in the tests.
    return undefined;
}

// base64 to binary decoding
function atob(input) {
    let str = input.replace(/=+$/, '');
    let len = str.length;
    let bytes = new Uint8Array((len * 3) / 4 - ((str[len - 1] === '=') ? 1 : 0) - ((str[len - 2] === '=') ? 1 : 0));

    let p = 0;
    for (let i = 0; i < len; i += 4) {
        const encoded1 = b64Chars.indexOf(str[i]);
        const encoded2 = b64Chars.indexOf(str[i + 1]);
        const encoded3 = b64Chars.indexOf(str[i + 2]);
        const encoded4 = b64Chars.indexOf(str[i + 3]);

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }

    return bytes.buffer;
}

// TODO: addEventListener

const __sys = {
    // deferredFunctions: [],
    // // once: boolean
    // // next_at: Int
    // // interval: Int
    // // callback: Function
    // readyListeners: [],
    // emitReady: function () {
    //     for (const listener of __sys.readyListeners) {
    //         listener();
    //     }
    // },
    // newElement: function () {
    //     const element = {
    //         _pseudo: true,
    //     };
    //     element.style = {};
    //     element.setAttribute = (key, value) => {
    //         if (key === 'style') {
    //             return;
    //         }
    //         element.key = value;
    //     }
    //     element.appendChild = () => {
    //     };
    //     element.on = () => {
    //         return element;
    //     }
    //     element.once = () => {
    //         return element;
    //     }
    //     element.off = () => {
    //         return element;
    //     }
    //     element.add = () => {
    //     };
    //
    //     return element;
    // },
    // // overrideWindow: {
    // //     btoa: btoa,
    // //     atob: atob,
    // // },
    overrideWindow: {},
    getLine: function () {
        const e = new Error();
        if (!e.stack) {
            return '';
        }
        const stack = e.stack.toString().split(/\r\n|\n/)[1];
        const frame = /:(\d+)\)/.exec(stack);
        return frame && frame[1] || '';
    },
};

(function () {
    class XMLHttpRequest {
        _options = {
            requestHeaders: {},
            contentType: '',
            responseType: 'text',
            sync: false,
        };

        onreadystatechange = null;
        readyState = 0;
        responseText = null;
        status = null;
        statusText = null;
        contentType = '';

        overrideMimeType(contentType) {
            this._options.contentType = contentType;
        }

        open(method, url, async, username, password) {
            this._options.sync = async === false;
            this._options.method = method;
            this._options.url = url;
        }

        get responseType() {
            return this._options.responseType;
        }

        set responseType(s) {
            this._options.responseType = s;
        }

        send(data) {
            let requestType = 'text';
            if (ArrayBuffer.isView(data)) {
                requestType = 'base64';
                data = Buffer.from(data).toString('base64');
            } else if (typeof data !== 'string' && data !== undefined) {
                // console.log(`NO STRING DATA!!!: ${data}, ${typeof data}`);
            }
            const headers = {};
            Object.keys(this._options.requestHeaders).forEach((key) => {
                headers[key.toLowerCase()] = this._options.requestHeaders[key];
            });

            const result = __xhr_transfer(JSON.stringify({
                    method: this._options.method,
                    url: this._options.url,
                    responseType: this._options.responseType,
                    requestType: requestType,
                    headers: {
                        referer: __sys_document_url,
                        'user-agent': navigator.userAgent,
                        ...headers,
                    },
                }),
                data
            );
            const done = () => {
                this.readyState = 4;
                this.status = result.status;
                this.statusText = (result.status === 200) ? 'OK' : 'ERROR';
                this._options.responseType = result.responseType;
                if (!this._options.contentType) {
                    this._options.contentType = result.contentType;
                }
                if (result.status === 200 && this._options.contentType.startsWith('application/xml')) {
                    this.responseText = result.data;

                    const responseXML = new __sys.DOMParser()
                        .parseFromString(result.data);
                    responseXML.baseURI = result.url;
                    this.responseXML = responseXML;
                } else if (result.responseType === 'text') {
                    this.responseText = result.data;
                } else if (result.responseType === 'arraybuffer') {
                    this.response = toByteArray(result.data);
                } else {
                    // console.log('UNK RESP')
                }
                if (this.onreadystatechange) {
                    this.onreadystatechange();
                }
            };
            if (this._options.sync) {
                done();
            } else {
                process.nextTick(() => done());
            }
        }

        abort() {
            // console.log('XHR ABORT');
        }

        setRequestHeader(name, value) {
            name = name.toLowerCase();
            this._options.requestHeaders[name] = value;
        }

        getAllResponseHeaders() {
            return;
        }

        getResponseHeader(name) {
            return;
        }
    }

    __sys.overrideWindow.XMLHttpRequest = XMLHttpRequest;
})();

Object.assign(global, {
    __sys: __sys,
    performance: {
        now: __sys_host.performance_now,
    },
    atob: atob,
    btoa: btoa,
})

// {
//     version: '0.0.0',
//     env: {},
//     nextTick: function (fn) {
//         __sys.deferredFunctions.push(fn);
//     }
// };
// Object.assign(global, __sys.overrideWindow);
