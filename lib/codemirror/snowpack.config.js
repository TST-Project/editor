// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    /* ... */
  },
  plugins: [
    /* ... */
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
/*  optimize: {
    bundle: false,
    minify: false,
    target: 'es2018',
    treeshake: true,
    entrypoints: ['cmwrapper.js']
  },
  */
  exclude: [
    '**/node_modules/**',
    '**/package.json',
    '**/snowpack.config.js',
    '**/*.lock'
  ],
};
