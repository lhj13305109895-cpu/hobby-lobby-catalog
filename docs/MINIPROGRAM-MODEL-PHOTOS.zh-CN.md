# 型号按钮透明照片

使用内置 image_gen 编辑已有真实产品照片，非 CLI。最终资源位于 `src/miniprogram/assets/models/`：`318-12.png`、`318-20.png`、`319-lemon.png`。构建时复制到小程序主包，保留透明 alpha，并通过 CSS 放大完整轮廓。网页商品图和完整目录图片保持原样。

318 1.2L 源图：`public/assets/catalogue/318-001.webp`；318 2.0L：`public/assets/318-2l-1794199819810.png`；319：用户提供的 `24B17309-381C-4D38-AC6B-8FF9ABA4B3A9.png` 柠檬花色。

最终提示词要点（每张独立编辑）：Remove ONLY the background and ground shadow, including the open space inside the handle. Preserve the exact product silhouette, lid, left spout, complete right handle, camera angle, printed artwork, brand markings and body colours. Genuine transparent-alpha PNG, centered, entire pot occupying about 94% of image height, no floor, no drop shadow, no baked checkerboard. 318 2.0L 另做一次针对性编辑：remove grey shadow/halo and scattered background speckles only; keep the pot unchanged。319 使用用户后续指定的柠檬照片替换最初字母款。

`scripts/optimize-miniprogram-model-icons.py` 仅对生成结果做前端资源缩放/编码，保留 alpha。
