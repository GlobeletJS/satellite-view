import resolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: 'stamen/main.js',
    plugins: [
      resolve(),
    ],
    output: {
      file: 'stamen/main.min.js',
      format: 'iife',
      name: 'stamen',
    },
  }
];
