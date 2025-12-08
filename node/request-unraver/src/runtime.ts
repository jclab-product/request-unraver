import {EmscriptenRuntime} from './emscripten';
import { Engine } from './engine';

export class Runtime {
    static async fromFile(name: string): Promise<Runtime> {
        const fs = await import('fs');
        const wasmBinary = await fs.promises.readFile(name);

        const emscriptenRuntime = new EmscriptenRuntime();

        Object.assign(emscriptenRuntime.wasmImports, {
            '_ru_get_now': performance.now.bind(performance),
            '_ru_get_random': function (ptr: number, size: number) {
                const view = new Uint8Array(emscriptenRuntime.wasmMemory.buffer, ptr, size);
                crypto.getRandomValues(view);
            },
        })

        await emscriptenRuntime.instantiate(wasmBinary);
        return new Runtime(emscriptenRuntime);
    }

    constructor(
        private readonly emscriptenRuntime: EmscriptenRuntime,
    ) {}

    async newEngine(mode: number): Promise<Engine> {
        const eng = new Engine(this.emscriptenRuntime);
        await eng.init(mode);
        return eng;
    }
}