import * as process from 'node:process';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

global.FinalizationRegistry = class FinalizationRegistry {
    register() {}
    unregister() {}
}

global.process = process;
