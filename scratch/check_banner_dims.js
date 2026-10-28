const fs = require('fs');

const files = [
  'client/public/premium_hero_milk_banner.png',
  'client/public/desktop_hero_banner_clean.png',
  'client/public/hero_banner_card.png',
  'client/public/sub_hero_banner.png',
  'client/public/user_uploaded_cropped_hero.png',
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const buf = fs.readFileSync(f);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    console.log(`${f}: ${w}x${h}, size: ${buf.length}`);
  }
});
