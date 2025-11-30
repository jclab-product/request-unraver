/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import * as textEncodings from 'text-encoding-polyfill';

global.TextEncoder = textEncodings.TextEncoder;
global.TextDecoder = textEncodings.TextDecoder;

__sys.overrideWindow.TextEncoder = TextEncoder;
__sys.overrideWindow.TextDecoder = TextDecoder;
