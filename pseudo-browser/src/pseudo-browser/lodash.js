import snakeCase from 'lodash.snakecase';

const lodash = {};

lodash.snakeCase = snakeCase;

global.window._ = lodash;
global._ = lodash;
