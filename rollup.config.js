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

const extensions = [".js", ".ts"];

const additionalFiles = () => [
  "./_site/css/bundle.css",
  ...fg.sync("./_site/css/*.svg"),
  ...fg.sync("./_site/css/*.ttf"),
  ...fg.sync("./_site/img/*.svg"),
  ...fg.sync("./_site/img/**/*.ico"),
];

export default (commandLineArgs) => {
  const debug = commandLineArgs.configDebug;
  return [
    {
      input: "src/js/index.ts",
      output: [
        {
          file: pkg.main,
          format: "iife",
          plugins: debug ? [] : [terser()],
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
          outputStyle: debug ? undefined : "compressed",
        }),
        debug
          ? undefined
          : copy({
            targets: [
              {
                src: "node_modules/@xenial-io/xenial-template/src/css/*.woff",
                dest: "./_site/css",
              },
              {
                src:
                  "node_modules/@xenial-io/xenial-template/src/css/*.woff2",
                dest: "./_site/css",
              },
              {
                src: "node_modules/@xenial-io/xenial-template/src/css/*.ttf",
                dest: "./_site/css",
              },
              {
                src: "node_modules/@xenial-io/xenial-template/src/css/*.svg",
                dest: "./_site/css",
              },
              {
                src: "node_modules/@xenial-io/xenial-template/src/img/**/*",
                dest: "./_site/img",
              },
            ],
          }),
        debug
          ? undefined
          : copy({
            targets: [
              {
                src: "src/img",
                dest: "./_site",
              },
              {
                src: "src/downloads",
                dest: "./_site",
              },
            ],
            flatten: false,
          }),
        debug
          ? undefined
          : gzipPlugin({
            additionalFiles: additionalFiles(),
          }),
        debug
          ? undefined
          : gzipPlugin({
            additionalFiles: additionalFiles(),
            customCompression: (content) =>
              brotliCompressSync(Buffer.from(content)),
            fileName: ".br",
          }),
        debug ? undefined : filesize(),
      ],
    },
  ];
};
