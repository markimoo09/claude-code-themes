// T3 version of the cosmos scene (hooks/looks/cosmos.ts), made by string edits on its SVG.
//
// Nearly all of the original's size is ~860 small <circle>s: two star layers and the galaxy's
// arm and halo dots. Every circle is kept, but each one becomes a zero-length round-capped
// segment ("M x y h0") inside one <path> per colour, size and opacity bucket, about 9
// characters a star instead of ~60. Overlapping dots in one path no longer stack their
// opacity, which only shows as a slightly softer galaxy core. The three copies of the galaxy
// arms become <use>s of one copy.
//
// T3 draws a frosted chat column over x 392-1208 of the scene, so the black hole, the galaxy
// and the glints move out into the side margins, a little smaller. In T3 the scene always
// renders at about 8:5, so one placement replaces the original's aspect-ratio steps. The art,
// the animation and the prefers-reduced-motion rules are otherwise passed through unchanged.

const CIRCLE = /<circle cx=["']([-\d.]+)["'] cy=["']([-\d.]+)["'] r=["']([\d.]+)["'] fill=["'](#[0-9a-fA-F]+)["'] opacity=["']([\d.]+)["']\s*\/>/g

const trim = n => String(+n.toFixed(2)).replace(/^(-?)0\./, '$1.')

/**
 * Circles as one path per (fill, size, opacity) bucket. rStep and oStep set the buckets; each
 * bucket draws at its members' mean radius and opacity.
 */
function dots(circles, what, { rStep, oStep }) {
  const found = [...circles.matchAll(CIRCLE)]
  if (found.length === 0) throw new Error(`cosmos t3: no star circles found in ${what}`)
  const groups = new Map()
  for (const [, x, y, r, fill, o] of found) {
    const key = `${fill.toLowerCase()} ${Math.round(r / rStep)} ${Math.round(o / oStep)}`
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { fill: fill.toLowerCase(), r: 0, o: 0, d: '' }))
    g.r += +r
    g.o += +o
    const xy = `${Math.round(x)} ${Math.round(y)}`.replace(/ -/, '-')
    g.d += `M${xy}h0`
    g.n = (g.n ?? 0) + 1
  }
  let out = ''
  for (const g of groups.values()) {
    out += `<path stroke="${g.fill}" stroke-width="${trim((2 * g.r) / g.n)}" stroke-opacity="${trim(g.o / g.n)}" d="${g.d}"/>`
  }
  return { out, count: found.length }
}

function need(source, re, what) {
  const m = source.match(re)
  if (!m) throw new Error(`cosmos t3: expected ${what} in the scene source`)
  return m
}

// Subject placement in scene units. The chat area shows x 70-1530 of the scene in a full-width
// window and x 200-1400 with T3's sidebar open, so subjects sit in x 190-410 and 1190-1410.
// The hole's disk spans about +-213 x its scale across; the galaxy's arms about +-154 x its scale.
// The hole sits well left, by request: x 105-325 (the sidebar view trims its left end).
const HOLE = 'translate(215px, 300px) rotate(-14deg) scale(0.52)'
// The galaxy sits well right, by request, mirroring the hole: arms x 1274-1496 (the sidebar view
// trims their right end).
const GALAXY = 'translate(1385px, 690px) rotate(-28deg) scale(0.72, 0.3)'
// Glints: [original, T3]; the top one leaves the column, the side ones step inside the sidebar crop.
const GLINTS = [
  ['translate(1060 150)', 'translate(1270 130)'],
  ['translate(1480 330)', 'translate(1390 330)'],
  ['translate(190 700)', 'translate(250 700)'],
]

function place(svg, cls, transform) {
  const base = new RegExp(`(^|[\\s}])\\.${cls} \\{ transform:[^}]*\\}`)
  if (!base.test(svg)) throw new Error(`cosmos t3: expected a .${cls} { transform } rule in the scene's style`)
  const steps = new RegExp(`@media \\(max-aspect-ratio:[^)]*\\) \\{ \\.${cls} \\{[^}]*\\} \\}\\s*`, 'g')
  return svg.replace(steps, '').replace(base, `$1.${cls} { transform: ${transform}; }`)
}

export default function cosmosT3(source) {
  let svg = source

  // Subjects out from behind the chat column.
  svg = place(svg, 'hole', HOLE)
  svg = place(svg, 'galaxy', GALAXY)
  for (const [from, to] of GLINTS) {
    if (!svg.includes(from)) throw new Error(`cosmos t3: expected a glint at ${from}`)
    svg = svg.replace(from, to)
  }

  // Star layers in <defs>.
  for (const id of ['far', 'near']) {
    const [whole, inner] = need(svg, new RegExp(`<g id=["']${id}["']>([\\s\\S]*?)</g>`), `<g id="${id}"> star layer`)
    const { out } = dots(inner, `#${id}`, { rStep: 0.3, oStep: 0.1 })
    svg = svg.replace(whole, `<g id="${id}" stroke-linecap="round">${out}</g>`)
  }

  // Galaxy: one copy of the arms, reused three times; arm and halo dots as paths.
  const [armWhole, arms] = need(svg, /<g class=["']arm-wide["']>([\s\S]*?)<\/g>/, 'the arm-wide group')
  need(svg, /<g class=["']arm-mid["']>[\s\S]*?<\/g>/, 'the arm-mid group')
  need(svg, /<g class=["']arm-thin["']>[\s\S]*?<\/g>/, 'the arm-thin group')
  const armsShort = arms.replace(/-?\d+\.\d+/g, n => String(Math.round(n)))
  svg = svg.replace('</defs>', `<g id="ga">${armsShort}</g></defs>`)
  svg = svg.replace(armWhole, '<use href="#ga" class="arm-wide"/>')
  svg = svg.replace(/<g class=["']arm-mid["']>[\s\S]*?<\/g>/, '<use href="#ga" class="arm-mid"/>')
  svg = svg.replace(/<g class=["']arm-thin["']>[\s\S]*?<\/g>/, '<use href="#ga" class="arm-thin"/>')

  const [galWhole, galDots] = need(svg, /(?<=class=["']arm-thin["']\/>)([\s\S]*?)(?=<circle r=["']60["'])/, 'the galaxy dots before its core')
  const { out: galOut } = dots(galDots, 'the galaxy', { rStep: 0.5, oStep: 0.12 })
  svg = svg.replace(galWhole, `<g stroke-linecap="round">${galOut}</g>`)

  if (/<circle cx=/.test(svg.match(/<g id=["']far["'][\s\S]*?<circle r=["']60["']/)?.[0] ?? '')) {
    throw new Error('cosmos t3: unconverted star circles left over')
  }
  return stillSky(svg)
}

// ---------- a still sky ----------
//
// In T3 the scene's slow drift, galaxy turn, nebula pulse and meteor step a frame or two a
// second, which reads as jerky there. T3 gets a still sky instead: those stop, and a few stars
// brighten for a moment now and then, each on its own clock, plus the three glints.

// [x, y, size, seconds per cycle, delay]: mostly in the margins beside the chat column.
const TWINKLERS = [
  [120, 180, 3.2, 11, 0], [340, 90, 2.6, 14, 5], [150, 520, 2.8, 9, 3], [330, 640, 3, 16, 9],
  [110, 840, 2.6, 13, 7], [1450, 120, 3.2, 12, 2], [1235, 420, 2.6, 15, 8], [1480, 560, 3, 10, 4],
  [1250, 880, 2.8, 17, 11], [1420, 790, 2.6, 11, 6], [620, 60, 2.4, 19, 12], [990, 150, 2.4, 13, 1],
]

function stillSky(svg) {
  if (!svg.includes('</style>')) throw new Error('cosmos t3: expected a <style> block')
  const css = [
    '.drift-far,.drift-near,.galaxy-turn,.nebula,.breathe{animation:none!important}',
    '.nebula{opacity:.9}',
    '.meteor{display:none!important}',
    // The glints swell smoothly instead of in steps.
    '.twinkle{animation:glint 9s ease-in-out infinite!important}',
    '@keyframes glint{0%,100%{opacity:.55}50%{opacity:1}}',
    // A star rests dim, then flares and fades back within about a second and a half.
    '.ts{opacity:.3;animation:ts 12s ease-in-out infinite}',
    '@keyframes ts{0%,86%,100%{opacity:.3}92%{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.twinkle,.ts{animation:none!important}}',
  ].join('')
  const stars = TWINKLERS.map(([x, y, w, s, d]) =>
    `<path class="ts" d="M${x} ${y}h0" stroke="#eee9e0" stroke-width="${w}" stroke-linecap="round" style="animation-duration:${s}s;animation-delay:-${d}s"/>`,
  ).join('')
  return svg.replace('</style>', `${css}</style>`).replace(/<\/svg>\s*$/, `${stars}</svg>`)
}
