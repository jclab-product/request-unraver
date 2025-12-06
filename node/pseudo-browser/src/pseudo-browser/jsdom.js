/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import { JSDOM } from 'jsdom';
__sys.JSDOM = JSDOM;
__sys.createWindow = function(content, windowOptions) {
    const result = new JSDOM(content || '', windowOptions);
    // 'crypto' override not working
    Object.assign(result.window, __sys.overrideWindow);
    return new Proxy(result.window, {
        set(target, p, newValue, receiver) {
            target[p] = newValue;
            global[p] = newValue;
        }
    });
}
