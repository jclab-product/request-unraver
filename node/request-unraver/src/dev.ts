import {Runtime, Engine} from './';
import * as fs from 'fs';

(async () => {
    try {
        const runtime = await Runtime.fromFile('../../cmake-build-debug/dist/request-unraver-wasm.wasm');
        const engine = await runtime.newEngine(14587050);

        const wlWindow = engine.createWindow('', {
            url: 'https://www.google.com',
        });

        console.log('wlWindow : ', BigInt.asUintN(64, wlWindow).toString(16));

        // console.log('useJquery');
        // engine.useJquery(wlWindow);

        console.log('cryptoJS');
        engine.browserEval(wlWindow,
            'try { '+
            fs.readFileSync('./samples/cryptoJS.js', { encoding: 'utf-8' }) +
            '\n} catch(e) { console.log("error:", e, e.stack); }\n'
            );

        console.log('vestobj');
        engine.browserEval(wlWindow, fs.readFileSync('./samples/vestobj.js', { encoding: 'utf-8' }));
        // engine.browserEval(wlWindow, 'Array.prototype.toString = Object.prototype.toString; console.log("test-a"); const a = new ArrayBuffer(64); __sys.overrideWindow.crypto.getRandomValues(a); console.log("a : ", a[0]);');
        // engine.browserEval(wlWindow, 'console.log("test-b"); const a = new Uint8Array(64); __sys.overrideWindow.crypto.getRandomValues(a); console.log("b : ", a);');
        console.log('httpajax');
        engine.browserEval(wlWindow,
            'try { '+
            fs.readFileSync('./samples/httpAjax.js', { encoding: 'utf-8' }) +
            '\n} catch(e) { console.log("error:", e, e.stack); }\n'
        );


        // const out = engine.browserEval(wlWindow, 'console.log("VestAjaxJson : ", JSON.stringify(window.VestAjaxJson(\'{"hello": "world"}\')));');
        const out = engine.browserEval(wlWindow, 'return window.VestAjaxJson(\'{"hello": "world"}\')');
        console.log('out : ', out);
    } catch (e) {
        console.error(e);
    }
})();