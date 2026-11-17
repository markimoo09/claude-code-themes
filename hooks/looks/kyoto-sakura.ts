import type { Look } from './types'

import { makeColors } from '../make-colors.js'
import { Art, GW, H, PX, SCRIM, type Spot, W, hash, layout, px, scrimGradient, seeded, skyBands, visible } from './pixel'

// Kyoto in spring, drawn as pixel art, on a bright clear day. On the right a vermilion
// three-storey pagoda towers on the temple hillside: white plaster and lattice windows between
// vermilion posts, studded doors, clustered brackets under every eave, gold rafter ends, dark
// tiled roofs with rows of rounded tile ends whose eaves sweep up at the tips to gold bells,
// railed balconies, and a tall dark spire of nine rings under a gold jewel; lit from the upper
// left, with shadow under each eave. Spring-green trees and blossoming cherries crowd round its
// foot. Cherry branches, dense with five-petalled blossom on dark twisting wood, arch in from
// the top-left corner and climb the left side, over a temple hall's tiled roof, its lattice and
// its wooden terrace railing. Behind, a forested hill and paler ridges under a blue sky with
// crisp white cumulus. Petals drift down, the clouds drift slowly, and now and then a bird
// crosses. A light theme: warm white surfaces, the deep sakura pink as the accent.
//
// The landscape is drawn in 5-unit art pixels like the other looks; the buildings, the blossom,
// the leaves and the clouds on a finer grid of 2.5 units, so they carry twice the detail.
const { theme, problems } = makeColors({
  label: 'Kyoto sakura',
  only: 'light',
  roles: {
    accent: '#c23a6e',
    danger: '#c0392b',
    success: '#3f8f3a',
    warning: '#b7861a',
    pro: '#6f55c0',
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f2ecee',
        'surface-1': '#f7f2f4',
        'surface-2': '#fcf9fa',
        'surface-3': '#fcf9fa',
        'text-primary': '#2a2026',
        'text-secondary': '#54444c',
        'text-muted': '#6a5a62',
      },
    },
  },
})

// The finer grid: scene units to a fine art pixel, and its wrapper (like px()).
const F = 2.5
const fine = (inner: string, cls?: string): string => `<g${cls === undefined ? '' : ` class="${cls}"`} transform="scale(${F})">${inner}</g>`

// The row, in 5-unit art pixels, of the pagoda's foot on the hillside.
const PAGODA = 160

// ---------- textures ----------
//
// Patterns, in fine art pixels, for the surfaces drawn many times over: tile channels and rounded
// tile ends, bracket clusters, rafter ends, balusters, window bars, studded doors, stone, wood.
// Most come lit (the side facing the sun, to the upper left), plain and in shade.

type Cell = [number, number, string, number?, number?]

const pattern = (id: string, w: number, h: number, base: string, cells: Cell[]): string =>
  `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${base === '' ? '' : `<path fill="${base}" d="M0 0h${w}v${h}h-${w}z"/>`}${cells
    .map(([x, y, fill, cw = 1, ch = 1]) => `<path fill="${fill}" d="M${x} ${y}h${cw}v${ch}h-${cw}z"/>`)
    .join('')}</pattern>`

// Three tones of a pattern: [suffix, base, highlight, mid, dark].
const toned = (id: string, make: (b: string, hi: string, mid: string, lo: string) => [number, number, string, Cell[]], tones: [string, string, string, string, string][]): string =>
  tones
    .map(([suffix, b, hi, mid, lo]) => {
      const [w, h, base, cells] = make(b, hi, mid, lo)

      return pattern(id + suffix, w, h, base, cells)
    })
    .join('')

const ROOF_TONES: [string, string, string, string, string][] = [
  ['l', '#8a8e9e', '#c2c6d2', '#6e7282', '#4e505c'],
  ['', '#565866', '#7a7e8c', '#484a56', '#2e3038'],
  ['d', '#34363f', '#4a4c56', '#2c2e36', '#1e1f26'],
]
const RED_TONES: [string, string, string, string, string][] = [
  ['l', '#f05a3a', '#ffa078', '#d8442c', '#5a1a14'],
  ['', '#d2402a', '#f47a50', '#b8341f', '#3a1210'],
  ['d', '#a42e1e', '#c84a30', '#8a2418', '#2a0e0c'],
]

const PATTERNS = [
  // Tile channels: rounded ridges of tile with a course line every third row.
  toned('tile', (b, hi, mid, lo) => [4, 3, b, [[0, 0, hi, 1, 3], [3, 0, lo, 1, 3], [1, 2, mid, 2]]], ROOF_TONES),
  // Rounded tile ends along the eave.
  toned('tend', (b, hi, mid, lo) => [4, 3, lo, [[1, 0, mid, 2], [0, 1, hi], [1, 1, b, 2], [3, 1, mid], [1, 2, mid, 2]]], ROOF_TONES),
  // Bracket clusters: three blocks on an arm with gilded ends, on a block, gaps dark.
  toned('tokyo', (b, hi, mid, lo) => [10, 8, lo, [[0, 0, hi, 2], [4, 0, hi, 2], [8, 0, hi, 2], [0, 1, b, 2], [4, 1, b, 2], [8, 1, b, 2], [0, 2, '#e8b84a'], [1, 2, hi, 8], [9, 2, '#e8b84a'], [0, 3, mid, 10], [3, 4, hi, 4], [3, 5, b, 4, 2]]], RED_TONES.slice(1)),
  // Rafter ends: gilded squares in the dark under the eave.
  pattern('raft', 4, 3, '#3a2024', [[0, 0, '#fff2b0'], [1, 0, '#f2c84a'], [0, 1, '#e0b040'], [1, 1, '#b88a2a']]),
  // Balusters, with gaps to see through.
  pattern('bal', 5, 1, '', [[0, 0, '#f47a50'], [1, 0, '#a83020']]),
  // Window bars.
  pattern('renji', 3, 1, '#2a1416', [[0, 0, '#c84a30'], [1, 0, '#8a2a1c']]),
  // A vermilion door, panelled, with gold studs.
  pattern('door', 4, 4, '#c83a24', [[0, 0, '#7a2216', 4], [0, 1, '#7a2216', 1, 3], [2, 2, '#f0c040']]),
  // Stone courses.
  pattern('stone', 10, 5, '#c4bab2', [[0, 0, '#968c86', 10], [0, 1, '#968c86', 1, 2], [5, 3, '#968c86', 1, 2], [2, 1, '#ded6d0', 2]]),
  // Wood grain for the terrace railing.
  pattern('wood', 1, 3, '#9a6a44', [[0, 2, '#7a5034']]),
  pattern('hbal', 8, 1, '', [[0, 0, '#c08a5a'], [1, 0, '#8a5a3a']]),
  // Leaf texture for the clumps of spring green, lit and in shade.
  pattern('leaf', 4, 3, '#86c656', [[0, 0, '#b2e070', 2], [2, 1, '#5a9a40'], [1, 2, '#74b64a', 2]]),
  pattern('leafd', 4, 3, '#5a9a44', [[0, 0, '#7ab84e', 2], [2, 1, '#3e7a38'], [1, 2, '#4e8c3e', 2]]),
  // The forested hill, in 5-unit pixels.
  pattern('woods', 4, 3, '#4c8a4e', [[0, 0, '#5e9c58'], [2, 1, '#5e9c58'], [1, 2, '#3e7a44']]),
].join('')

// ---------- drawing helpers (fine pixels) ----------

const INK = '#2a1a20'

// A dark outline round every filled cell of `a`, in the cells around it.
function outline(a: Art, [x0, y0, x1, y1]: [number, number, number, number], ink = INK): Art {
  const o = new Art()

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!a.has(x, y) && (a.has(x + 1, y) || a.has(x - 1, y) || a.has(x, y + 1) || a.has(x, y - 1))) {
        o.set(x, y, ink)
      }
    }
  }

  return o
}

// A part drawn into its own Art, then written with its outline (none if `ink` is empty).
function part(box: [number, number, number, number], draw: (a: Art) => void, ink = INK): string {
  const a = new Art()

  draw(a)

  return (ink === '' ? '' : outline(a, box, ink).svg()) + a.svg()
}

// One row from x0 to x1 in [lit, plain, shade]: lit at the left, in shade at the right. On
// curved surfaces (`soft`) the borders step a cell on alternate rows so the light falls off softly.
function shade(a: Art, y: number, x0: number, x1: number, f: readonly [string, string, string], lit = 0.25, dark = 0.35, soft = false): void {
  const w = x1 - x0 + 1
  const step = soft ? y & 1 : 0
  const l = Math.max(1, Math.round(w * lit) + step)
  const d = Math.max(1, Math.round(w * dark) + step)

  a.rect(x0, y, w, 1, f[1])
  a.rect(x0, y, l, 1, f[0])
  a.rect(x1 - d + 1, y, d, 1, f[2])
}

const TILE = ['url(#tilel)', 'url(#tile)', 'url(#tiled)'] as const
const TILE_END = ['url(#tendl)', 'url(#tend)', 'url(#tendd)'] as const
const TOKYO = ['url(#tokyo)', 'url(#tokyo)', 'url(#tokyod)'] as const
const RED = ['#f05a3a', '#d2402a', '#a42e1e'] as const
const PLASTER = ['#fdf8f0', '#eee5d8', '#cfc3b6'] as const
const BRONZE = ['#8a7a70', '#4e4440', '#2e2826'] as const
const GOLD = ['#fff0a0', '#f0c040', '#b88a20'] as const

// A vermilion post, 4 wide: highlight, body, body, shadow (darker in the shaded part).
function post(a: Art, x: number, top: number, bottom: number, dark: boolean): void {
  const h = bottom - top + 1

  a.rect(x, top, 4, h, dark ? '#a83020' : '#d8442c')
  a.rect(x, top, 1, h, dark ? '#c84a30' : '#ff8a60')
  a.rect(x + 3, top, 1, h, dark ? '#6a1a12' : '#9a2a1c')
}

// A tiled roof seen from the front: its eave line at row y, `eave` half-wide at the tips (which
// sweep up), narrowing in a concave curve over `rows` rows to `top` half-wide; tile ends along
// the eave, tile channels above, outlined crisply, a gold bell at each tip.
function roof(a: Art, y: number, top: number, eave: number, rows: number, curl = 12, cx = 0): void {
  for (let x = -eave; x <= eave; x++) {
    const ax = Math.abs(x)
    let r = 0

    while (r < rows && top + (eave - top) * (1 - (r + 1) / rows) ** 1.8 >= ax) {
      r++
    }
    const tip = Math.max(0, (ax - (eave - curl * 2.4)) / (curl * 2.4))
    const lift = Math.round(tip * tip * curl)
    const bottom = y - lift
    const upper = Math.min(y - Math.max(r, 1), bottom - 4)
    const side = x < -eave * 0.3 ? 0 : x > eave * 0.35 ? 2 : 1

    a.rect(cx + x, upper, 1, bottom - upper + 1, TILE[side])
    a.rect(cx + x, bottom - 2, 1, 3, TILE_END[side])
  }
  for (const s of [-1, 1]) {
    const x = cx + s * (eave - 3)
    const tip = Math.max(0, (eave - 3 - (eave - curl * 2.4)) / (curl * 2.4))
    const bottom = y - Math.round(tip * tip * curl)

    a.rect(x, bottom + 1, 2, 1, GOLD[2])
    a.rect(x, bottom + 2, 2, 3, s < 0 ? GOLD[0] : GOLD[1])
    a.set(x + (s < 0 ? 1 : 0), bottom + 4, GOLD[2])
  }
}

// ---------- sprites, drawn once in <defs> and placed with <use> ----------

// A cluster of cherry blossom, about 30 by 22 fine pixels round its origin: flowers crowded on a
// scalloped backing of pink, lit from the upper left. Tones: [petal, highlight, centre, backing,
// edge].
type Bloom = readonly [string, string, string, string, string]

function blossom(id: string, t: Bloom, seed: number): string {
  const back = new Art()

  for (let y = -10; y <= 10; y++) {
    for (let x = -15; x <= 15; x++) {
      if (Math.hypot(x / 13, y / 8.5) <= 0.8 + 0.25 * hash(Math.floor(x / 3), Math.floor(y / 3), seed)) {
        back.set(x, y, y > 3 || x > 6 ? t[4] : t[3])
      }
    }
  }
  // Flowers scattered over it, each a cross of petals round a dark heart, brighter toward the
  // upper left, the brightest petal its upper-left one.
  const flowers = new Art()

  for (let i = 0; i < 22; i++) {
    const fx = Math.round((hash(i, 1, seed) - 0.5) * 24)
    const fy = Math.round((hash(i, 2, seed) - 0.5) * 14)

    if (!back.has(fx - 1, fy) || !back.has(fx + 1, fy) || !back.has(fx, fy - 1) || !back.has(fx, fy + 1)) {
      continue
    }
    const petal = fx + fy < 4 ? t[1] : t[0]

    flowers.set(fx, fy - 1, petal)
    flowers.set(fx - 1, fy, petal)
    flowers.set(fx + 1, fy, t[0])
    flowers.set(fx, fy + 1, t[0])
    flowers.set(fx, fy, t[2])
  }

  return `<g id="${id}">${outline(back, [-17, -12, 17, 12], t[4]).svg()}${back.svg()}${flowers.svg()}</g>`
}

// A clump of spring leaves, about 46 by 26 fine pixels round its origin: leaf-textured, its top
// edge lit, its lower part in shade, outlined. Tones: [rim, unused, texture, lower texture, edge].
type Leaf = readonly [string, string, string, string, string]

function leaves(id: string, t: Leaf, seed: number): string {
  const m = new Art()

  for (let y = -13; y <= 13; y++) {
    for (let x = -24; x <= 24; x++) {
      if (Math.hypot(x / 22, y / 11.5) <= 0.78 + 0.26 * hash(Math.floor(x / 3), Math.floor(y / 3), seed)) {
        m.set(x, y, '1')
      }
    }
  }
  const a = new Art()

  for (let y = -13; y <= 13; y++) {
    for (let x = -24; x <= 24; x++) {
      if (!m.has(x, y)) {
        continue
      }
      a.set(x, y, !m.has(x, y - 1) ? t[0] : y > 4 ? t[3] : t[2])
    }
  }

  return `<g id="${id}">${outline(m, [-26, -15, 26, 15], t[4]).svg()}${a.svg()}</g>`
}

const SPRITES =
  blossom('fl', ['#ffdce8', '#ffffff', '#e0608e', '#f6b6cc', '#d27a9e'], 3) +
  blossom('fs', ['#e8a2c0', '#f8cadc', '#b8406e', '#d488aa', '#a25a80'], 7) +
  leaves('gl', ['#d6f08e', '', 'url(#leaf)', 'url(#leafd)', '#3a7234'], 11) +
  leaves('gs', ['#8ec45a', '', 'url(#leafd)', 'url(#leafd)', '#2e5e2e'], 13)

const use = (id: string, x: number, y: number): string => `<use href="#${id}" x="${x}" y="${y}"/>`

// Overlapping clusters in an ellipse round (cx, cy), fine pixels: those in shade behind, the
// plain ones next, those on the top and the left in front.
function mass(cx: number, cy: number, rx: number, ry: number, seed: number, ids: [string, string, string], step: [number, number] = [24, 14]): string {
  const layers = ['', '', '']

  for (let j = -ry; j <= ry; j += step[1]) {
    for (let i = -rx; i <= rx; i += step[0]) {
      const x = i + Math.round((hash(i, j, seed) - 0.5) * 10) + (Math.round(j / step[1]) % 2 === 0 ? 0 : step[0] / 2)
      const y = j + Math.round((hash(j, i, seed) - 0.5) * 5)

      if ((x / rx) ** 2 + (y / ry) ** 2 > 1) {
        continue
      }
      const k = y < -ry * 0.25 || x < -rx * 0.45 ? 2 : y > ry * 0.3 || x > rx * 0.5 ? 0 : 1

      layers[k] += use(ids[k === 2 ? 0 : k === 1 ? 1 : 2], cx + x, cy + y)
    }
  }

  return layers.join('')
}

const BLOOMS: [string, string, string] = ['fl', 'fl', 'fs']
const GREENS: [string, string, string] = ['gl', 'gl', 'gs']
const SPARSE: [number, number] = [36, 18]

// Branches, as crisp-edged shapes rather than pixel runs (a thick limb would cost a run on every
// row): each segment between two [x, y, radius] points a quad, a disc at each joint and tip where
// the limb is thick enough to show one, and, under the thicker limbs, a lit copy a pixel up and
// left that shows as a rim of light along their upper-left edges.
type Knot = [number, number, number]

function branches(limbs: Knot[][]): string {
  const f = (n: number): string => Math.round(n).toString()
  const shape = (dx: number, dy: number, min: number): string =>
    limbs
      .map(points =>
        points
          .map(([x, y, r], i) => {
            const next = points[i + 1]
            const disc = r >= 2 ? `M${f(x + dx - r)} ${f(y + dy)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 -${f(r * 2)} 0` : ''

            if (next === undefined || r < min) {
              return r < min ? '' : disc
            }
            const [x2, y2, r2] = next
            const len = Math.hypot(x2 - x, y2 - y) || 1
            const [nx, ny] = [-(y2 - y) / len, (x2 - x) / len]
            const w2 = Math.max(r2, 0.6)

            return `${disc}M${f(x + dx + nx * r)} ${f(y + dy + ny * r)}L${f(x2 + dx + nx * w2)} ${f(y2 + dy + ny * w2)}L${f(x2 + dx - nx * w2)} ${f(y2 + dy - ny * w2)}L${f(x + dx - nx * r)} ${f(y + dy - ny * r)}z`
          })
          .join(''),
      )
      .join('')

  return `<path fill="#7a5258" d="${shape(-1, -1, 3)}"/><path fill="#3e2428" d="${shape(0, 0, 0)}"/>`
}

// ---------- sky ----------

// A clear spring blue, deep overhead, paling toward the hills.
const SKY: readonly [number, string][] = [
  [0, '#3a86d4'],
  [18, '#4590da'],
  [36, '#529ce0'],
  [54, '#62a8e6'],
  [72, '#74b4ec'],
  [90, '#88c0f0'],
  [106, '#9ccbf3'],
  [120, '#b2d7f6'],
  [132, '#c6e1f8'],
]

// Crisp cumulus on the fine grid: round billows on a flat base, white on top, shaded in bands
// toward the base, edged in blue-grey underneath.
function clouds(): string {
  const a = new Art()
  const cumulus = (x0: number, base: number, len: number, height: number, seed: number): void => {
    const m = new Art()

    for (let i = 0, x = x0 + 6; x < x0 + len - 6; i++) {
      const t = (x - x0) / len
      const r = height * (0.45 + 0.55 * Math.sin(Math.PI * t)) * (0.7 + hash(i, seed) * 0.3)

      m.disc(Math.round(x), Math.round(base - r * 0.55), r, '1')
      x += r * (0.7 + hash(i, seed, 1) * 0.4)
    }
    for (let y = base - height * 2; y <= base + height; y++) {
      for (let x = x0 - height; x <= x0 + len + height; x++) {
        if (!m.has(x, y) || y > base) {
          continue
        }
        const depth = (base - y) / height
        let fill = depth > 0.9 ? '#ffffff' : depth > 0.5 ? '#f3f8fd' : depth > 0.22 ? '#e2ecf7' : '#cfdeef'

        a.set(x, y, fill)
      }
    }
    a.rect(x0 + 4, base + 1, len - 8, 1, '#a9c2de')
  }

  cumulus(16, 104, 140, 22, 1)
  cumulus(236, 74, 118, 18, 2)
  cumulus(400, 166, 170, 26, 3)
  cumulus(500, 56, 104, 15, 5)

  return fine(`<g class="drift">${a.svg()}</g>`)
}

// ---------- the land behind (5-unit pixels) ----------

// Ridges one behind another, bluer and paler the farther they are: the haze.
function ridges(): string {
  const a = new Art()
  const ridge = (base: number, amp: number, seed: number, fill: string, rim: string): void => {
    for (let x = 0; x < GW; x++) {
      const top = Math.round(base - amp * (0.65 * Math.sin(x * 0.02 + seed) + 0.35 * Math.sin(x * 0.045 + seed * 2)))

      a.rect(x, top + 1, 1, 175 - top - 1, fill)
      a.set(x, top, rim)
    }
  }

  ridge(124, 9, 2, '#a8c8d4', '#c4dce4')
  ridge(136, 10, 5, '#86b09a', '#a6c8b0')

  return px(a.svg())
}

// The forested hill right across: rounded crowns textured with leaves, rimmed with light.
function forest(): string {
  const a = new Art()
  const tops: number[] = new Array<number>(GW + 2).fill(190)

  for (let i = 0, x = -12; x < GW + 12; i++) {
    const r = 5 + hash(i, 9) * 6
    const h = 3 + hash(i, 9, 1) * 5
    const y0 = 152 + Math.round((hash(i, 9, 3) - 0.5) * 6)

    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const k = Math.abs(dx) / r
      const xx = Math.round(x + dx) + 1

      if (k <= 1 && xx >= 0 && xx < tops.length) {
        tops[xx] = Math.min(tops[xx] ?? 160, Math.round(y0 - h * Math.sqrt(1 - k * k)))
      }
    }
    x += r * (1 + hash(i, 9, 4) * 0.5)
  }
  for (let x = 0; x < GW; x++) {
    const top = tops[x + 1] ?? 160
    a.rect(x, top + 1, 1, 200 - top - 1, 'url(#woods)')
    a.set(x, top, '#a2d27a')
  }

  return px(a.svg())
}

// Spring-green trees along the bottom, right across, in front of the hill (fine pixels).
function undergrowth(): string {
  let s = ''

  for (let i = 0, x = -10; x < GW * 2 + 20; i++, x += 42) {
    const y = 380 + Math.round(hash(i, 1, 4) * 12)

    s += use('gs', x + 17, y + 18) + use(i % 3 === 0 ? 'gs' : 'gl', x + Math.round(hash(i, 2, 4) * 10), y)
  }

  return fine(s)
}

// ---------- the pagoda (fine pixels, its foot at the origin) ----------

// The three-storey pagoda. Each storey, from the bottom: (above the first) a railed balcony;
// the walls, white plaster and window bars between vermilion posts round a studded door; a
// vermilion beam; clustered brackets; gold rafter ends; the tiled roof, sweeping up to a bell at
// each tip; the shadow the eave casts on everything under it. On top, the spire: base, bowl,
// nine rings, the openwork water-flame and a gold jewel.
function pagoda(): string {
  const STOREYS: [number, number, number, number][] = [
    // [wall half-width, wall height, eave half-width, roof rows]
    [32, 44, 98, 17],
    [27, 28, 88, 15],
    [23, 28, 80, 15],
  ]
  let out = ''
  let y = 0

  // The stone platform.
  out += part([-66, -12, 66, 1], a => {
    for (let r = 1; r <= 9; r++) {
      const hw = r < 4 ? 62 : 58

      a.rect(-hw, -r, hw * 2, 1, 'url(#stone)')
    }
    a.rect(-58, -9, 116, 1, '#f4eee8')
    a.rect(-62, -3, 124, 1, '#e8e0da')
  })
  y -= 9
  STOREYS.forEach(([hw, h, eave, rows], i) => {
    if (i > 0) {
      // The balcony: deck edge, rail, balusters, top rail, gold caps on the end posts.
      const bw = hw + 10

      out += part([-bw - 2, y - 10, bw + 2, y + 1], a => {
        a.rect(-bw, y - 1, bw * 2 + 1, 1, '#5a2a22')
        a.rect(-bw, y - 2, bw * 2 + 1, 1, RED[2])
        a.rect(-bw, y - 6, bw * 2 + 1, 4, 'url(#bal)')
        a.rect(-bw, y - 8, bw * 2 + 1, 1, RED[1])
        a.rect(-bw, y - 9, bw * 2 + 1, 1, '#ff9a70')
        for (const x of [-bw, bw - 1]) {
          a.rect(x, y - 9, 2, 8, RED[1])
          a.rect(x, y - 11, 2, 2, GOLD[1])
          a.set(x, y - 11, GOLD[0])
        }
      })
      y -= 9
    }
    const base = y
    const top = y - h + 1

    out += part([-hw - 2, top - 2, hw + 2, base + 1], a => {
      // Plaster, lit to shade, then the sill, the window bays, the door, the tie beam, posts.
      for (let r = top; r <= base; r++) {
        shade(a, r, -hw, hw, PLASTER, 0.3, 0.32)
      }
      a.rect(-hw, base - 2, hw * 2 + 1, 3, RED[1])
      a.rect(-hw, base - 2, hw * 2 + 1, 1, '#ff9a70')
      const bay = Math.round((hw * 2) / 3)
      const winTop = top + 9
      const winBottom = base - 5

      for (const [x0, dark] of [[-hw + 6, false], [hw - bay + 6, true]] as const) {
        a.rect(x0, winTop, bay - 12, winBottom - winTop + 1, 'url(#renji)')
        a.rect(x0 - 1, winTop - 1, bay - 10, 1, dark ? '#a83020' : '#e04a2e')
        a.rect(x0 - 1, winBottom + 1, bay - 10, 1, dark ? '#6a1a12' : '#a42e1e')
      }
      const dw = Math.round(bay / 2) - 3

      a.rect(-dw, winTop - 2, dw * 2, base - winTop - 1, 'url(#door)')
      a.rect(-dw - 1, winTop - 3, dw * 2 + 2, 1, '#7a2216')
      a.rect(-1, winTop - 2, 1, base - winTop - 1, '#5a1810')
      a.rect(-dw + 2, Math.round((winTop + base) / 2), 2, 2, GOLD[1])
      a.rect(dw - 4, Math.round((winTop + base) / 2), 2, 2, GOLD[1])
      a.rect(-hw, top + 5, hw * 2 + 1, 2, RED[1])
      a.rect(-hw, top + 5, hw * 2 + 1, 1, '#ff9a70')
      for (const x of [-hw, -hw + bay - 2, hw - bay - 1, hw - 3]) {
        post(a, x, top, base, x > hw * 0.3)
      }
    })
    y = top - 1
    // The beam across the post heads, with gold fittings.
    out += part([-hw - 6, y - 5, hw + 6, y + 1], a => {
      for (let r = 0; r < 4; r++) {
        shade(a, y - r, -hw - 4, hw + 4, r === 3 ? ['#ffa078', '#f47a50', '#c84a30'] : RED, 0.25, 0.35)
      }
      for (const x of [-hw, -hw + Math.round((hw * 2) / 3) - 2, hw - Math.round((hw * 2) / 3) - 1, hw - 3]) {
        a.rect(x, y - 2, 4, 2, GOLD[1])
        a.set(x, y - 2, GOLD[0])
      }
    })
    y -= 4
    // Brackets, two courses stepping out, then the rafter ends.
    const bw = hw + 14

    out += part([-bw - 6, y - 20, bw + 6, y + 1], a => {
      for (let r = 0; r < 8; r++) {
        shade(a, y - r, -bw, bw, TOKYO, 0.25, 0.35)
      }
      a.rect(-bw - 4, y - 9, (bw + 4) * 2 + 1, 1, '#3a2024')
      a.rect(-eave + 18, y - 11, (eave - 18) * 2 + 1, 2, 'url(#raft)')
    })
    // The eave's cast shadow over the brackets, the beam and the top of the wall.
    const sh = new Art()

    sh.rect(-bw - 4, y - 11, (bw + 4) * 2 + 1, 11, '#3a1020')
    sh.rect(-hw - 4, y + 1, (hw + 4) * 2 + 1, 4, '#3a1020')
    sh.rect(-hw, y + 5, hw * 2 + 1, 5, '#3a1020')
    out += `<g opacity="0.3">${sh.svg()}</g>`
    y -= 11
    out += part([-eave - 2, y - rows - 2, eave + 2, y + 2], a => roof(a, y, hw + 6, eave, rows, i === 0 ? 14 : 12))
    y -= rows - 2
  })
  // The spire.
  out += part([-16, y - 92, 16, y + 2], a => {
    // (Dark bronze against the sky: no outline.)
    let s = y

    const ring = (hw: number, n: number, f: readonly [string, string, string] = BRONZE): void => {
      for (let r = 0; r < n; r++) {
        shade(a, s - r, -hw, hw, f, 0.3, 0.35)
      }
      a.rect(-hw, s - n + 1, hw * 2 + 1, 1, r0(f))
      s -= n
    }
    const r0 = (f: readonly [string, string, string]): string => (f === GOLD ? '#fff4c0' : '#a89890')

    ring(13, 6)
    ring(9, 3)
    ring(11, 2)
    for (let k = 0; k < 9; k++) {
      a.rect(-2, s - 1, 5, 2, '#2e2826')
      a.set(-2, s - 1, '#6a5a52')
      s -= 2
      ring(8 - Math.floor(k / 3), 2)
    }
    a.rect(-2, s - 3, 5, 4, '#2e2826')
    s -= 3
    // The water-flame: a pierced bronze lobe.
    ;[3, 5, 7, 8, 8, 7, 6, 7, 8, 7, 5, 4, 3, 2].forEach((hw, k) => {
      shade(a, s, -hw, hw, BRONZE, 0.3, 0.35)
      if (k % 3 === 1 && hw > 4) {
        a.rect(-hw + 2, s, hw * 2 - 3, 1, '#1a1414')
      }
      s -= 1
    })
    ring(3, 3, GOLD)
    ;[2, 3, 3, 3, 2, 1].forEach(hw => {
      shade(a, s, -hw, hw, GOLD, 0.4, 0.3)
      s -= 1
    })
  }, '')

  return fine(out)
}

// The hillside round the pagoda's foot: spring-green trees and two blossoming cherries.
function hillside(): string {
  return fine(
    mass(-150, 14, 74, 28, 2, GREENS, SPARSE) +
      mass(128, 6, 70, 28, 3, GREENS, SPARSE) +
      mass(-104, -10, 42, 22, 4, BLOOMS, [18, 11]) +
      mass(100, -20, 40, 20, 5, BLOOMS, [18, 11]) +
      mass(0, 34, 124, 24, 6, GREENS, SPARSE),
  )
}

// ---------- the cherry branches (fine pixels) ----------

// Petals drifting down from a region, each on its own path and delay.
function petals(x0: number, y0: number, w: number, h: number): string {
  const rand = seeded(x0 * 7 + y0 + 1000)
  let s = ''

  for (let i = 0; i < 5; i++) {
    const x = Math.floor(x0 + rand() * w)
    const y = Math.floor(y0 + rand() * h)

    s += `<rect class="pt pt${i % 3}" style="animation-delay:${(-rand() * 26).toFixed(1)}s" x="${x}" y="${y}" width="${i % 2 === 0 ? 3 : 2}" height="2" fill="${rand() < 0.5 ? '#ffe4ee' : '#f7b8cf'}"/>`
  }

  return s
}

// From the top-left corner, arching right along the top of the frame (the corner at the origin).
function arch(): string {
  return fine(
    branches([
      [[-20, 0, 9], [36, 20, 7], [104, 32, 5], [180, 28, 4], [252, 44, 2.6], [300, 68, 1.2]],
      [[60, 24, 3.6], [84, 68, 2.4], [80, 104, 1.2]],
      [[144, 30, 3], [172, 72, 1.8], [160, 100, 1]],
      [[216, 36, 2.2], [236, 12, 1]],
      [[12, 8, 4.6], [-4, 80, 3], [12, 132, 1.2]],
      [[110, 31, 1.6], [120, 6, 0.8]],
    ]) +
      mass(40, 36, 52, 20, 7, BLOOMS) +
      mass(116, 52, 52, 24, 8, BLOOMS) +
      mass(192, 54, 44, 18, 9, BLOOMS) +
      mass(252, 62, 20, 10, 10, BLOOMS) +
      mass(80, 96, 28, 16, 11, BLOOMS) +
      mass(8, 104, 32, 24, 12, BLOOMS) +
      mass(166, 96, 22, 12, 13, BLOOMS) +
      petals(20, 60, 240, 60),
  )
}

// A temple hall at the lower left, seen over its terrace: a tiled roof under its ridge, sweeping
// up at the far end; the eave's brackets and shadow; plaster, window bars and vermilion posts;
// the terrace's wooden railing in front (fine pixels, the bottom-left corner at the origin).
function hall(): string {
  let out = ''
  const eaveY = -84

  out += part([-24, -146, 196, eaveY + 2], a => {
    // The ridge: a heavy cap with a lit top, its end ornament at the right.
    a.rect(-20, -136, 152, 6, '#3a3c48')
    a.rect(-20, -136, 152, 1, '#d8dce6')
    a.rect(-20, -135, 152, 1, '#8a8e9e')
    a.rect(-20, -131, 152, 1, '#24252e')
    a.rect(124, -141, 14, 11, '#4a4c58')
    a.rect(124, -141, 14, 1, '#c8ccd8')
    a.rect(124, -140, 1, 10, '#8a8e9e')
    a.rect(136, -144, 4, 4, '#4a4c58')
    a.rect(136, -144, 4, 1, '#c8ccd8')
    // The slope, widening to the eave, its far end turning up.
    for (let r = 0; r < 45; r += 1) {
      const yy = -130 + r
      const right = 132 + Math.round(r * 1.2)

      for (let x = -20; x <= right; x++) {
        const tip = r > 38 && x > right - 26 ? ((x - (right - 26)) / 26) ** 2 * 8 : 0

        if (tip > 0 && yy > -130 + 45 - tip) {
          continue
        }
        a.set(x, yy, x > right - 18 ? 'url(#tiled)' : x < 40 ? 'url(#tilel)' : 'url(#tile)')
      }
      a.set(right, yy, '#5a5e6c')
    }
    for (let x = -20; x <= 186; x++) {
      const tip = x > 160 ? Math.round(((x - 160) / 26) ** 2 * 8) : 0

      a.rect(x, eaveY - 3 - tip, 1, 3, x > 168 ? 'url(#tendd)' : x < 40 ? 'url(#tendl)' : 'url(#tend)')
    }
  })
  // Brackets and rafter ends under the eave, the wall below, and the eave's shadow.
  out += part([-24, eaveY - 1, 176, -30], a => {
    a.rect(-20, eaveY, 186, 2, 'url(#raft)')
    for (let r = 0; r < 8; r++) {
      shade(a, eaveY + 2 + r, -20, 164, TOKYO, 0.3, 0.3)
    }
    a.rect(-20, eaveY + 10, 182, 3, RED[1])
    a.rect(-20, eaveY + 10, 182, 1, '#ff9a70')
    for (let r = eaveY + 13; r <= -32; r++) {
      shade(a, r, -20, 160, PLASTER, 0.4, 0.25)
    }
    for (let x = -14; x < 150; x += 40) {
      a.rect(x + 8, eaveY + 18, 22, 28, 'url(#renji)')
      a.rect(x + 7, eaveY + 17, 24, 1, '#a42e1e')
      a.rect(x + 7, eaveY + 46, 24, 1, '#7a2216')
    }
    a.rect(-20, eaveY + 14, 182, 2, RED[1])
    for (let x = -18; x < 160; x += 40) {
      post(a, x, eaveY + 13, -32, x > 110)
    }
  })
  const sh = new Art()

  sh.rect(-20, eaveY, 186, 22, '#3a1020')
  out += `<g opacity="0.28">${sh.svg()}</g>`
  // The terrace railing: posts with lit faces, two rails, balusters between.
  out += part([-24, -58, 252, 2], a => {
    for (let x = -18; x < 250; x += 26) {
      a.rect(x, -54, 6, 54, 'url(#wood)')
      a.rect(x, -54, 1, 54, '#d8a070')
      a.rect(x + 5, -54, 1, 54, '#5a3a24')
      a.rect(x, -56, 6, 2, '#e0b088')
    }
    a.rect(-20, -50, 272, 4, '#a8704a')
    a.rect(-20, -50, 272, 1, '#f0c090')
    a.rect(-20, -47, 272, 1, '#6a4428')
    a.rect(-20, -30, 272, 3, '#946040')
    a.rect(-20, -30, 272, 1, '#d8a070')
    a.rect(-20, -46, 272, 16, 'url(#hbal)')
  }, '')

  return fine(out)
}

// A cherry rising up the left side, in front of the hall (fine pixels, the bottom-left corner at
// the origin).
function side(): string {
  return (
    fine(
      branches([
        [[-12, -20, 12], [16, -120, 10], [28, -220, 8], [20, -300, 6]],
        [[16, -120, 6], [80, -168, 4], [140, -176, 2.4], [160, -164, 1.2]],
        [[24, -212, 4.8], [88, -256, 2.8], [124, -252, 1.6]],
        [[22, -260, 3], [-6, -300, 1.4]],
        [[90, -170, 2], [104, -196, 1]],
      ]) +
        mass(40, -300, 60, 32, 13, BLOOMS) +
        mass(96, -240, 56, 28, 14, BLOOMS) +
        mass(104, -172, 52, 24, 15, BLOOMS) +
        mass(20, -200, 36, 28, 16, BLOOMS) +
        mass(72, 6, 108, 22, 17, GREENS, SPARSE) +
        petals(20, -280, 140, 80),
    )
  )
}

// ---------- birds, crossing now and then (the first bird at the origin) ----------

function birds(): string {
  const up = new Art()
  const down = new Art()

  for (const [bx, by] of [[0, 0], [8, 3], [15, 1]] as const) {
    for (const [dx, dy] of [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] as const) {
      up.set(bx + dx, by + dy, '#3a3a4a')
    }
    for (const [dx, dy] of [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]] as const) {
      down.set(bx + dx, by + dy, '#3a3a4a')
    }
  }

  return px(`<g class="fly"><g class="flap-a">${up.svg()}</g><g class="flap-b">${down.svg()}</g></g>`)
}

// ---------- layout ----------
//
// The pagoda stands at the right, past the conversation, among its trees; the cherry, the hall
// and its railing climb the left side from under the app's sidebar; the blossoming branch arches
// along the top from the top-left corner. The sky, the clouds, the ridges, the hill and the green
// along the bottom span the width, softened in the middle by a pale veil. Phones have no sidebar,
// so all of it draws in and shrinks.

type Spots = Record<'temple' | 'hall' | 'side' | 'arch' | 'birds', Spot>

function spots(a: number, tallestA: number): Spots {
  const { v, left, right } = visible(a)
  const shown = Math.min(H, W / tallestA)
  const top = (H - shown) / 2
  const bottom = top + shown
  const phone = a < 0.8
  const s = phone ? 0.5 : Math.min(1, Math.max(0.6, 0.45 + (v / W) * 0.55))

  return {
    temple: [right - v * (phone ? 0.24 : 0.14), PAGODA * PX, s],
    hall: [left, bottom, s],
    side: [left, bottom, s],
    arch: [left, top, s],
    birds: [right - v * 0.32, top + 120 * s, s],
  }
}

const { css: LAYOUT, placed } = layout(spots)

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<defs>
${PATTERNS}
${SPRITES}
${scrimGradient('#fbf8f9').replace(/stop-opacity="0.66"/g, 'stop-opacity="0.45"')}
</defs>
<style>
${LAYOUT}

  /* Every animation steps, so the scene redraws only when a frame changes. All of it is slow. */
  .drift { animation: drift 140s steps(14) infinite alternate; }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(14px); } }

  /* A few birds cross the sky about once a minute, flapping slowly. */
  .fly { opacity: 0; animation: fly 64s infinite; animation-delay: -6s; }
  @keyframes fly {
    0% { opacity: 1; transform: translate(0, 0); animation-timing-function: steps(96); }
    46% { opacity: 1; transform: translate(-220px, -16px); animation-timing-function: steps(1); }
    47%, 100% { opacity: 0; transform: translate(-220px, -16px); }
  }
  .flap-a, .flap-b { animation: flap 1.6s step-end infinite; }
  .flap-b { opacity: 0; animation-delay: -0.8s; }
  @keyframes flap { 0% { opacity: 1; } 50% { opacity: 0; } }

  .pt { animation: petal-a 24s infinite; }
  .pt1 { animation-name: petal-b; animation-duration: 29s; }
  .pt2 { animation-name: petal-c; animation-duration: 21s; }
  @keyframes petal-a {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(18); }
    6% { opacity: 1; }
    50% { transform: translate(28px, 80px); animation-timing-function: steps(20); }
    100% { transform: translate(68px, 220px); opacity: 0; }
  }
  @keyframes petal-b {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(16); }
    6% { opacity: 1; }
    40% { transform: translate(-12px, 68px); animation-timing-function: steps(26); }
    100% { transform: translate(44px, 240px); opacity: 0; }
  }
  @keyframes petal-c {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(22); }
    6% { opacity: 1; }
    60% { transform: translate(52px, 112px); animation-timing-function: steps(16); }
    100% { transform: translate(80px, 200px); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .drift, .fly, .flap-a, .flap-b, .pt { animation: none; }
  }
</style>
${skyBands(SKY)}
${clouds()}
${ridges()}
${forest()}
${placed('temple', pagoda() + hillside())}
${undergrowth()}
${placed('hall', hall())}
${placed('side', side())}
${placed('arch', arch())}
${placed('birds', birds())}
${SCRIM}
</svg>`

export const kyotoSakura: Look = {
  id: 'kyoto-sakura',
  label: 'Kyoto sakura',
  description: 'Pixel-art Kyoto in spring: a vermilion pagoda on the hillside, framed by cherry blossom',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'kyoto-sakura', glass: { blur: 0, tint: '#f7f2f4', opacity: 0.25 } },
  },
  scenes: {
    'kyoto-sakura': {
      source: SCENE,
      alt: 'Pixel art of Kyoto in spring on a clear day: a vermilion three-storey pagoda with white plaster, lattice windows, studded doors, clustered brackets, gold rafter ends, dark tiled roofs sweeping up to gold bells and a tall dark spire, among spring-green trees and cherries on a hillside; cherry branches dense with five-petalled blossom arching in from the top-left corner and up the left side over a temple hall’s tiled roof and wooden terrace railing; a forested hill and pale ridges under a blue sky with crisp white clouds, petals drifting and a bird crossing now and then',
    },
  },
}
