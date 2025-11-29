import snakeCase from 'lodash.snakecase';

const lodash = {};

lodash.snakeCase = snakeCase;

globalThis.window._ = lodash;
globalThis._ = lodash;
