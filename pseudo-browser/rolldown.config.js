import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// import { createRequire } from 'node:module';
import path from 'path';
import nodePolyfills from '@rolldown/plugin-node-polyfills';

const __dirname = dirname(fileURLToPath(import.meta.url));
// const require = createRequire(import.meta.url);

const polyfillNames = [
    "assert",
    // "async_hooks",
    // "buffer",
    // "bufferutil",
    // "canvas",
    // "child_process",
    // "console",
    // "crypto",
    // "diagnostics_channel",
    // "dns",
    "events",
    // "fs",
    // "fs/promises",
    // "http",
    // "http2",
    // "https",
    // "net",
    "os",
    "path",
    // "perf_hooks",
    "querystring",
    // "sqlite",
    "stream",
    "string_decoder",
    // "timers",
    // "tls",
    "tty",
    "url",
    // "utf-8-validate",
    "util",
    // "util/types",
    "vm",
    // "worker_threads",
    "zlib",
];
const moduleNames = [
    'buffer',
    'crypto',
    'fs',
    // 'events',
    // 'stream',
    // 'rrweb-cssom',
    'xml-name-validator',
    // 'vm',
    'http-proxy-agent',
    'https-proxy-agent',
    'undici',
];

/** @type {(name: string) => import('rolldown').RolldownOptions} */
const commonOptions = (name) => ({
    platform: 'node',
    external: [
        ...[...moduleNames].filter(v => v !== name),
        'canvas',
        'ws', // ref: undici?
        'undici', // ref: cheerio
    ],
})

/** @type {Array<import('rolldown').RolldownOptions>} */
const options = [
    // ...polyfillNames.map(name => ({
    //     ...commonOptions(name),
    //     input: {
    //         [name]: path.join(__dirname, 'src', name),
    //     },
    //     output: {
    //         format: 'cjs',
    //         dir: path.join(__dirname, 'dist/modules'),
    //         entryFileNames: `[name].js`,
    //     },
    //     plugins: [
    //         nodePolyfills(),
    //     ]
    // })),
    // {
    //     ...commonOptions(null),
    //     input: {
    //         ...polyfillNames.reduce((out, name) => {
    //             out[name] = path.join(__dirname, 'src', name);
    //             return out;
    //         }, {}),
    //     },
    //     output: {
    //         format: 'cjs',
    //         // dir: path.join(__dirname, 'dist/modules'),
    //         // entryFileNames: `[name].js`,
    //         file: path.join(__dirname, `dist/modules/[name].js`),
    //         inlineDynamicImports: true,
    //         advancedChunks: false,
    //     },
    //     plugins: [
    //         nodePolyfills(),
    //     ]
    // },
    ...polyfillNames.map((name) => ({
        ...commonOptions(null),
        input: path.join(__dirname, 'src', name),
        output: {
            format: 'cjs',
            file: path.join(__dirname, `dist/modules/${name}.js`),
            inlineDynamicImports: true,
        },
        plugins: [
            nodePolyfills(),
        ],
        // resolve: {
        //     alias: {
        //         'buffer': 'buffer/',
        //         'events': 'events/',
        //     }
        // }
    })),
    ...moduleNames.map(name => ({
        ...commonOptions(name),
        input: {
            [name]: path.join(__dirname, 'src', name),
        },
        output: {
            format: 'cjs',
            dir: path.join(__dirname, 'dist/modules'),
            entryFileNames: `[name].js`,
        },
        resolve: {
            alias: {
                'buffer': 'buffer/',
                'events': 'events/',
                'fs': 'browserify-fs',
                'crypto': 'crypto-browserify',
            }
        }
    })),
    {
        ...commonOptions(null),
        input: {
            'pseudo-browser': path.join(__dirname, 'src/pseudo-browser/index.js'),
        },
        output: {
            format: 'cjs',
            dir: path.join(__dirname, 'dist'),
            entryFileNames: `[name].js`,
        },
        plugins: [
            nodePolyfills(),
        ]
    }
];
export default options;