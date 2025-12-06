/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import jQueryOrig from 'jquery';

__sys.useJQuery = function (window) {
    const factory = jQueryOrig(window);
    window.jQuery = factory;
    window.$ = factory;
    return factory;
}

// jQueryOrig.css = function (elem, type2, extra) {
// }
// jQueryOrig.fn.css = function () {
//     if (arguments.length === 1 && typeof arguments[0] === 'string') {
//         return "";
//     }
//     return this;
// };
// jQueryOrig.style = (elem, type, value, extra) => {
// }
// jQueryOrig.fn.progressbar = function () {
// };
// jQueryOrig.fn.dialog = function () {
// };
//
// const jQuery = new Proxy(jQueryOrig, {
//     apply(target, thisArg, argArray) {
//         const selector = argArray[0];
//         if (typeof selector === 'function') {
//             __sys.readyListeners.push(selector);
//             return;
//         }
//         const jqElement = target.apply(thisArg, argArray);
//         jqElement.width = function () {
//             if (arguments.length > 0) {
//                 return this;
//             }
//             return 0;
//         };
//         jqElement.height = function () {
//             if (arguments.length > 0) {
//                 return this;
//             }
//             return 0;
//         };
//         // jqElement.dynatree = function () {};
//         jqElement.tabs = function () {
//         };
//         return jqElement;
//     }
// });
//
// global.jQuery = jQuery;
// global.$ = jQuery;
// global.window.jQuery = jQuery;
// global.window.$ = jQuery;
