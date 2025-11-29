/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import './sys';
import './text-encoder';
import './node-polyfill';
import './dom-parser';
import './early-window';
// import 'rrweb-cssom';
import './jsdom';
import './load-document'
import './jquery';
import 'jquery-ui/dist/jquery-ui.js';
import './jquery.dynatree';
import './form-submit';
import './lodash';

eval.call(globalThis, globalThis.__sys_document_script);
