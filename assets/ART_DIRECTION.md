# 美术来源与生成记录

场景文件：`memorial-plaza.png`。

生成方式：内置 `image_gen.imagegen`，2026-10-22。素材已复制到项目；运行时不调用生成服务。

角色、武器、车辆与战斗特效：`sprites.js` 和 `game.js` 中自制的 Canvas 像素色块，不依赖下载的角色图。

## 场景最终提示词

Use case: stylized-concept. Asset type: single wide 16:9 background plate for a 2D side-scrolling pixel-art fan game inspired by the final episode of Cyberpunk Edgerunners. Create beautiful detailed SNES/modern indie pixel art, designed on a 640x360 pixel grid with crisp hard square pixels and carefully controlled dithering, no smooth painting. Scene: Night City's Corpo Plaza memorial park glass rooftop plaza, the site of Rebecca and Adam Smasher's encounter, beneath enormous oppressive brutalist corporate skyscrapers. Camera is side-on at platform height. Broad open glass and dark metal platform occupies bottom 18 percent of frame, perfectly horizontal playable floor at 82 percent height; geometric glass panels, glowing restrained cyan seams, metal railing behind. The background: towering angular Arasaka corporate structures, red illuminated minimal abstract corporate signs, many thin lit windows, distant smoky city, warm burnt-orange dusk sky peeking between immense dark teal high-rise buildings. Small groups of trees in memorial planters visible in middle distance. Large center gap between structures leaves clear airspace for a falling boss; layered depth and cinematic sense of scale. Palette: deep petrol blue, muted blue gray, warm rust, teal cyan highlights, tiny red warning beacons and pale yellow windows. Mood: tense final showdown, evocative and atmospheric. Restrained high contrast foreground, legible gameplay area. No characters, no people, no vehicles in foreground, no UI, no words, no titles, no watermarks. Rich environmental pixel art, not a screenshot of an interface. Make exactly one cohesive landscape image.

## 显示方式

原图保留完整质量。游戏渲染时先缩放到 480×270 背景缓冲画布，再用最近邻放大到 960×540，与动画精灵共用像素化视觉。Canvas 上额外绘制与碰撞面严格对齐的平台边缘。
