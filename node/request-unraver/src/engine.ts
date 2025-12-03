// _ru_get_now

import {EmscriptenRuntime} from "./emscripten";

export class Engine {
    static async fromFile(name: string): Promise<Engine> {
        const fs = await import('fs');
        const wasmBinary = await fs.promises.readFile(name);

        const emscriptenRuntime = new EmscriptenRuntime();

        Object.assign(emscriptenRuntime.wasmImports, {
            '_ru_get_now': performance.now,
        })

        await emscriptenRuntime.instantiate(wasmBinary);
        return new Engine(emscriptenRuntime);
    }

    constructor(
        protected readonly runtime: EmscriptenRuntime,
    ) {
    }

    public async init(): Promise<void> {
        this.runtime.exports['js_init']();
    }
}