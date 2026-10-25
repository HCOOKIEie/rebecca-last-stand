'use strict';
// Produce a minimal browser build and a curated source tree for publication.
// Existing directories are never deleted; only the named generated files are replaced.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,out=path.join(root,'output','publish');
const runtime=['engine.js','smasher-mode.js','sprites.js','effects.js','expansion.js','execution-fx.js','descent.js','audio.js','game.js'];
const assets=['corpo-plaza-v2.png','corpo-undercroft-v5.png','rebecca-atlas-v2.png','smasher-atlas-v2.png','smasher-finish-v6.png','Rajdhani-SemiBold.ttf','Rajdhani-OFL.txt','icon.svg','ART_DIRECTION.md','ART_DIRECTION_V2.md','ART_DIRECTION_V5.md','ART_DIRECTION_V6.md'];
const sourceFiles=['index.html','styles.css',...runtime,'package.json','build-standalone.cjs','prepare-publish.cjs','server.cjs','README.md','PRODUCT.md','DESIGN.md','DIRECTION.md','PUBLISHING.md','.gitignore','.nojekyll','开始游戏.cmd',...assets.map(n=>'assets/'+n),'tests/engine.test.cjs','tests/smasher-mode.test.cjs'];
function write(name,content){const p=path.join(out,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);return p;}
for(const name of sourceFiles)write('github/'+name,fs.readFileSync(path.join(root,name)));
const standalone=fs.readFileSync(path.join(root,'丽贝卡-最后一枪-v6.html'));
write('itch/index.html',standalone);
const manifest={version:require('./package.json').version,githubOwner:'HCOOKIEie',repository:'rebecca-last-stand',sourceFiles:sourceFiles.map(name=>({path:name,bytes:fs.statSync(path.join(root,name)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')})),itchEntry:'itch/index.html',itchBytes:standalone.length,aiDisclosure:['Graphics','Code','Text & Dialog'],sensitiveOrLocalFilesIncluded:false};
write('manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({directory:out,sourceFiles:sourceFiles.length,itchEntry:path.join(out,'itch','index.html'),itchBytes:standalone.length}));
