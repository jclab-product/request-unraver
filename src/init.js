class URL {
    constructor(url, base) {
        const u = require('url');
        const parser = u.parse(u.resolve(base, url));
        this.href = parser.href;
        this.protocol = parser.protocol;
        this.host = parser.host;
        this.hostname = parser.hostname;
        this.port = parser.port;
        this.pathname = parser.pathname;
        this.search = parser.search;
        this.searchParams = new URLSearchParams(parser.search)
        this.hash = parser.hash;
        this.username = parser.username;
        this.password = parser.password;
        this.origin = parser.protocol+'//'+parser.host;
    }

    toString() {
        return this.href;
    }
}

class URLSearchParams {
    constructor(init = '') {
        this.params = {};

        if (typeof init === 'string') {
            this._parseFromString(init);
        } else if (init instanceof URLSearchParams) {
            init.forEach((value, key) => this.append(key, value));
        } else if (typeof init === 'object') {
            Object.keys(init).forEach(key => this.append(key, init[key]));
        }
    }

    _parseFromString(query) {
        if (query.startsWith('?')) {
            query = query.slice(1);
        }
        query.split('&').forEach(pair => {
            const [key, value] = pair.split('=').map(decodeURIComponent);
            this.append(key, value);
        });
    }

    append(key, value) {
        if (!this.params[key]) {
            this.params[key] = [];
        }
        this.params[key].push(value);
    }

    delete(key) {
        delete this.params[key];
    }

    get(key) {
        return this.params[key] ? this.params[key][0] : null;
    }

    getAll(key) {
        return this.params[key] || [];
    }

    has(key) {
        return this.params.hasOwnProperty(key);
    }

    set(key, value) {
        this.params[key] = [value];
    }

    toString() {
        return Object.keys(this.params)
            .map(key => this.params[key]
                .map(value => encodeURIComponent(key)+'='+encodeURIComponent(value))
                .join('&'))
            .join('&');
    }

    forEach(callback, thisArg) {
        Object.keys(this.params).forEach(key => {
            this.params[key].forEach(value => {
                callback.call(thisArg, value, key, this);
            });
        });
    }
}

globalThis.URLSearchParams = URLSearchParams;
globalThis.URL = URL;

globalThis.__sys_wrapped_require = function (orig_require, filename) {
    return function wrapped_require(name) {
        const u = orig_require('node:url');
        if (name.startsWith('.')) {
            name = u.resolve(filename, name);
        }
        return orig_require(name);
    };
}
