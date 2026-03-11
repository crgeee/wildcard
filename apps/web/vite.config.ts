import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment",
    jsxInject: `import { h, Fragment } from 'preact'`,
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "@wildcard/engine": resolve(__dirname, "../../packages/engine/pkg"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
