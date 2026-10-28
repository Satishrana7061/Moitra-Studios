// GitHub Pages only knows files. Without this, a direct visit to /privacy-policy is served by
// 404.html: the page shows, but with a 404 status, and Google Play rejects such links. A copy of
// index.html in each route's folder makes those addresses answer 200.
const fs = require('fs');
const path = require('path');

const routes = [
  'privacy-policy', 'terms-of-service', 'contact-us', 'geopolitics', 'rajneeti',
  'indian-politics-game-home', 'pm-interview', 'prime-ministers-promises', 'rajneeti-tv-network',
];
const index = path.join('dist', 'index.html');
for (const route of routes) {
  const dir = path.join('dist', route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(index, path.join(dir, 'index.html'));
}
fs.copyFileSync(index, path.join('dist', '404.html'));
console.log(`static routes: ${routes.length} pages + 404.html`);
