import sharp from "sharp";

await sharp("public/logo.svg")
  .resize(192, 192)
  .png()
  .toFile("public/pwa-192x192.png");

await sharp("public/logo.svg")
  .resize(512, 512)
  .png()
  .toFile("public/pwa-512x512.png");

console.log("✅ Icons generated!");