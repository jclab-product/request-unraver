import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// import { createRequire } from 'node:module';
import path from 'path';

import nodePolyfills from '@rolldown/plugin-node-polyfills';
import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';

const customResolver = resolve({
    extensions: ['.mjs', '.js', '.jsx', '.json', '.sass', '.scss']
});

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
    "process",
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
    'http',
    'https',
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
        'http', // ref: ? -> rolldown-plugin-node-polyfills
        'https',
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
            alias({
                entries: [
                    {
                        find: /^.+XMLHttpRequest-impl(\.js)?$/,
                        replacement: path.resolve(__dirname, 'src/jsdom/XMLHttpRequest-impl.js')
                    },
                    {
                        find: /^.+WebSocket-impl(\.js)?$/,
                        replacement: path.resolve(__dirname, 'src/jsdom/WebSocket-impl.js')
                    },
                ],
                // customResolver: async function(source, importer, options) {
                //     // source: string,
                //     // 	importer: string | undefined,
                //     // 	options: { attributes: Record<string, string>; custom?: CustomPluginOptions; isEntry: boolean }
                //     console.log('customResolver : ', customResolver);
                //     source = path.resolve(__dirname, 'src/jsdom/XMLHttpRequest-impl.js');
                //     const output = await customResolver['resolveId'].handler(source, importer, options);
                //     console.log('customResolver: ', arguments, ' :: ', output);
                //     return output;
                // }
            })
        ]
    }
];
export default options;