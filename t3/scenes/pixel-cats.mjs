// T3 version of the pixel-cats scene (hooks/looks/pixel-cats.ts), made by string edits on its SVG.
//
// The original places the cats and the window with one CSS rule set per aspect-ratio band. In
// T3 the scene is a center/cover background drawn at its own 1600×1000 shape, so only the 16:10
// band ever applies, and a frosted panel covers about x 392–1208 behind the chat column (see
// lib.mjs). This swaps the banded rules for one fixed layout: the 16:10 band's floor line, scale
// and window, with the cats moved into the side margins:
//   - Pixel left, his shadow ending just short of the panel, his body inside x 200–392 so it
//     stays in view with the sidebar open; his tail curls off toward x ~105.
//   - Charlie left until his tail tip meets the panel's edge.
// The cats' shadows, tails, blinks and reduced-motion rules live in their groups and the rest of
// the <style>, which pass through unchanged.

const T = 'pixel-cats t3'

// Where each cat reaches, in its group's units at scale 1 (the group's origin is its body's left
// edge, base u = 0). Measured from the drawn scene; they follow PIXEL.scale and CHARLIE.scale.
const PIXEL_RIGHT = 217 // the right edge of Pixel's floor shadow, (15 + 27) × 1.15 × 4.5
const CHARLIE_LEFT = -64 // the tip of Charlie's tail at its farthest swing

const PANEL_LEFT = 392
const PANEL_RIGHT = 1208

// The aspect ratio T3 draws the scene at.
const ASPECT = 1.6

const TRANSFORM = /translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)\s*scale\(\s*([\d.]+)\s*\)/

/** The `.name { transform: … }` rule in a block of CSS, as numbers. */
function rule(css, name, where) {
  const m = css.match(new RegExp(`\\.${name}\\s*\\{\\s*transform:\\s*([^;}]*);?\\s*\\}`))
  if (!m) throw new Error(`${T}: no .${name} transform rule in ${where}`)
  const t = m[1].match(TRANSFORM)
  if (!t) throw new Error(`${T}: .${name} transform in ${where} is not translate(x, y) scale(s)`)
  return { x: +t[1], y: +t[2], s: +t[3], text: m[1].trim() }
}

export default function pixelCatsT3(source) {
  // The banded layout: base rules for .pixel, .charlie and .window, then @media aspect bands.
  const LAYOUT = /\.pixel\s*\{[^}]*\}\s*\.charlie\s*\{[^}]*\}\s*\.window\s*\{[^}]*\}(?:\s*@media\s*\(\s*max-aspect-ratio:\s*\d+\s*\/\s*\d+\s*\)\s*\{(?:[^{}]*\{[^}]*\})*\s*\})*/
  const found = source.match(LAYOUT)
  if (!found) throw new Error(`${T}: no .pixel/.charlie/.window layout rules with aspect-ratio bands in the scene's <style>`)
  const layout = found[0]

  // The rules that apply at 16:10: the base set, overridden by each band, in order, that matches.
  const baseEnd = layout.search(/@media/)
  let active = { css: baseEnd < 0 ? layout : layout.slice(0, baseEnd), where: 'the base layout rules' }
  const bands = [...layout.matchAll(/@media\s*\(\s*max-aspect-ratio:\s*(\d+)\s*\/\s*(\d+)\s*\)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)]
  for (const [, n, d, css] of bands) {
    if (ASPECT <= n / d + 1e-9) active = { css, where: `the max-aspect-ratio ${n}/${d} band` }
  }
  const pixel = rule(active.css, 'pixel', active.where)
  const charlie = rule(active.css, 'charlie', active.where)
  const win = rule(active.css, 'window', active.where)

  const pixelX = PANEL_LEFT - 2 - PIXEL_RIGHT * pixel.s
  const charlieX = PANEL_RIGHT - 8 - CHARLIE_LEFT * charlie.s
  const f = n => String(Math.round(n))
  const fixed = [
    `.pixel { transform: translate(${f(pixelX)}px, ${pixel.y}px) scale(${pixel.s}); }`,
    `.charlie { transform: translate(${f(charlieX)}px, ${charlie.y}px) scale(${charlie.s}); }`,
    `.window { transform: ${win.text}; }`,
  ].join(' ')

  const svg = source.replace(layout, fixed)
  for (const cls of ['pixel', 'charlie', 'window']) {
    if (!new RegExp(`<g class=["']${cls}["']>`).test(svg)) throw new Error(`${T}: no <g class="${cls}"> in the scene`)
  }
  if (!/prefers-reduced-motion/.test(svg)) throw new Error(`${T}: the scene's prefers-reduced-motion rule is missing`)
  return svg
}
