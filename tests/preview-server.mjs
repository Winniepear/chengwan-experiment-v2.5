import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApi} from '../netlify/functions/lib/api-core.mjs';
import CONFIG from '../netlify/functions/lib/study-config.mjs';
import MANIFEST from '../netlify/functions/lib/material-manifest.mjs';
import {testDatabase} from './sqlite-test-adapter.mjs';
const db=testDatabase();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
// Fast gates/quota are strictly local test settings, never imported by production.
const previewConfig=structuredClone(CONFIG);
if(process.env.PREVIEW_FAST==='1') { previewConfig.base_min_seconds=1; previewConfig.post_min_seconds=1; previewConfig.comment_min_seconds=1; previewConfig.quota_per_condition=1; }
const handler=createApi({db,CONFIG:previewConfig,MANIFEST,env:{ADMIN_TOKEN:'local-test-only-not-a-production-token'},logger:console});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json'};
const port=Number(process.env.PREVIEW_PORT||8799);
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(url.pathname.startsWith('/api/')){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const b=Buffer.concat(chunks);
    const response=await handler(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:b}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  let p=url.pathname==='/'?'/index.html':url.pathname==='/admin'?'/admin.html':url.pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(p));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));
 }catch(e){res.writeHead(500);res.end(e.message);}
});
server.listen(port,'127.0.0.1',()=>console.log(`LOCAL TEST ONLY http://127.0.0.1:${port} — SQLite adapter; fast gates=${process.env.PREVIEW_FAST==='1'}. Never use for real participants.`));
process.on('SIGINT',()=>server.close(()=>{db.close();process.exit(0);}));
