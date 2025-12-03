import {Engine} from './engine';

(async () => {
    const engine = await Engine.fromFile('../../cmake-build-debug/dist/quickjs-api.wasm');
    await engine.init();
})();