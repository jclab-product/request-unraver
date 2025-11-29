/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import * as textEncodings from 'text-encoding-polyfill';

globalThis.TextEncoder = textEncodings.TextEncoder;
globalThis.TextDecoder = textEncodings.TextDecoder;
