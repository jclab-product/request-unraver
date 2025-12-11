import {EmscriptenRuntime} from './emscripten';
import { Engine } from './engine';
import {
    Walink,
    createWalinkFromInstance
} from 'walink';

export class Runtime {
    protected readonly walink!: Walink;

    static async fromFile(name: string, license: string, customInit?: (emscriptenRuntime: EmscriptenRuntime) => Promise<void>): Promise<Runtime> {
        const fs = await import('fs');
        const wasmBinary = await fs.promises.readFile(name);

        const emscriptenRuntime = new EmscriptenRuntime();
        emscriptenRuntime.logWriter = (msg) => console.log(msg);

        Object.assign(emscriptenRuntime.wasmImports, {
            '_ru_get_now': performance.now.bind(performance),
            '_ru_get_random': function (ptr: number, size: number) {
                const view = new Uint8Array(emscriptenRuntime.wasmMemory.buffer, ptr, size);
                crypto.getRandomValues(view);
            },
        })

        if (customInit) {
            await customInit(emscriptenRuntime);
        }

        await emscriptenRuntime.instantiate(wasmBinary);
        const runtime = new Runtime(emscriptenRuntime);
        await runtime.init(license);
        return runtime;
    }

    constructor(
        private readonly emscriptenRuntime: EmscriptenRuntime,
    ) {
        // Build walink helper bound to instantiated WASM instance
        this.walink = createWalinkFromInstance(emscriptenRuntime.instance);
    }

    private async init(licenseBase64: string): Promise<void> {
        const v = (this.emscriptenRuntime.exports['runtime_init'] as any)(this.walink.toWlString(licenseBase64));
        this.walink.decode(v);
    }

    async newEngine(mode: number): Promise<Engine> {
        const eng = new Engine(this.emscriptenRuntime);
        await eng.init(mode);
        return eng;
    }
}