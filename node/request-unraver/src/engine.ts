import {EmscriptenRuntime} from './emscripten';
import {
    type WlValue,
    Walink,
    createWalinkFromInstance,
} from 'walink';
import {
    ConstructorOptions as JSDOMConstructorOptions
} from 'jsdom';

export class Engine {
    protected walink!: Walink;
    protected engineHandle: WlValue | null = null;

    constructor(
        protected readonly runtime: EmscriptenRuntime,
    ) {
    }

    // Initialize walink helper and create Engine instance inside WASM.
    public async init(mode: number): Promise<void> {
        // Build walink helper bound to instantiated WASM instance
        this.walink = createWalinkFromInstance(this.runtime.instance);

        const v = (this.runtime.exports['engine_new'] as any)(this.walink.toWlUint32(mode));
        this.walink.decode(v);
        this.engineHandle = v as bigint;
    }

    public async cleanup(): Promise<boolean> {
        if (!this.engineHandle) return false;
        if (typeof this.runtime.exports['engine_cleanup'] !== 'function') {
            throw new Error('wasm export engine_cleanup not found');
        }
        const res = (this.runtime.exports['engine_cleanup'] as any)(this.engineHandle);
        // decode boolean
        return this.walink.fromWlBool(res);
    }

    public hasTimers(): boolean {
        if (!this.engineHandle) return false;
        const fn = this.runtime.exports['engine_has_timers'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_has_timers not found');
        }
        const res = (fn as any)(this.engineHandle);
        return this.walink.fromWlBool(res);
    }

    public hasPendingJobs(): boolean {
        if (!this.engineHandle) return false;
        const fn = this.runtime.exports['engine_has_pending_jobs'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_has_pending_jobs not found');
        }
        const res = (fn as any)(this.engineHandle);
        return this.walink.fromWlBool(res);
    }

    // Evaluate JS code inside the engine.
    // Returns decoded result (object/string/primitive) or throws on error.
    public jsEval(code: string): any {
        if (!this.engineHandle) throw new Error('engine not initialized');
        const fn = this.runtime.exports['engine_js_eval'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_js_eval not found');
        }

        const raw = (fn as any)(this.engineHandle, this.walink.toWlString(code));

        // raw === 0 indicates undefined/null as per wasm binding; handle early
        if (!raw) return undefined;

        // Decode using walink. If result is an error tag, walink.decode will throw.
        return this.walink.decode(raw);
    }

    public createWindow(content?: string | null, windowOptions?: JSDOMConstructorOptions | null): WlValue {
        if (!this.engineHandle) throw new Error('engine not initialized');

        const fn = this.runtime.exports['engine_create_window'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_js_eval not found');
        }

        const raw = (fn as any)(
            this.engineHandle,
            content ? this.walink.toWlString(content) : 0n,
            windowOptions ? this.walink.toWlMsgpack(windowOptions) : 0n,
        ) as WlValue;
        this.walink.decode(raw);
        return raw;
    }

    public destroyWindow(wlWindow: WlValue): boolean {
        const fn = this.runtime.exports['engine_destroy_window'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_destroy_window not found');
        }
        const raw = fn(this.engineHandle, wlWindow);
        return this.walink.fromWlBool(raw);
    }

    public useJquery(window: WlValue): WlValue {
        if (!this.engineHandle) throw new Error('engine not initialized');

        const fn = this.runtime.exports['engine_use_jquery'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_use_jquery not found');
        }

        const ret = (fn as any)(
            this.engineHandle,
            window,
        ) as WlValue;

        this.walink.decode(ret);

        return ret;
    }

    public browserEval(window: WlValue, content: string, params?: any): any {
        if (!this.engineHandle) throw new Error('engine not initialized');

        const fn = this.runtime.exports['engine_browser_eval'];
        if (typeof fn !== 'function') {
            throw new Error('wasm export engine_js_eval not found');
        }

        const raw = (fn as any)(
            this.engineHandle,
            window,
            content ? this.walink.toWlString(content) : 0n,
            params ? this.walink.toWlMsgpack(params) : 0n,
        );
        if (!raw) {
            return null;
        }
        return this.walink.decode(raw);
    }
}