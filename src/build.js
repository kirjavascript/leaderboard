const esbuild = require('esbuild');
const path = require('path');

const statsPlugin = () => ({
    name: 'stats',
    setup(build) {
        build.onStart(() => {
            console.time('build time');
        });
        build.onEnd((result) => {
            if (result.metafile) {
                Object.entries(result.metafile.outputs).forEach(
                    ([file, { bytes }]) => {
                        const relPath = path.relative(
                            process.cwd(),
                            path.resolve(__dirname, file),
                        );

                        const i = Math.floor(Math.log(bytes) / Math.log(1024));
                        const humanBytes =
                            (bytes / Math.pow(1024, i)).toFixed(2) * 1 +
                            ['B', 'kB', 'MB', 'GB', 'TB'][i];
                        console.info(relPath, humanBytes);
                    },
                );
            } else {
                if ('errors' in result) {
                    console.info(
                        `build failed with ${result.errors.length} errors, ${result.warnings.length} warnings`,
                    );
                } else {
                    console.error(result);
                }
            }
            console.timeEnd('build time');
        });
    },
});

module.exports = (devMode) => {
    const config = {
        outdir: './static',
        entryPoints: {
            main: './web/main.jsx',
        },
        bundle: true,
        // sourcemap: devMode,
        minify: !devMode,
        platform: 'browser',
        format: 'iife',
        metafile: true,
        banner: {
            js: `'use strict';\n`,
        },
        plugins: [
            statsPlugin(),
        ],
        define: {
            __DEV__: String(devMode),
            __REACT_DEVTOOLS_GLOBAL_HOOK__: '{ "isDisabled": true }',
        },
    };

    if (devMode) {
        esbuild.context(config).then(ctx => ctx.watch()).catch(console.error);
    } else {
        esbuild.build(config).catch(console.error);
    }
};
