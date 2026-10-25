'use strict';
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const files={'assets/corpo-plaza-v2.png':'image/png','assets/corpo-undercroft-v5.png':'image/png','assets/rebecca-atlas-v2.png':'image/png','assets/smasher-atlas-v2.png':'image/png','assets/smasher-finish-v6.png':'image/png','assets/Rajdhani-SemiBold.ttf':'font/ttf'};
const encoded=Object.entries(files).map(([name,mime])=>[name,'data:'+mime+';base64,'+fs.readFileSync(path.join(__dirname,name)).toString('base64')]);
const embed=source=>{for(const [name,data] of encoded)source=source.split(name).join(data);return source;};
let html=read('index.html').replace('<link rel="stylesheet" href="styles.css">',()=>'<style>'+embed(read('styles.css'))+'</style>');
html=html.replace('<link rel="icon" href="assets/icon.svg" type="image/svg+xml">',()=>'<link rel="icon" href="data:image/svg+xml,'+encodeURIComponent(read('assets/icon.svg'))+'">');
let scripts='';
for(const name of ['engine.js','smasher-mode.js','sprites.js','effects.js','expansion.js','execution-fx.js','descent.js','audio.js','game.js']){
  html=html.replace(`<script src="${name}" defer></script>`,'');
  scripts+='<script>\n'+embed(read(name)).replace(/<\/script/gi,'<\\/script')+'\n</script>\n';
}
html=html.replace('</body>',()=>scripts+'</body>');
// Preserve the code license, asset exclusions and embedded font's OFL notice.
const notices=['LICENSE','NOTICES.md','assets/Rajdhani-OFL.txt'].map(name=>name+'\n\n'+read(name)).join('\n\n');
html=html.replace('<!doctype html>',()=>'<!doctype html>\n<!--\n'+notices.replace(/-->/g,'--&gt;')+'\n-->');
// Preserve saved launcher paths while shipping the V6 standalone entry point.
for(const name of ['丽贝卡-最后一枪-v6.html','丽贝卡-最后一枪-v5.html','丽贝卡-最后一枪-v4.html','丽贝卡-最后一枪-v3.1.html','丽贝卡-最后一枪-v3.html','丽贝卡-最后一枪-v2.html','丽贝卡-最后一闪.html']){
  fs.writeFileSync(path.join(__dirname,name),html);
}
console.log('Built offline V6: 9 scripts, 5 PNG assets, interactive execution and playable Smasher versus AI Rebecca.');
