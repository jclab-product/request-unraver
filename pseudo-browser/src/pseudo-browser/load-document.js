/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import * as cheerio from 'cheerio';

(function () {
    const early$ = cheerio.load(__sys_document_source);
    global.__sys_document_script = early$('script:not([src])').html();

    const dom = new JSDOM(__sys_document_source, {
        url: __sys_document_url,
        // referrer: __sys_document_referrer,
        contentType: "text/html",
        includeNodeLocations: true,
        storageQuota: 10000000,
    });

    Object.assign(dom.window, __sys.overrideWindow);
    global.window = dom.window;
    global.self = global.window;
    Object.assign(global, global.window);
})();
