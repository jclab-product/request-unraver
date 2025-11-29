/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import * as cheerio from 'cheerio';

(function () {
    const early$ = cheerio.load(__sys_document_source);
    globalThis.__sys_document_script = early$('script:not([src])').html();

    const dom = new JSDOM(__sys_document_source, {
        url: __sys_document_url,
        // referrer: __sys_document_referrer,
        contentType: "text/html",
        includeNodeLocations: true,
        storageQuota: 10000000,
    });

    Object.assign(dom.window, __sys.overrideWindow);
    globalThis.window = dom.window;
    globalThis.self = globalThis.window;
    Object.assign(globalThis, globalThis.window);
})();
