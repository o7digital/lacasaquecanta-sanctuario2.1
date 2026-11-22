import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  outDir: './build',
  adapter: vercel(),
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    server: { allowedHosts: ['localhost', '127.0.0.1'] },
    // Bundle the sanitizer's complete CommonJS dependency graph. Vercel's
    // tracer cannot follow require() calls moved into Rolldown's ESM helper.
    ssr: { noExternal: process.argv.includes('build') ? ["dayjs", "dom-serializer", "domelementtype", "domhandler", "domutils", "entities", "escape-string-regexp", "htmlparser2", "is-plain-object", "launder", "nanoid", "parse-srcset", "picocolors", "postcss", "sanitize-html", "source-map-js"] : [] },
  },
});
