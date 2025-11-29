import { Buffer } from 'buffer';

globalThis.Buffer = Buffer;

globalThis.FinalizationRegistry = class FinalizationRegistry {
    register() {}
    unregister() {}
}
