/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

import {
 DOMParser
} from 'xmldom';

__sys.DOMParser = DOMParser;
__sys.overrideWindow.DOMParser = DOMParser;
globalThis.DOMParser = DOMParser;
