import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

// Only the explicitly named test Worker is ever deployed by this helper.
if (!process.env.TEST_ADMIN_PASSWORD) throw new Error('Set TEST_ADMIN_PASSWORD securely in environment settings before deploying the test environment.');
if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('Cloudflare API token is missing.');
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
 const response = await fetch('https://api.cloudflare.com/client/v4/accounts', { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
 if (!response.ok) throw new Error('Cannot resolve the Cloudflare account from the API token.');
 const payload = await response.json();
 if (!payload.success || !Array.isArray(payload.result) || payload.result.length !== 1 || typeof payload.result[0]?.id !== 'string') {
  throw new Error('Set CLOUDFLARE_ACCOUNT_ID because the API token does not identify exactly one accessible Cloudflare account.');
 }
 process.env.CLOUDFLARE_ACCOUNT_ID = payload.result[0].id;
 console.log('Resolved the Cloudflare account automatically because the token has exactly one accessible account.');
}
const config = 'wrangler.test.jsonc';
const parsed = JSON.parse(await readFile(config, 'utf8'));
if (parsed.name !== 'vagontakip-test' || parsed.vars.STORAGE_MODE !== 'local' || parsed.vars.MAINTENANCE_ENABLED !== 'true' || parsed.vars.GITHUB_REPOSITORY || parsed.vars.GITHUB_DATABASE_PATH) throw new Error('Test deployment isolation check failed.');
function run(args, input, env = process.env) {
 return new Promise((resolve,reject)=> {
  const child=spawn(process.execPath,args,{stdio:[input===undefined?'ignore':'pipe','inherit','inherit'],env});
  if(input!==undefined) child.stdin.end(input);
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Test deployment command failed.')));
 });
}
await run(['node_modules/typescript/bin/tsc','--noEmit']);
await run(['node_modules/vite/bin/vite.js','build'],undefined,{...process.env,VITE_TEST_ENVIRONMENT:'true'});
await run(['scripts/build-sw.mjs']);
await run(['scripts/wrangler.mjs','deploy','--config',config]);
// Keep an existing session secret across deployments; never change live secrets.
const cli=await import('node:child_process');
const secrets = await new Promise((resolve,reject)=> {
 const child=cli.spawn(process.execPath,['scripts/wrangler.mjs','secret','list','--config',config],{stdio:['ignore','pipe','pipe']});let out='';child.stdout.on('data',b=>out+=b);child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error('Cannot inspect test secret names.')));
});
const bindings={ADMIN_PASSWORD:process.env.TEST_ADMIN_PASSWORD};
if(!secrets.includes('"SESSION_SECRET"')) bindings.SESSION_SECRET=randomBytes(48).toString('base64url');
await run(['scripts/wrangler.mjs','secret','bulk','--config',config],JSON.stringify(bindings));
console.log('Test Worker deployed with isolated storage and secret bindings. Existing test accounts keep their passwords; change them through Account after first login.');
