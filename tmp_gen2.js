const fs = require('fs');
const si = require('simple-icons');
// Apps de streaming: glyph monocromático centralizado em fundo da marca.
// Tile 200x200 — glyph 24x24 escalado para 120x120, centralizado.
const apps = [
  { file:'netflix.svg',       icon:'siNetflix',       bg:'#000000', fg:'#E50914' },
  { file:'primevideo-icon.svg', icon:null, custom:true, bg:'#00A8E1', fg:'#fff', text:'prime', italic:true, sub:'video' },
  { file:'disneyplus-icon.svg', icon:null, custom:true, bg:'#113CCF', fg:'#fff', text:'Disney+', italic:false },
  { file:'hbomax.svg',        icon:'siHbomax',        bg:'#000000', fg:'#ffffff' },
  { file:'paramountplus.svg', icon:'siParamountplus', bg:'#0064FF', fg:'#ffffff' },
  { file:'appletv.svg',       icon:'siAppletv',       bg:'#000000', fg:'#ffffff' },
  { file:'starz.svg',         icon:'siStarz',         bg:'#000000', fg:'#ffffff' },
  { file:'dazn.svg',          icon:'siDazn',          bg:'#F8F8F5', fg:'#000000' },
  { file:'youtube.svg',       icon:'siYoutube',       bg:'#FF0000', fg:'#ffffff' },
];
for (const a of apps) {
  let inner;
  if (a.custom) {
    const family = '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';
    if (a.sub) {
      inner = `<text x="100" y="85" font-family="${family}" font-weight="900" font-size="56" fill="${a.fg}" text-anchor="middle" font-style="italic" textLength="170" lengthAdjust="spacingAndGlyphs">${a.text}</text>`
            + `<text x="100" y="135" font-family="${family}" font-weight="900" font-size="32" fill="${a.fg}" text-anchor="middle" letter-spacing="2" textLength="100" lengthAdjust="spacingAndGlyphs">${a.sub}</text>`;
    } else {
      inner = `<text x="100" y="115" font-family="${family}" font-weight="900" font-size="56" fill="${a.fg}" text-anchor="middle" dominant-baseline="middle" font-style="${a.italic?'italic':'normal'}" textLength="170" lengthAdjust="spacingAndGlyphs">${a.text}</text>`;
    }
  } else {
    const i = si[a.icon];
    if (!i) { console.log('MISSING', a.icon); continue; }
    // Center 24x24 glyph in 120x120 box at (40,40)
    inner = `<g transform="translate(40,40) scale(5)"><path d="${i.path}" fill="${a.fg}"/></g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${a.bg}"/>${inner}</svg>`;
  fs.writeFileSync('src/assets/brand-logos/'+a.file, svg);
  console.log('OK', a.file);
}
