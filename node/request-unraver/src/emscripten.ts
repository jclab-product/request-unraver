import {isArgumentsObject} from 'util/types';

const _emscripten_get_now = () => performance.now();
const _emscripten_date_now = () => Date.now();
const nowIsMonotonic = 1;
const checkWasiClock = (clock_id: number) => clock_id >= 0 && clock_id <= 3;

const MAX_UINT8 = (2 ** 8) - 1;
const MAX_UINT16 = (2 ** 16) - 1;
const MAX_UINT32 = (2 ** 32) - 1;
const MAX_UINT53 = (2 ** 53) - 1;
const MAX_UINT64 = (2 ** 64) - 1;

const MIN_INT8 = -(2 ** (8 - 1));
const MIN_INT16 = -(2 ** (16 - 1));
const MIN_INT32 = -(2 ** (32 - 1));
const MIN_INT53 = -(2 ** (53 - 1));
const MIN_INT64 = -(2 ** (64 - 1));

const ERRNO_CODES: Record<string, number> = {
    'EPERM': 63,
    'ENOENT': 44,
    'ESRCH': 71,
    'EINTR': 27,
    'EIO': 29,
    'ENXIO': 60,
    'E2BIG': 1,
    'ENOEXEC': 45,
    'EBADF': 8,
    'ECHILD': 12,
    'EAGAIN': 6,
    'EWOULDBLOCK': 6,
    'ENOMEM': 48,
    'EACCES': 2,
    'EFAULT': 21,
    'ENOTBLK': 105,
    'EBUSY': 10,
    'EEXIST': 20,
    'EXDEV': 75,
    'ENODEV': 43,
    'ENOTDIR': 54,
    'EISDIR': 31,
    'EINVAL': 28,
    'ENFILE': 41,
    'EMFILE': 33,
    'ENOTTY': 59,
    'ETXTBSY': 74,
    'EFBIG': 22,
    'ENOSPC': 51,
    'ESPIPE': 70,
    'EROFS': 69,
    'EMLINK': 34,
    'EPIPE': 64,
    'EDOM': 18,
    'ERANGE': 68,
    'ENOMSG': 49,
    'EIDRM': 24,
    'ECHRNG': 106,
    'EL2NSYNC': 156,
    'EL3HLT': 107,
    'EL3RST': 108,
    'ELNRNG': 109,
    'EUNATCH': 110,
    'ENOCSI': 111,
    'EL2HLT': 112,
    'EDEADLK': 16,
    'ENOLCK': 46,
    'EBADE': 113,
    'EBADR': 114,
    'EXFULL': 115,
    'ENOANO': 104,
    'EBADRQC': 103,
    'EBADSLT': 102,
    'EDEADLOCK': 16,
    'EBFONT': 101,
    'ENOSTR': 100,
    'ENODATA': 116,
    'ETIME': 117,
    'ENOSR': 118,
    'ENONET': 119,
    'ENOPKG': 120,
    'EREMOTE': 121,
    'ENOLINK': 47,
    'EADV': 122,
    'ESRMNT': 123,
    'ECOMM': 124,
    'EPROTO': 65,
    'EMULTIHOP': 36,
    'EDOTDOT': 125,
    'EBADMSG': 9,
    'ENOTUNIQ': 126,
    'EBADFD': 127,
    'EREMCHG': 128,
    'ELIBACC': 129,
    'ELIBBAD': 130,
    'ELIBSCN': 131,
    'ELIBMAX': 132,
    'ELIBEXEC': 133,
    'ENOSYS': 52,
    'ENOTEMPTY': 55,
    'ENAMETOOLONG': 37,
    'ELOOP': 32,
    'EOPNOTSUPP': 138,
    'EPFNOSUPPORT': 139,
    'ECONNRESET': 15,
    'ENOBUFS': 42,
    'EAFNOSUPPORT': 5,
    'EPROTOTYPE': 67,
    'ENOTSOCK': 57,
    'ENOPROTOOPT': 50,
    'ESHUTDOWN': 140,
    'ECONNREFUSED': 14,
    'EADDRINUSE': 3,
    'ECONNABORTED': 13,
    'ENETUNREACH': 40,
    'ENETDOWN': 38,
    'ETIMEDOUT': 73,
    'EHOSTDOWN': 142,
    'EHOSTUNREACH': 23,
    'EINPROGRESS': 26,
    'EALREADY': 7,
    'EDESTADDRREQ': 17,
    'EMSGSIZE': 35,
    'EPROTONOSUPPORT': 66,
    'ESOCKTNOSUPPORT': 137,
    'EADDRNOTAVAIL': 4,
    'ENETRESET': 39,
    'EISCONN': 30,
    'ENOTCONN': 53,
    'ETOOMANYREFS': 141,
    'EUSERS': 136,
    'EDQUOT': 19,
    'ESTALE': 72,
    'ENOTSUP': 138,
    'ENOMEDIUM': 148,
    'EILSEQ': 25,
    'EOVERFLOW': 61,
    'ECANCELED': 11,
    'ENOTRECOVERABLE': 56,
    'EOWNERDEAD': 62,
    'ESTRPIPE': 135,
};

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function checkInt(value: number, bits: number, min: number, max: number) {
    assert(Number.isInteger(Number(value)), `attempt to write non-integer (${value}) into integer heap`);
    assert(value <= max, `value (${value}) too large to write as ${bits}-bit value`);
    assert(value >= min, `value (${value}) too small to write as ${bits}-bit value`);
}

var checkInt1 = (value: number) => checkInt(value, 1, 1, 1);
var checkInt8 = (value: number) => checkInt(value, 8, MIN_INT8, MAX_UINT8);
var checkInt16 = (value: number) => checkInt(value, 16, MIN_INT16, MAX_UINT16);
var checkInt32 = (value: number) => checkInt(value, 32, MIN_INT32, MAX_UINT32);
var checkInt53 = (value: number) => checkInt(value, 53, MIN_INT53, MAX_UINT53);
var checkInt64 = (value: number) => checkInt(value, 64, MIN_INT64, MAX_UINT64);

const INT53_MAX = 9007199254740992n;
const INT53_MIN = -9007199254740992n;
const bigintToI53Checked = (num: bigint): number => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);

type ErrnoError = Error;

interface ErrnoErrorConstructor {
    readonly prototype: ErrnoError;

    new(code: number): ErrnoError;
}

export class EmscriptenRuntime {
    // WASM 인스턴스와 메모리를 연결하기 위해 사용자가 호출할 수 있는 헬퍼와,
    // Emscripten이 기대하는 `wasmImports` 오브젝트를 제공합니다.

    public readonly wasmImports: Record<string, any>;
    public readonly ErrnoError: ErrnoErrorConstructor;

    public instance!: WebAssembly.Instance;
    public module!: WebAssembly.Module;
    public exports!: Record<string, any>;

    public wasmMemory!: WebAssembly.Memory;
    public HEAPU8!: Uint8Array;
    public HEAPU32!: Uint32Array;
    public HEAP64!: BigInt64Array;
    public dataView!: DataView;

    protected runtimeInitialized: boolean = false;

    // 원본 코드의 상태 변수들
    private ABORT: boolean = false;
    private exceptionLast: number = 0;
    private uncaughtExceptionCount: number = 0;
    //
    // // FS 및 SYSCALLS 시뮬레이션을 위한 간단한 스텁 (실제 구현은 매우 방대함)
    // private FS = {
    //     close: (stream: any) => { /* Implement FS.close */
    //     },
    //     llseek: (stream: any, offset: number, whence: number) => {
    //         return 0; /* Implement FS.llseek */
    //     },
    //     write: (stream: any, buffer: Uint8Array, offset: number, length: number, position: number | undefined) => {
    //         return length; /* Implement FS.write */
    //     },
    //     unlink: (path: string) => { /* Implement FS.unlink */
    //     },
    //     rmdir: (path: string) => { /* Implement FS.rmdir */
    //     },
    //     dupStream: (old: any) => {
    //         return {fd: 123}; /* Implement FS.dupStream */
    //     },
    // };
    //
    // private SYSCALLS = {
    //     getStreamFromFD: (fd: number) => {
    //         return {fd: fd, position: 0, path: '/tmp/file'}; /* Implement SYSCALLS.getStreamFromFD */
    //     },
    //     getStr: (ptr: number) => this.UTF8ToString(ptr),
    //     calculateAt: (dirfd: number, path: string) => path, // Simplified
    // };

    constructor() {
        this.wasmImports = {
            // __assert_fail: this.__assert_fail.bind(this),
            // __cxa_throw: this.__cxa_throw.bind(this),
            // __handle_stack_overflow: this.__handle_stack_overflow.bind(this),
            // __syscall_dup: this.__syscall_dup.bind(this),
            __syscall_unlinkat: this.__syscall_unlinkat.bind(this),
            // _abort_js: this._abort_js.bind(this),
            // _localtime_js: this._localtime_js.bind(this),
            // _tzset_js: this._tzset_js.bind(this),
            clock_time_get: this.clock_time_get.bind(this),
            // emscripten_date_now: this.emscripten_date_now.bind(this),
            // emscripten_get_now: this.emscripten_get_now.bind(this),
            // emscripten_resize_heap: this.emscripten_resize_heap.bind(this),
            emscripten_notify_memory_growth: this._emscripten_notify_memory_growth.bind(this),
            environ_get: this._environ_get.bind(this),
            environ_sizes_get: this._environ_sizes_get.bind(this),
            fd_close: this.fd_close.bind(this),
            fd_seek: this.fd_seek.bind(this),
            fd_write: this.fd_write.bind(this),
        };

        const runtime = this;
        this.ErrnoError = class extends Error {
            public errno: number;
            public code: string = '';

            // We set the `name` property to be able to identify `FS.ErrnoError`
            // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
            // - when using PROXYFS, an error can come from an underlying FS
            // as different FS objects have their own FS.ErrnoError each,
            // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
            // we'll use the reliable test `err.name == "ErrnoError"` instead
            constructor(errno: number) {
                super(runtime.runtimeInitialized ? runtime.strError(errno) : '');
                this.errno = errno;
                for (const key in ERRNO_CODES) {
                    if (ERRNO_CODES[key] === errno) {
                        this.code = key;
                        break;
                    }
                }
            }
        };
    }

    async instantiate(source: BufferSource) {
        const result = await WebAssembly.instantiate(source, {
            'env': this.wasmImports,
            'wasi_snapshot_preview1': this.wasmImports,
        });
        this.instance = result.instance;
        this.module = result.module;
        const exports = result.instance.exports as any;
        this.exports = exports;
        this.attachMemory(exports['memory'] as any);

        exports['emscripten_stack_init']();

        // init runtime
        if (!this.runtimeInitialized) {
            this.setStackLimits(exports);
            this.runtimeInitialized = true;
        }

        // run mian
        // exports['_initialize']();
    }

    // WASM 메모리를 연결합니다. 인스턴스화 이후에 호출되어야 합니다.
    attachMemory(memory: WebAssembly.Memory) {
        this.wasmMemory = memory;
        this.updateMemoryViews();
    }

    updateMemoryViews() {
        const b = this.wasmMemory.buffer;
        this.HEAPU8 = new Uint8Array(b);
        this.HEAPU32 = new Uint32Array(b);
        this.HEAP64 = new BigInt64Array(b);
        this.dataView = new DataView(b);
    }

    protected strError (errno: number) {
        if (this.exports['strerror']) {
            return this.UTF8ToString(this.exports['strerror'](errno));
        }
        return '';
    }

    protected setStackLimits(exports: Record<string, any>) {
        var stackLow = exports['emscripten_stack_get_base']();
        var stackHigh = exports['emscripten_stack_get_end']();
        exports['__set_stack_limits'](stackLow, stackHigh);
    };

    protected _emscripten_notify_memory_growth(memoryIndex: number) {
        this.updateMemoryViews();
    }

    private abort(what?: any) {
        const msg = 'Aborted(' + what + ')';
        console.error(msg);
        this.ABORT = true;
        throw new WebAssembly.RuntimeError(msg);
    }

    private err(text: string) {
        console.error(text);
    }

    // Integer checks
    private checkInt(value: number, bits: number, min: number, max: number) {
        // 단순화: 실제 런타임 체크가 필요 없다면 생략 가능
        if (!Number.isInteger(value)) console.warn(`attempt to write non-integer (${value}) into integer heap`);
    }

    private checkInt32(value: number) {
        this.checkInt(value, 32, -2147483648, 2147483647);
    }

    private checkInt64(value: bigint | number) { /* BigInt check logic */
    }

    private ptrToString(ptr: number): string {
        return '0x' + (ptr >>> 0).toString(16).padStart(8, '0');
    }

    private UTF8ToString(ptr: number, maxBytesToRead?: number): string {
        if (!ptr) return '';
        let endPtr = ptr;
        if (maxBytesToRead === undefined) {
            while (this.HEAPU8[endPtr]) ++endPtr;
        } else {
            endPtr = ptr + maxBytesToRead;
        }

        // TextDecoder is generally available in modern environments
        const subArray = this.HEAPU8.subarray(ptr, endPtr);
        return new TextDecoder('utf-8').decode(subArray);
    }

    private stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): number {
        const u8 = new TextEncoder().encode(str);
        const numBytes = Math.min(u8.length, maxBytesToWrite - 1); // reserve 1 for null terminator
        this.HEAPU8.set(u8.subarray(0, numBytes), outPtr);
        this.HEAPU8[outPtr + numBytes] = 0;
        return numBytes;
    }

    private lengthBytesUTF8(str: string): number {
        return new TextEncoder().encode(str).length;
    }

    // --- WASM Imports Implementations ---

    private __assert_fail(condition: number, filename: number, line: number, func: number) {
        const condStr = this.UTF8ToString(condition);
        const fileStr = filename ? this.UTF8ToString(filename) : 'unknown filename';
        const funcStr = func ? this.UTF8ToString(func) : 'unknown function';
        this.abort(`Assertion failed: ${condStr}, at: ${fileStr}, ${line}, ${funcStr}`);
    }

    private __cxa_throw(ptr: number, type: number, destructor: number) {
        // Emscripten ExceptionInfo structure mapping
        // ptr is the thrown object pointer. Metadata is at ptr - 24.
        const infoPtr = ptr - 24;

        // Initialize native structure fields (offsets from original ExceptionInfo class)
        this.dataView.setUint32(infoPtr + 16, 0, true); // adjusted_ptr
        this.dataView.setUint32(infoPtr + 4, type, true); // type
        this.dataView.setUint32(infoPtr + 8, destructor, true); // destructor

        this.exceptionLast = ptr;
        this.uncaughtExceptionCount++;
        this.abort('Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.');
    }

    private __handle_stack_overflow(requested: number) {
        // In a real implementation, these would query the WASM exports
        const base = 0; // _emscripten_stack_get_base()
        const end = 0;  // _emscripten_stack_get_end()
        this.abort(`stack overflow (Attempt to set SP to ${this.ptrToString(requested)}, with stack limits [${this.ptrToString(end)} - ${this.ptrToString(base)}]). If you require more stack space build with -sSTACK_SIZE=<bytes>`);
    }

    // private __syscall_dup(fd: number): number {
    //     try {
    //         const old = this.SYSCALLS.getStreamFromFD(fd);
    //         return this.FS.dupStream(old).fd;
    //     } catch (e: any) {
    //         if (e.name === 'ErrnoError') return -e.errno;
    //         throw e;
    //     }
    // }

    private __syscall_unlinkat(dirfd: number, pathPtr: number, flags: number): number {
        return -28; // EINVAL
        // try {
        //     let path = this.SYSCALLS.getStr(pathPtr);
        //     path = this.SYSCALLS.calculateAt(dirfd, path);
        //     if (!flags) {
        //         this.FS.unlink(path);
        //     } else if (flags === 512) {
        //         this.FS.rmdir(path);
        //     } else {
        //         return -28; // EINVAL
        //     }
        //     return 0;
        // } catch (e: any) {
        //     if (e.name === 'ErrnoError') return -e.errno;
        //     throw e;
        // }
    }

    private _abort_js() {
        this.abort('native code called abort()');
    }

    private _localtime_js(time: bigint, tmPtr: number) {
        const timeNum = bigintToI53Checked(time);
        const date = new Date(timeNum * 1000);

        this.dataView.setInt32(tmPtr, date.getSeconds(), true);
        this.dataView.setInt32(tmPtr + 4, date.getMinutes(), true);
        this.dataView.setInt32(tmPtr + 8, date.getHours(), true);
        this.dataView.setInt32(tmPtr + 12, date.getDate(), true);
        this.dataView.setInt32(tmPtr + 16, date.getMonth(), true);
        this.dataView.setInt32(tmPtr + 20, date.getFullYear() - 1900, true);
        this.dataView.setInt32(tmPtr + 24, date.getDay(), true);

        // Calculate yday (simplified version of original ydayFromDate)
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const yday = Math.floor(diff / oneDay);

        this.dataView.setInt32(tmPtr + 28, yday, true);
        this.dataView.setInt32(tmPtr + 36, -(date.getTimezoneOffset() * 60), true);

        // DST Check (simplified)
        const summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
        const winterOffset = start.getTimezoneOffset();
        const dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) ? 1 : 0;
        this.dataView.setInt32(tmPtr + 32, dst, true);
    }

    private _tzset_js(timezone: number, daylight: number, std_name: number, dst_name: number) {
        const currentYear = new Date().getFullYear();
        const winter = new Date(currentYear, 0, 1);
        const summer = new Date(currentYear, 6, 1);
        const winterOffset = winter.getTimezoneOffset();
        const summerOffset = summer.getTimezoneOffset();

        const stdTimezoneOffset = Math.max(winterOffset, summerOffset);

        this.dataView.setInt32(timezone, stdTimezoneOffset * 60, true);
        this.dataView.setInt32(daylight, Number(winterOffset != summerOffset), true);

        const extractZone = (timezoneOffset: number) => {
            const sign = timezoneOffset >= 0 ? '-' : '+';
            const absOffset = Math.abs(timezoneOffset);
            const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
            const minutes = String(absOffset % 60).padStart(2, '0');
            return `UTC${sign}${hours}${minutes}`;
        };

        const winterName = extractZone(winterOffset);
        const summerName = extractZone(summerOffset);

        if (summerOffset < winterOffset) {
            this.stringToUTF8(winterName, std_name, 17);
            this.stringToUTF8(summerName, dst_name, 17);
        } else {
            this.stringToUTF8(winterName, dst_name, 17);
            this.stringToUTF8(summerName, std_name, 17);
        }
    }

    private clock_time_get(clk_id: number, ignored_precision: bigint, ptime: number): number {
        const ignored_precision_num = bigintToI53Checked(ignored_precision);

        if (!checkWasiClock(clk_id)) {
            return 28;
        }

        let now: number;
        // all wasi clocks but realtime are monotonic
        if (clk_id === 0) {
            now = _emscripten_date_now();
        } else if (nowIsMonotonic) {
            now = _emscripten_get_now();
        } else {
            return 52;
        }
        // "now" is in ms, and wasi times are in ns.
        const nsec = Math.round(now * 1000 * 1000);
        this.HEAP64[((ptime) >> 3)] = BigInt(nsec);
        checkInt64(nsec);
        return 0;
    }

    private emscripten_date_now(): number {
        return Date.now();
    }

    private emscripten_get_now(): number {
        return performance.now();
    }

    private emscripten_resize_heap(requestedSize: number): boolean | number {
        // NOTE: In JS, returning boolean to a C function expecting int usually works as 0/1.
        // Original code returns true/false, mapped to 1/0 in WASM usually.

        const oldSize = this.HEAPU8.length;
        requestedSize = requestedSize >>> 0;

        if (requestedSize <= oldSize) return false;

        const maxHeapSize = 2147483648; // 2GB limit from original
        if (requestedSize > maxHeapSize) {
            this.err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
            return false;
        }

        // Growth logic simplified from original
        for (let cutDown = 1; cutDown <= 4; cutDown *= 2) {
            let overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
            overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);

            // Align to 64KB (WASM page size)
            const alignment = 65536;
            const targetSize = Math.ceil(Math.max(requestedSize, overGrownHeapSize) / alignment) * alignment;
            const newSize = Math.min(maxHeapSize, targetSize);

            const pagesToAdd = ((newSize - oldSize) / 65536) | 0;

            try {
                this.wasmMemory.grow(pagesToAdd);
                this.updateMemoryViews(); // Critical: Update views after growth
                return true; // Success
            } catch (e) {
                // Continue to try smaller growth
            }
        }

        this.err(`Failed to grow the heap from ${oldSize} bytes to ${requestedSize} bytes, not enough memory!`);
        return false;
    }

    private getEnvStrings(): string[] {
        return [];
    }

    private _environ_get(__environ: number, environ_buf: number) {
        let bufSize = 0;
        let envp = 0;
        for (let string of this.getEnvStrings()) {
            var ptr = environ_buf + bufSize;
            this.HEAPU32[(((__environ) + (envp)) >> 2)] = ptr;
            bufSize += this.stringToUTF8(string, ptr, Infinity) + 1;
            bufSize += this.stringToUTF8(string, ptr, Infinity) + 1;
            envp += 4;
        }
        return 0;
    }

    private _environ_sizes_get(penviron_count: number, penviron_buf_size: number) {
        const strings = this.getEnvStrings();
        this.HEAPU32[((penviron_count) >> 2)] = strings.length;
        checkInt32(strings.length);
        let bufSize = 0;
        for (const string of strings) {
            bufSize += this.lengthBytesUTF8(string) + 1;
        }
        this.HEAPU32[((penviron_buf_size) >> 2)] = bufSize;
        checkInt32(bufSize);
        return 0;
    }

    private fd_close(fd: number): number {
        // try {
        //     const stream = this.SYSCALLS.getStreamFromFD(fd);
        //     this.FS.close(stream);
        //     return 0;
        // } catch (e: any) {
        //     if (e.name === 'ErrnoError') return e.errno;
        //     throw e;
        // }
        return 0;
    }

    private fd_seek(fd: number, offset: bigint, whence: number, newOffset: number): number {
        // const offsetNum = bigintToI53Checked(offset);
        // try {
        //     if (isNaN(offsetNum)) return 61; // EOVERFLOW
        //     const stream = this.SYSCALLS.getStreamFromFD(fd);
        //     const position = this.FS.llseek(stream, offsetNum, whence);
        //     this.dataView.setBigInt64(newOffset, BigInt(position), true);
        //     return 0;
        // } catch (e: any) {
        //     if (e.name === 'ErrnoError') return e.errno;
        //     throw e;
        // }
        return 0;
    }

    private fd_write(fd: number, iov: number, iovcnt: number, pnum: number): number {
        try {
            // const stream = this.SYSCALLS.getStreamFromFD(fd);

            // Mimic doWritev
            let ret = 0;
            for (let i = 0; i < iovcnt; i++) {
                const ptr = this.dataView.getUint32(iov, true);
                const len = this.dataView.getUint32(iov + 4, true);
                iov += 8;

                if (fd < 3) {
                    console.log(`FD[${fd}]: `, this.UTF8ToString(ptr, len).replace(/[ \r\n]$/g, ''));
                }
                const curr = len;

                // const curr = this.FS.write(stream, this.HEAPU8, ptr, len, undefined);
                if (curr < 0) return -1;
                ret += curr;
                if (curr < len) break;
            }

            this.dataView.setUint32(pnum, ret, true);
            return 0;
        } catch (e: any) {
            if (e.name === 'ErrnoError') return e.errno;
            throw e;
        }
    }
}