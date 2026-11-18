/**
 * [INPUT]: designs、public 与已构建 dist 静态文件。
 * [OUTPUT]: 仅监听回环地址的本地设计预览服务。
 * [POS]: 样页独立预览入口，不提供应用文件与网络代理能力。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('../',import.meta.url));
const roots={'/designs/':'designs','/public/':'public','/ClaudeBar-docs/':'dist'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.md':'text/markdown','.txt':'text/plain','.wasm':'application/wasm'};
const port=Number(process.env.DESIGNS_PORT??4324);
http.createServer(async(req,res)=>{
  try{
    let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(url==='/')url='/designs/index.html';
    const prefix=Object.keys(roots).find(p=>url.startsWith(p));
    if(!prefix){res.writeHead(404);return res.end('Not found');}
    const root=path.join(base,roots[prefix]);let file=path.resolve(root,url.slice(prefix.length));
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
    if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
    const resolved=await fs.realpath(file);
    if(!resolved.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
    res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`ClaudeBar design preview: http://127.0.0.1:${port}/designs/`));
