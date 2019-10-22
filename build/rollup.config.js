import resolve from 'rollup-plugin-node-resolve';
//import glslify from "rollup-plugin-glslify";
import { glsl } from "./glsl-plugin.js";
import pkg from "../package.json";

export default {
  input: 'src/main.js',
  plugins: [
    //glslify({
    //  basedir: 'src/shaders/old',
    //}),
    glsl(),
    resolve(),
  ],
  output: {
    file: pkg.main,
    //sourcemap: 'inline',
    format: 'esm',
    name: pkg.name
  }
};
