# License scope and third-party notices / 许可范围与第三方说明

## Original code: MIT / 原创代码：MIT

Copyright (c) 2026 HCOOKIEie. The original software code in this project is
licensed under the MIT License in [LICENSE](LICENSE). This includes the
JavaScript game logic, rendering and procedural audio code (`*.js`), build,
server and publishing scripts (`*.cjs`), tests (`tests/*.cjs`), HTML structure,
CSS, package configuration and `开始游戏.cmd`.

This code license does not cover the non-code materials listed below, even
when they are embedded in source files or generated HTML. These exclusions
do not add restrictions to the MIT-licensed code itself. Preserve the MIT
copyright and permission notice when redistributing the code or substantial
portions of it. Contributions remain subject to their authors' rights and
any applicable separately identified licenses.

本项目的原创代码采用 MIT 许可证，包括战斗逻辑、渲染、程序合成音效、
构建和发布脚本、测试、HTML 结构、CSS、包配置及启动脚本。
下文列出的非代码内容，即使嵌入源码或离线 HTML，也不在 MIT 授权范围内。
这不影响 MIT 对代码本身授予的使用权。再分发代码或其重要部分时，须保留
LICENSE 中的版权与许可声明。

## Characters, setting and brands / 角色、世界观与品牌

Rebecca, Adam Smasher, Lucy, Cyberpunk, Cyberpunk: Edgerunners, Night City,
Guts, Sandevistan and other referenced characters, designs, names, settings,
logos and trademarks belong to their respective rights holders. No license
to these franchise elements is granted by this repository or its MIT License.
This is an unofficial fan project, not approved, sponsored or endorsed by
CD PROJEKT RED, TRIGGER, Netflix or other associated rights holders.

丽贝卡、亚当·重锤、露西，以及相关角色造型、世界观、名称、标志和商标等，
权利归各自权利人。本仓库和 MIT 许可证均不授予这些原作元素的使用许可。
这是非官方同人项目，未获上述公司或相关权利人的认可、赞助或背书。

## Artwork and other non-code content / 美术及其他非代码内容

The images under `assets/` (including the PNG character atlases and scene
backgrounds, and `icon.svg`), cover art, screenshots, portraits, in-game story
text/dialogue and other visual or narrative content are excluded from the
MIT code license. Some visuals are drawn procedurally; the drawing code is
MIT-licensed, but this does not grant rights to the depicted franchise designs.
No separate artwork or narrative-content license is granted here. Any reuse
must respect applicable rights and any separately obtained permissions.

Artwork was produced with generative AI assistance; it is not official
production art or a transfer of the underlying franchise rights. See
`assets/ART_DIRECTION*.md` for production notes and reference information.
Code and some text were also made with generative AI assistance. The project
does not include sampled music, voice acting or sound recordings from the
anime/game; `audio.js` synthesizes sound locally and its original code is MIT.

角色图集、场景、图标、封面、截图、头像和剧情对白等非代码内容不采用 MIT，
这里也不另行授予美术或剧情内容许可。程序绘图的代码仍采用 MIT，
但这不包含对画面中原作造型的授权。AI 辅助生成也不代表获得了原作角色或品牌的权利。
音效由程序在本地合成，未使用原作音乐、配音或录音采样。

## Third-party font: Rajdhani / 第三方字体

`assets/Rajdhani-SemiBold.ttf` is Rajdhani SemiBold.

Copyright (c) 2014, Indian Type Foundry (info@indiantypefoundry.com).

The font is licensed under the SIL Open Font License, Version 1.1, **not MIT**.
Its complete supplied license and copyright notice are preserved unchanged
in [assets/Rajdhani-OFL.txt](assets/Rajdhani-OFL.txt). Keep that notice and
license with redistributed or embedded copies of the font. Font modifications
and redistribution remain governed by the OFL, including its naming and
standalone-sale conditions. Other fonts resolved from the user's operating
system are not distributed by this project.

Rajdhani 字体继续使用 SIL OFL 1.1 许可证，不改为 MIT。再分发或内嵌字体时，
须保留其版权声明和完整 OFL，修改和分发也须遵守 OFL。系统回退字体没有随项目分发。

## Distribution / 分发

Keep `LICENSE`, this notice and `assets/Rajdhani-OFL.txt` with source releases.
The standalone builder embeds these notices in an HTML comment so they travel
with the embedded font and code. A bundled game therefore contains materials
with different rights; it is not wholly MIT-licensed.

分发源码时，须附上上述许可和说明。单文件构建会将它们写入 HTML 注释。
游戏中的代码、素材和字体各有许可范围，不能把整个游戏及其素材统称为 MIT。
