// T3 version of the pixel-cats scene (hooks/looks/pixel-cats.ts), made by string edits on its SVG.
//
// The original places its two corners with one CSS rule set per aspect-ratio band. In T3 the
// scene is a center/cover background drawn at its own 1600×1000 shape, and a frosted panel
// covers about x 392–1208 behind the chat column (see lib.mjs). This swaps the banded rules for
// one fixed layout, a little smaller than the original's 16:10 band so each corner fits beside
// the panel:
//   - the left corner (the bookshelf, the lamp, Pixel and his yarn) with Pixel's body ending
//     just short of the panel, the shelf and the yarn in view with the sidebar open, the
//     hanging plant out toward the window's edge;
//   - the right corner (the window, the cat tree, Charlie) starting just past the panel, so
//     Charlie and the window stay in view with the sidebar open.
// The animations, the rest of the <style>, and the room pass through unchanged.

const T = 'pixel-cats t3'

// [x, y, scale]: each corner's origin in scene units. The left corner's origin is Pixel's
// body's left edge, 53 art pixels (4.5 scene units each) wide at scale 1; the right corner's is
// the middle of the cat tree's base, with the curtains reaching 50 art pixels left of it.
const PLACES = {
  left: [200, 870, 0.8],
  right: [1404, 870, 0.8],
}

export default function pixelCatsT3(source) {
  // The banded layout: base rules for .left and .right, then @media aspect bands.
  const LAYOUT = /\.left\s*\{[^}]*\}\s*\.right\s*\{[^}]*\}(?:\s*@media\s*\(\s*max-aspect-ratio:\s*\d+\s*\/\s*\d+\s*\)\s*\{(?:[^{}]*\{[^}]*\})*\s*\})*/
  const found = source.match(LAYOUT)
  if (!found) throw new Error(`${T}: no .left/.right layout rules with aspect-ratio bands in the scene's <style>`)

  const fixed = Object.entries(PLACES)
    .map(([name, [x, y, s]]) => `.${name}{transform:translate(${x}px,${y}px) scale(${s})}`)
    .join('')
  const svg = source.replace(found[0], fixed)
  for (const cls of Object.keys(PLACES)) {
    if (!new RegExp(`<g class=["']${cls}["']>`).test(svg)) throw new Error(`${T}: no <g class="${cls}"> in the scene`)
  }
  if (!/prefers-reduced-motion/.test(svg)) throw new Error(`${T}: the scene's prefers-reduced-motion rule is missing`)
  return svg
}
