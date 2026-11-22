// Precache the compiled public JS/CSS graph, so a first-visit bookmark does
// not depend on the browser having fetched its module chunks a second time.
// Admin documents and API responses are never included.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = '.vercel/output/static';
const list = await readdir(path.join(output,'_astro'),{recursive:true});
const assets = list.filter(name => /\.(js|css)$/.test(name)).map(name => '/_astro/' + name.split(path.sep).join('/'));
const source = await readFile('public/sw.js','utf8');
const worker = source.replace('const BUILD_ASSETS = [];',`const BUILD_ASSETS = ${JSON.stringify(assets)};`);
await Promise.all([writeFile(path.join(output,'sw.js'),worker),writeFile('build/client/sw.js',worker)]);
console.log(`Prepared offline shell with ${assets.length} public script/style assets.`);
