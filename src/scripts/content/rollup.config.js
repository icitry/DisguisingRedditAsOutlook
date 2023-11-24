import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss'
import scss from 'rollup-plugin-scss'
import preprocess from 'svelte-preprocess';

export default {
  // This `main.js` file we wrote
  input: 'src/main.js',
  output: {
    // The destination for our bundled JavaScript
    file: 'public/build/bundle.js',
    // Our bundle will be an Immediately-Invoked Function Expression
    format: 'iife',
    // The IIFE return value will be assigned into a variable called `app`
    name: 'app',
  },
  plugins: [
    svelte({
      preprocess: [
        preprocess({
          preprocess: preprocess(),
          postcss: true,
        }),
      ],
      // Tell the svelte plugin where our svelte files are located
      include: 'src/**/*.svelte',
    }),
    scss({ fileName: 'bundle.css' }),
    // Tell any third-party plugins that we're building for the browser
    resolve({ browser: true }),
  ],
};