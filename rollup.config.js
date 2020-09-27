import pkg from "./package.json";

import fg from "fast-glob";
import { brotliCompressSync } from "zlib";

import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import scss from "rollup-plugin-scss";
import copy from "rollup-plugin-copy";
import { terser } from "rollup-plugin-terser";
import gzipPlugin from "rollup-plugin-gzip";
import filesize from "rollup-plugin-filesize";

const extensions = [".js", ".jsx", ".ts", ".tsx"];
const additionalFiles = () => [
  "./_site/css/bundle.css",
  ...fg.sync("./_site/css/*.svg"),
  ...fg.sync("./_site/css/*.ttf"),
  ...fg.sync("./_site/img/*.svg"),
  ...fg.sync("./_site/img/**/*.png"),
  ...fg.sync("./_site/img/**/*.ico"),
];

export default [
  {
    input: "src/js/index.ts",
    output: [
      {
        file: pkg.main,
        format: "iife",
        // plugins: [terser()],
      },
    ],
    external: [],
    plugins: [
      resolve({ extensions }),
      commonjs(),
      babel({
        extensions,
        exclude: "node_modules/**",
      }),
      scss({
        output: "_site/css/bundle.css",
        outputStyle: "compressed",
      }),
      copy({
        targets: [
          {
            src: "node_modules/@xenial-io/ src/css/*.woff",
            dest: "./_site/css",
          },
          {
            src: "node_modules/@xenial-io/xenial-template/dist/css/*.woff2",
            dest: "./_site/css",
          },
          {
            src: "node_modules/@xenial-io/xenial-template/dist/css/*.ttf",
            dest: "./_site/css",
          },
          {
            src: "node_modules/@xenial-io/xenial-template/dist/css/*.svg",
            dest: "./_site/css",
          },
          {
            src: "node_modules/@xenial-io/xenial-template/dist/img/**/*",
            dest: "./_site/img",
          },
          {
            src: "src/img/**/*",
            dest: "./_site/img",
          },
          {
            src: "src/downloads/**/*",
            dest: "./_site/downloads",
          },
        ],
      }),
      // gzipPlugin({
      //   additionalFiles: additionalFiles(),
      // }),
      // gzipPlugin({
      //   additionalFiles: additionalFiles(),
      //   customCompression: (content) =>
      //     brotliCompressSync(Buffer.from(content)),
      //   fileName: ".br",
      // }),
      filesize(),
    ],
  },
];
