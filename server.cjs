'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname, port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.md':'text/plain; charset=utf-8' };
const server = http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400);res.end('Bad request');return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403);res.end('Forbidden');return; }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405);res.end();return; }
  fs.stat(file,(err,stat) => {
    if(err || !stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method === 'HEAD')res.end();else{const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);}
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`Rebecca: Last Stand — http://127.0.0.1:${port}`));
server.on('error',err=>{console.error(err.code === 'EADDRINUSE' ? `Port ${port} is busy. Use another PORT or open the existing local server.` : err.message);process.exitCode=1;});
