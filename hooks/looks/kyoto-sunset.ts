import type { Look } from './types'

import { makeColors } from '../make-colors.js'
import { Art, GW, H, PX, SCRIM, type Spot, W, glow, grad, hash, layout, px, scrimGradient, seeded, skyBands, visible } from './pixel'

// Kyoto at sunset, drawn as pixel art, as a place you could walk into. On the right a five-storey
// pagoda towers over its stone terrace: each storey's plaster bays between dark posts, a vermilion
// beam, stepped brackets, white rafter ends and curved tiled eaves with bells at their tips, a
// railing round each balcony and the bronze spire on top, all lit along the side facing the low
// sun, which sinks behind the lowest eave. Stone steps climb the terrace between lanterns, with
// pines on the hillside. On the left, steps climb a stone wall to a vermilion torii under big red
// maples, rocks and a lantern at their foot, the forest behind. Between them, ridgelines fade into
// the haze over a forested valley, under warm-to-violet bands of sky and clouds lit from below.
// Maple leaves overhang the corners and drift down, lanterns flicker, and birds cross now and
// then. The accent is the sunset's orange; red stays danger in the app.
const { theme, problems } = makeColors({
  label: 'Kyoto sunset',
  only: 'dark',
  roles: {
    accent: '#ff9457',
    danger: '#ff5a6a',
    success: '#6fcf9f',
    warning: '#ffcc5c',
    pro: '#b58cff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#110b13',
        'surface-1': '#160f18',
        'surface-2': '#1b131e',
        'surface-3': '#201723',
        'text-primary': '#f8efe9',
        'text-secondary': '#d6c8c6',
        'text-muted': '#b2a2a6',
      },
    },
  },
})

// The row, in art pixels, of the pagoda's foot on its terrace.
const PAGODA = 150

// ---------- textures ----------
//
// Patterns, in art pixels, for the surfaces drawn many times over: roof tiles, plaster bays,
// brackets, rafter ends, railings, stone walls, steps, earth and the forest's foliage. Each comes
// lit (for the side facing the sun) and plain.

const pattern = (id: string, w: number, h: number, base: string, cells: [number, number, string, number?][]): string =>
  `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><path fill="${base}" d="M0 0h${w}v${h}h-${w}z"/>${cells
    .map(([x, y, fill, cw = 1]) => `<path fill="${fill}" d="M${x} ${y}h${cw}v1h-${cw}z"/>`)
    .join('')}</pattern>`

const PATTERNS = [
  pattern('tile', 2, 1, '#2e2434', [[1, 0, '#221a28']]),
  pattern('tl', 2, 1, '#8a5048', [[1, 0, '#6a3c40']]),
  pattern('td', 2, 1, '#1a141e', [[1, 0, '#140f18']]),
  pattern('bay', 5, 1, '#b8866a', [[0, 0, '#5a2a22']]),
  pattern('bd', 5, 1, '#46343e', [[0, 0, '#22101a']]),
  pattern('door', 2, 2, '#3a1c1a', [[0, 0, '#d8a040']]),
  pattern('brk', 3, 1, '#5a3226', [[2, 0, '#1c0e12']]),
  pattern('bl', 3, 1, '#b0684a', [[2, 0, '#3a2018']]),
  pattern('raft', 2, 1, '#4e3a38', [[1, 0, '#1a0c12']]),
  pattern('rl', 2, 1, '#b07a5c', [[1, 0, '#3a1e1e']]),
  `<pattern id="rail" width="3" height="1" patternUnits="userSpaceOnUse"><path fill="#3a1e1c" d="M0 0h1v1h-1z"/></pattern>`,
  pattern('stone', 8, 6, '#4e4048', [[0, 0, '#2a2028', 8], [0, 3, '#2a2028', 8], [0, 1, '#2a2028'], [0, 2, '#2a2028'], [4, 4, '#2a2028'], [4, 5, '#2a2028'], [2, 1, '#5e4e56'], [6, 4, '#5e4e56']]),
  pattern('sl', 8, 6, '#9a7468', [[0, 0, '#4a3438', 8], [0, 3, '#4a3438', 8], [0, 1, '#4a3438'], [0, 2, '#4a3438'], [4, 4, '#4a3438'], [4, 5, '#4a3438'], [2, 1, '#b48a7a'], [6, 4, '#b48a7a']]),
  pattern('steps', 1, 3, '#2e2028', [[0, 0, '#7a5a52']]),
  pattern('stl', 1, 3, '#4a3034', [[0, 0, '#c8906c']]),
  pattern('earth', 6, 4, '#24141c', [[1, 0, '#341e26'], [4, 2, '#341e26'], [2, 3, '#1a0e14']]),
  pattern('woods', 4, 3, '#2a1430', [[0, 0, '#3a1c3c'], [2, 1, '#3a1c3c'], [1, 2, '#220f28']]),
].join('')

// ---------- sprites, drawn once in <defs> and placed with <use> ----------

// A clump of maple leaves, about 28 by 16, centred on its origin: `lit` for the clumps in front,
// glowing where the sun (to the right; mirror for the left) shines through them, else in shade.
function clump(id: string, lit: boolean, seed: number): string {
  const m = new Art()

  for (let y = -9; y <= 9; y++) {
    for (let x = -16; x <= 16; x++) {
      if (Math.hypot(x / 14, y / 8) <= 0.76 + 0.3 * hash(Math.floor(x / 2), Math.floor(y / 2), seed)) {
        m.set(x, y, '1')
      }
    }
  }
  const a = new Art()

  for (let y = -9; y <= 9; y++) {
    for (let x = -16; x <= 16; x++) {
      if (!m.has(x, y)) {
        continue
      }
      const h = hash(x, y, seed + 1)
      let fill = lit
        ? h > 0.84 ? '#e8582e' : h > 0.45 ? (y > 2 ? '#8a2228' : '#b8322a') : y > 2 ? '#701c26' : '#922428'
        : h > 0.8 ? '#6e1c2a' : h > 0.4 ? '#5e1626' : '#4a1222'

      if (!m.has(x, y - 1)) {
        fill = lit ? (x > -4 ? '#ffa058' : '#e8603a') : '#a8342e'
      } else if (!m.has(x + 1, y) && y < 3) {
        fill = lit ? '#ffb070' : '#8a2a2a'
      } else if (!m.has(x, y + 1)) {
        fill = lit ? '#5a1424' : '#2e0a16'
      }
      a.set(x, y, fill)
    }
  }

  return `<g id="${id}">${a.svg()}</g>`
}

// A Japanese pine, its foot at the origin: a crooked trunk and flat pads of needles, their tops
// warmed by the sunset and their left ends rimmed with it (the sun is to their left).
function pine(): string {
  const a = new Art()

  for (const [x1, y1, x2, y2, w] of [[0, 0, -4, -20, 3], [-4, -20, 2, -36, 2], [-3, -16, -14, -22, 1], [0, -26, 9, -30, 1]] as const) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1))

    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x1 + ((x2 - x1) * s) / steps)
      const y = Math.round(y1 + ((y2 - y1) * s) / steps)

      a.rect(x, y, w, 1, '#2a1a18')
      a.set(x, y, '#a8603c')
    }
  }
  for (const [cx, cy, rx, ry] of [[-14, -24, 10, 3], [9, -31, 9, 3], [-3, -40, 11, 3.5], [6, -18, 7, 2.5], [-1, -48, 6, 2.5]] as const) {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      for (let x = -rx - 2; x <= rx + 2; x++) {
        if (Math.hypot(x / rx, y / ry) > 1) {
          continue
        }
        const top = Math.hypot(x / rx, (y - 1) / ry) > 1
        const left = Math.hypot((x - 1) / rx, y / ry) > 1

        a.set(cx + x, cy + y, left ? '#e0a060' : top ? '#9a8a4a' : y > 0 ? '#121c16' : '#1e2c24')
      }
    }
  }

  return `<g id="pine">${a.svg()}</g>`
}

const SPRITES = clump('ml', true, 3) + clump('mc', false, 7) + pine()

const use = (id: string, x: number, y: number, mirror = false): string =>
  mirror ? `<use href="#${id}" transform="translate(${x} ${y}) scale(-1 1)"/>` : `<use href="#${id}" x="${x}" y="${y}"/>`

// A maple crown of overlapping clumps in an ellipse round (cx, cy): those in shade behind, those
// on the sunward side and the top in front. `mirror` when the sun is to the tree's left.
function crown(cx: number, cy: number, rx: number, ry: number, seed: number, mirror = false): string {
  let back = ''
  let front = ''

  for (let j = -ry; j <= ry; j += 8) {
    for (let i = -rx; i <= rx; i += 16) {
      const x = i + Math.round((hash(i, j, seed) - 0.5) * 8) + ((j / 8) % 2 === 0 ? 0 : 8)
      const y = j + Math.round((hash(j, i, seed) - 0.5) * 4)

      if ((x / rx) ** 2 + (y / ry) ** 2 > 1) {
        continue
      }
      const sunward = mirror ? x < -rx * 0.2 : x > rx * 0.2

      if ((sunward && y < ry * 0.4) || y < -ry * 0.45) {
        front += use('ml', cx + x, cy + y, mirror)
      } else {
        back += use('mc', cx + x, cy + y, mirror)
      }
    }
  }

  return back + front
}

// A limb as a chain of discs, thinning from r1 to r2, rimmed on the sunward side.
function limb(a: Art, [x1, y1, r1]: [number, number, number], [x2, y2, r2]: [number, number, number], sunRight: boolean): void {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1))

  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const x = Math.round(x1 + (x2 - x1) * t)
    const y = Math.round(y1 + (y2 - y1) * t)
    const r = r1 + (r2 - r1) * t

    a.disc(x, y, r, '#24121a')
    a.set(x + (sunRight ? Math.round(r) : -Math.round(r)), y, '#a8503c')
  }
}

// ---------- sky ----------

// Night creeping in overhead, through violet and rose, to a warm orange on the horizon.
const SKY: readonly [number, string][] = [
  [0, '#120c26'],
  [16, '#170f2e'],
  [30, '#1e1236'],
  [44, '#281540'],
  [57, '#34184a'],
  [69, '#431b52'],
  [80, '#561e58'],
  [91, '#6c225a'],
  [101, '#842858'],
  [110, '#9c3054'],
  [119, '#b33c50'],
  [127, '#c94e4a'],
  [134, '#dc6444'],
  [141, '#ea7c40'],
  [148, '#f39a46'],
]

// The first stars of the evening, high up where the sky has gone dark.
function stars(): string {
  const rand = seeded(19)
  const still = new Art()
  const tw = new Art()

  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * GW)
    const y = Math.floor(rand() ** 1.5 * 50)
    const m = rand()

    ;(i % 5 === 0 ? tw : still).set(x, y, m > 0.7 ? '#f4e6ff' : m > 0.35 ? '#a596cc' : '#6a5a96')
  }

  return px(still.svg()) + px(tw.svg(), 'tw')
}

// Banks of cloud lit from below: lumpy on top, flat underneath, their undersides glowing, hotter
// the nearer they are to the sun at (sunX, sunY) and dimmer the higher they float.
function clouds(sunX: number, sunY: number): string {
  const a = new Art()
  const bank = (x0: number, base: number, len: number, height: number, seed: number): void => {
    const m = new Art()

    for (let i = 0, x = x0; x < x0 + len; i++) {
      const rx = 5 + hash(i, seed) * 9
      const ry = height * (0.45 + hash(i, seed, 1) * 0.55) * Math.sin(Math.PI * Math.min(0.95, Math.max(0.12, (x - x0) / len)))

      for (let dy = -Math.ceil(ry); dy <= 0; dy++) {
        for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
          if ((dx / rx) ** 2 + (dy / Math.max(ry, 0.6)) ** 2 <= 1) {
            m.set(Math.round(x + dx), base + dy, '1')
          }
        }
      }
      x += rx * (0.9 + hash(i, seed, 2) * 0.5)
    }
    for (let y = base - height - 1; y <= base; y++) {
      for (let x = x0 - 16; x <= x0 + len + 16; x++) {
        if (!m.has(x, y)) {
          continue
        }
        const d = Math.hypot(x - sunX, (y - sunY) * 1.8) * (y < 70 ? 1.6 : 1)
        const toward = x < sunX ? 1 : -1
        let fill = y < 60 ? '#40194c' : y < 95 ? '#4c1c4e' : '#5a1e4c'

        if (!m.has(x, y + 1)) {
          fill = d < 46 ? '#ffe2a0' : d < 90 ? '#ffaa6e' : d < 150 ? '#ee7a78' : d < 230 ? '#b85274' : '#7e3666'
        } else if (!m.has(x, y + 2)) {
          fill = d < 90 ? '#e0786c' : d < 170 ? '#8a3462' : '#4e1c52'
        } else if (!m.has(x + toward, y) && d < 140) {
          fill = d < 60 ? '#ffc890' : '#c0566a'
        } else if (!m.has(x, y - 1)) {
          fill = y < 60 ? '#5a2458' : '#5a2252'
        }
        a.set(x, y, fill)
      }
    }
  }

  bank(-8, 36, 84, 7, 1)
  bank(100, 26, 52, 5, 2)
  bank(40, 64, 100, 8, 3)
  bank(186, 50, 96, 8, 4)
  bank(-14, 96, 76, 7, 5)
  bank(150, 98, 110, 8, 7)

  return px(`<g class="drift">${a.svg()}</g>`)
}

// ---------- the land behind: ridgelines and the forested valley ----------

// Ridges one behind another, paler the farther they are, rimmed along their crests near the sun.
function ridges(sunX: number): string {
  const a = new Art()
  const ridge = (base: number, amp: number, seed: number, fill: string, rimNear: string, rimFar: string): void => {
    for (let x = 0; x < GW; x++) {
      const top = Math.round(base - amp * (0.55 * Math.sin(x * 0.018 + seed) + 0.3 * Math.sin(x * 0.047 + seed * 2) + 0.15 * Math.sin(x * 0.11 + seed * 3)))

      a.rect(x, top + 1, 1, 170 - top - 1, fill)
      a.set(x, top, Math.abs(x - sunX) < 60 ? rimNear : rimFar)
    }
  }

  ridge(124, 10, 1, '#b25462', '#ffd098', '#c4625e')
  ridge(134, 9, 4, '#934460', '#ffa070', '#a44c60')
  ridge(145, 8, 7, '#6e3254', '#e8805e', '#7e3a58')

  return px(a.svg())
}

// The valley's forest right across: rounded crowns with the odd cedar spire, textured with
// foliage, rimmed with sunset on the side facing the sun.
function forest(sunX: number): string {
  const a = new Art()
  const tops: number[] = new Array<number>(GW + 2).fill(190)

  for (let i = 0, x = -12; x < GW + 12; i++) {
    const r = 5 + hash(i, 5) * 6
    const h = 3 + hash(i, 5, 1) * 5
    const cedar = hash(i, 5, 2) < 0.18
    const y0 = 160 + Math.round((hash(i, 5, 3) - 0.5) * 4)

    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const k = Math.abs(dx) / r
      const xx = Math.round(x + dx) + 1

      if (k <= 1 && xx >= 0 && xx < tops.length) {
        const up = cedar ? h * 2.4 * (1 - k) - (Math.round(h * 2.4 * (1 - k)) % 4 === 0 ? 1 : 0) : h * Math.sqrt(1 - k * k)

        tops[xx] = Math.min(tops[xx] ?? 160, Math.round(y0 - up))
      }
    }
    x += r * (1 + hash(i, 5, 4) * 0.5)
  }
  for (let x = 0; x < GW; x++) {
    const top = tops[x + 1] ?? 160
    const sunward = x < sunX ? (tops[x + 2] ?? top) : (tops[x] ?? top)
    const facing = sunward > top
    const rows = facing ? Math.min(3, sunward - top) : 1
    const near = Math.abs(x - sunX) < 80

    a.rect(x, top + rows, 1, 190 - top - rows, 'url(#woods)')
    a.rect(x, top, 1, rows, facing ? (near ? '#e8805a' : '#9a4256') : near ? '#8a3a56' : '#4e2244')
  }

  return px(a.svg())
}

// The ground along the bottom between the two sides: dark earth, its crest catching a little light.
function foreground(): string {
  const a = new Art()

  for (let x = 0; x < GW; x++) {
    const top = 186 + Math.round(Math.sin(x * 0.05) * 2 + Math.sin(x * 0.13) * 1)

    a.rect(x, top, 1, 200 - top, 'url(#earth)')
    a.set(x, top, '#4a2a30')
  }

  return px(a.svg())
}

// ---------- the temple side (the pagoda's foot at the origin) ----------

const SUN: [number, number] = [-44, -30]
const SUN_R = 15

// The low sun, sinking behind the far ridges and the pagoda's lowest eave.
function sun(): string {
  const [sx, sy] = SUN
  const halo = new Art()
  const body = new Art()
  const r = SUN_R

  halo.disc(sx, sy, r + 5, '#ffb070')
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.5) {
        continue
      }
      const t = (dy + r) / (2 * r)

      body.set(sx + dx, sy + dy, t < 0.4 ? '#fff4d6' : t < 0.62 ? '#ffe4a2' : t < 0.82 ? '#ffc670' : '#ffa452')
    }
  }
  const slit = new Art()

  slit.rect(sx - 24, sy + 6, 40, 1, '#c95a58')
  slit.rect(sx - 20, sy + 5, 30, 1, '#ffe8b4')
  slit.rect(sx - 4, sy - 7, 26, 1, '#d8705c')

  return px(`<g opacity="0.14">${halo.svg()}</g>${body.svg()}`) + px(`<g class="drift">${slit.svg()}</g>`)
}

type Fills = readonly [string, string, string, string, string]

// The pagoda's surfaces as [rim, lit, middle, shade, far edge]: the sun is to its left.
const TILE: Fills = ['#ffc890', 'url(#tl)', 'url(#tile)', 'url(#td)', '#120a10']
const EAVE: Fills = ['#ffe0a8', '#d08a68', '#4a3440', '#261c2a', '#120a10']
const RIDGE: Fills = ['#ffb47a', '#8a5650', '#4a3a48', '#2a2030', '#120a10']
const BODY: Fills = ['#ffb070', 'url(#bay)', 'url(#bd)', 'url(#bd)', '#120a10']
const BEAM: Fills = ['#ffb070', '#ff7448', '#b83c26', '#6a2018', '#3a1010']
const BRACKET: Fills = ['#ffb070', 'url(#bl)', 'url(#brk)', '#1c0e12', '#120a10']
const RAFTER: Fills = ['#ffe0b0', 'url(#rl)', 'url(#raft)', 'url(#raft)', '#120a10']
const RAIL: Fills = ['#ffb070', '#c87a50', '#5a3028', '#3a1e1c', '#120a10']
const STONE: Fills = ['#ffc890', 'url(#sl)', 'url(#stone)', 'url(#stone)', '#120a10']
const BRONZE: Fills = ['#ffd08a', '#b0804e', '#6a4a34', '#3a2a22', '#1a1010']

// A row of cells from -hw to hw: the rim, a lit part, the middle, a shaded part, the far edge.
// The borders between the parts step a cell on alternate rows, so the light falls off softly.
function band(a: Art, y: number, hw: number, f: Fills, lit = 0.35, shade = 0.35, cx = 0): void {
  const w = hw * 2 + 1
  const l = Math.max(1, Math.round(w * lit) + (y & 1))
  const s = Math.max(1, Math.round(w * shade) + (y & 1))

  a.rect(cx - hw, y, w, 1, f[2])
  a.rect(cx - hw, y, l, 1, f[1])
  a.rect(cx + hw - s + 1, y, s, 1, f[3])
  a.set(cx - hw, y, f[0])
  a.set(cx + hw, y, f[4])
}

// The five-storey pagoda. Each storey: (above the first) a balcony railing; plaster bays between
// dark posts round a studded door, a vermilion beam; three courses of brackets stepping out; two
// rows of white rafter ends; then the tiled roof, its eave curving up at the tips with a bell
// hanging from each. On top, the bronze spire: base, bowl, nine rings, water-flame and jewel.
function pagoda(): string {
  const a = new Art()
  const STOREYS: [number, number, number, number][] = [
    [15, 15, 44, 7],
    [13, 9, 40, 6],
    [12, 9, 37, 6],
    [11, 9, 34, 6],
    [10, 9, 31, 6],
  ]
  let y = -1

  for (let r = 0; r < 4; r++) {
    band(a, y - r, r < 2 ? 23 : 21, STONE, 0.4, 0.3)
  }
  y -= 4
  STOREYS.forEach(([hw, h, eave, rows], i) => {
    if (i > 0) {
      a.rect(-hw - 4, y, (hw + 4) * 2 + 1, 2, 'url(#rail)')
      a.set(-hw - 4, y, '#c87a50')
      a.set(-hw - 4, y - 1, '#c87a50')
      band(a, y - 2, hw + 4, RAIL, 0.2, 0.4)
      y -= 3
    }
    for (let r = 0; r < h; r++) {
      band(a, y - r, hw, BODY, 0.14, 0.45)
    }
    const [dw, dh] = i === 0 ? [3, 10] : [2, 6]

    a.rect(-dw, y - dh + 1, dw * 2 + 1, dh, 'url(#door)')
    a.rect(-dw - 1, y - dh, dw * 2 + 3, 1, '#2a1416')
    band(a, y - h + 1, hw, BEAM, 0.2, 0.4)
    y -= h
    for (let r = 0; r < 3; r++) {
      band(a, y - r, hw + 2 + r * 2, BRACKET, 0.2, 0.4)
    }
    y -= 3
    band(a, y, eave - 4, RAFTER, 0.2, 0.4)
    y -= 1
    for (let r = 0; r < rows; r++) {
      const rw = Math.round(hw + 3 + (eave - hw - 3) * (1 - r / rows) ** 1.35)

      if (r === 0) {
        band(a, y, rw, EAVE, 0.22, 0.4)
        // The tips curl up: the edge rises, the gap beneath opens to the sky.
        for (let x = rw - 10; x <= rw; x++) {
          const lift = Math.round(((x - (rw - 11)) / 11) ** 2 * 5)

          for (const side of [-1, 1]) {
            const cx = side * x

            if (lift > 0) {
              a.set(cx, y, undefined)
              a.set(cx, y - lift, side < 0 ? '#ffe0a8' : '#2e2430')
              for (let k = 1; k < lift; k++) {
                a.set(cx, y - k, side < 0 ? 'url(#tl)' : 'url(#td)')
              }
            }
          }
        }
        // A bell under each tip.
        a.set(-rw + 1, y - 2, '#e0a040')
        a.set(-rw + 1, y - 1, '#8a5a28')
        a.set(rw - 1, y - 2, '#8a6030')
        a.set(rw - 1, y - 1, '#4a3020')
      } else {
        band(a, y - r, rw, r === rows - 1 ? RIDGE : TILE, 0.2, 0.42)
      }
    }
    y -= rows
  })
  // The spire.
  const spire: [number, number, Fills][] = [
    [5, 3, RIDGE],
    [4, 2, BRONZE],
    [5, 1, BRONZE],
  ]

  for (const [hw, n, f] of spire) {
    for (let r = 0; r < n; r++) {
      band(a, y - r, hw, f, 0.4, 0.3)
    }
    y -= n
  }
  for (let ring = 0; ring < 9; ring++) {
    band(a, y, 3, BRONZE, 0.4, 0.3)
    a.rect(-1, y - 1, 3, 1, '#2a1e1c')
    a.set(-1, y - 1, '#c8905a')
    y -= 2
  }
  for (const hw of [2, 4, 4, 3, 2, 1, 1, 1]) {
    band(a, y, hw, BRONZE, 0.4, 0.3)
    y -= 1
  }
  a.set(0, y, '#ffe8b0')

  return px(a.svg())
}

// The terrace the pagoda stands on: a battered stone wall with steps up its face between two
// lanterns, on a hillside that falls away toward the valley, with pines on the slope.
function terrace(): string {
  const ground = new Art()
  const wall = new Art()

  for (let x = -190; x <= 110; x++) {
    const top = x < -48 ? 24 + Math.round((-48 - x) * 0.16 + Math.sin(x * 0.2)) : x > 48 ? 24 - Math.round((x - 48) * 0.2) : 24

    ground.rect(x, top, 1, 100 - top, 'url(#earth)')
    ground.set(x, top, x < 0 ? '#8a5040' : '#4a2a30')
  }
  for (let y = 0; y < 24; y++) {
    band(wall, y, 44 + Math.floor(y / 4), STONE, 0.3, 0.3)
  }
  band(wall, 0, 46, ['#ffd0a0', '#b08070', '#6a5a5e', '#3a3038', '#120a10'], 0.3, 0.3)
  for (let y = 1; y < 25; y++) {
    wall.rect(-7, y, 7, 1, 'url(#stl)')
    wall.rect(0, y, 7, 1, 'url(#steps)')
    wall.set(-8, y, '#d0a080')
    wall.set(7, y, '#2a2028')
  }
  const stones = new Art()
  const glows = toro(stones, -15, 27, 1) + toro(stones, 15, 27, 1)
  const rocks = new Art()

  rock(rocks, -40, 30, 9, 4, false)
  rock(rocks, 36, 28, 7, 3, false)
  rock(rocks, -120, 42, 12, 5, false)

  return (
    px(use('pine', 64, 20) + use('pine', -58, 26)) +
    px(ground.svg() + wall.svg()) +
    px(rocks.svg()) +
    px(glows + stones.svg())
  )
}

// ---------- the grove side (its bottom left, at the frame's bottom, at the origin) ----------

// A rock: a lumpy dome, its top lit on the sunward side, moss on its crown.
function rock(a: Art, cx: number, cy: number, rx: number, ry: number, sunRight: boolean): void {
  for (let y = -ry; y <= 1; y++) {
    for (let x = -rx; x <= rx; x++) {
      if (Math.hypot(x / rx, y / ry) > 0.95 + hash(cx + x, y, 2) * 0.12) {
        continue
      }
      const edge = Math.hypot(x / rx, (y - 1) / ry) > 0.95 + hash(cx + x, y - 1, 2) * 0.12
      const sunward = sunRight ? x > rx * 0.2 : x < -rx * 0.2

      a.set(cx + x, cy + y, edge ? (sunward ? '#c8806a' : '#4a3a40') : y === 1 ? '#160c12' : sunward ? '#5a4448' : hash(x, y, cx) > 0.8 ? '#3a4a30' : '#3a2c34')
    }
  }
}

// One vermilion torii, sc times full size, its foot's centre at (cx, foot): black kasagi on top,
// vermilion beneath, pillars on black bases, the sunward (right) edges glowing.
function torii(a: Art, cx: number, foot: number, sc: number): void {
  const n = (v: number): number => Math.max(1, Math.round(v * sc))
  const h = n(64)
  const half = n(20)
  const pw = Math.max(2, n(5))

  for (const x0 of [cx - half - Math.floor(pw / 2), cx + half - Math.floor(pw / 2)]) {
    a.rect(x0, foot - h, pw, h, '#e04a2c')
    a.rect(x0, foot - h, 1, h, '#8a2418')
    a.rect(x0 + pw - 1, foot - h, 1, h, '#ffa060')
    a.rect(x0, foot - n(5), pw, n(5), '#1a0e10')
  }
  const nuki = foot - n(48)

  a.rect(cx - n(26), nuki, n(52) + 1, n(3), '#e04a2c')
  a.rect(cx - n(26), nuki, n(52) + 1, 1, '#ffa060')
  a.rect(cx - Math.floor(n(2) / 2), foot - h, Math.max(1, n(2)), nuki - (foot - h), '#e04a2c')
  const khw = n(31)
  const kh = Math.max(2, n(5))

  for (let x = -khw; x <= khw; x++) {
    const out = Math.max(0, Math.abs(x) - khw * 0.55) / (khw * 0.45)
    const top = foot - h - kh - Math.round(out * out * n(4))

    a.rect(cx + x, top, 1, kh, '#e04a2c')
    a.rect(cx + x, top, 1, 2, '#1a0e10')
    a.set(cx + x, top + kh - 1, '#8a2418')
    if (x === khw) {
      a.rect(cx + x, top, 1, kh, '#ffa060')
    }
  }
}

// A stone lantern, k art pixels to each of its cells, foot at (cx, foot); its fire box glows.
function toro(a: Art, cx: number, foot: number, k: number, sunRight = false): string {
  // [top row, rows, half width] from the jewel down to the base.
  const parts: [number, number, number][] = [
    [-25, 2, 1],
    [-23, 1, 3],
    [-22, 1, 5],
    [-21, 2, 6],
    [-19, 5, 3],
    [-14, 2, 4],
    [-12, 8, 1],
    [-4, 1, 3],
    [-3, 3, 4],
  ]

  for (const [top, rows, hw] of parts) {
    a.rect(cx - hw * k, foot + top * k, (hw * 2 + 1) * k, rows * k, '#3a2830')
    a.rect(cx - hw * k, foot + top * k, (hw * 2 + 1) * k, k, '#6a4040')
    a.rect(cx - hw * k, foot + (top + 1) * k, k, (rows - 1) * k, sunRight ? '#24161e' : '#c06a50')
    a.rect(cx + hw * k, foot + top * k, k, rows * k, sunRight ? '#c06a50' : '#24161e')
  }
  a.rect(cx - 7 * k, foot - 22 * k, k, k, sunRight ? '#3a2830' : '#c06a50')
  a.rect(cx + 6 * k, foot - 22 * k, k, k, sunRight ? '#c06a50' : '#3a2830')
  a.rect(cx - 1 * k, foot - 18 * k, 3 * k, 3 * k, '#ffd27a')
  a.rect(cx - 1 * k, foot - 18 * k, 3 * k, k, '#fff0c2')

  return glow(cx + 0.5 * k, foot - 16.5 * k, 8 * k, 7 * k, 'g-lantern', 0.9, 'flame')
}

// The grove: the forest's edge rising behind; an upper terrace held by a stone wall, with steps
// climbing its face to a vermilion torii; big red maples over it all; rocks, grass and a lantern
// on the ground below. The sun is to the right here.
function grove(): string {
  const back = new Art()

  for (let x = -140; x <= 64; x++) {
    const top = -150 + Math.round((x + 140) * 0.32 + 6 * Math.abs(Math.sin(x * 0.11)) + 4 * Math.sin(x * 0.04))

    back.rect(x, top + 1, 1, -40 - top, 'url(#woods)')
    back.set(x, top, '#5a2a44')
  }
  const land = new Art()

  // The upper terrace and the slope rising behind it.
  for (let x = -140; x <= 4; x++) {
    const top = x < -40 ? -48 - Math.round((-40 - x) * 0.25) : -48

    land.rect(x, top, 1, -38 - top, 'url(#earth)')
    land.set(x, top, x > -60 ? '#8a4a3a' : '#5a3036')
  }
  // Its stone wall, battered, the right end catching the sun, and the steps up its face.
  for (let y = -44; y < -12; y++) {
    const right = 4 + Math.floor((y + 44) / 5)

    land.rect(-140, y, right + 141, 1, 'url(#stone)')
    land.set(right, y, '#c8806a')
    land.rect(right - 4, y, 4, 1, 'url(#sl)')
  }
  land.rect(-140, -45, 146, 1, '#7a6060')
  for (let y = -47; y < -12; y++) {
    land.rect(-30, y, 9, 1, 'url(#steps)')
    land.rect(-21, y, 9, 1, 'url(#stl)')
    land.set(-31, y, '#2a2028')
    land.set(-12, y, '#d0a080')
  }
  // The ground below, running out toward the middle.
  for (let x = -140; x <= 190; x++) {
    const top = -14 + Math.round(Math.sin(x * 0.08) * 1.2 + (x > 120 ? (x - 120) * 0.15 : 0))

    land.rect(x, top, 1, 14 - top, 'url(#earth)')
    land.set(x, top, x > -20 ? '#7a4a3a' : '#4a2a30')
  }
  const gate = new Art()

  torii(gate, -21, -48, 0.62)
  const trunks = new Art()

  limb(trunks, [-104, -48, 4], [-92, -100, 3], true)
  limb(trunks, [-94, -92, 2.4], [-60, -122, 1.4], true)
  limb(trunks, [-96, -80, 2], [-124, -108, 1.2], true)
  limb(trunks, [34, -14, 3], [28, -66, 2], true)
  limb(trunks, [29, -56, 1.6], [48, -80, 1], true)
  const ground = new Art()
  const stones = new Art()
  const glows = toro(stones, 10, -14, 1, true)

  rock(ground, -6, -14, 8, 4, true)
  rock(ground, 64, -4, 15, 6, true)
  rock(ground, -50, 0, 12, 5, true)
  rock(ground, 120, -2, 9, 4, true)
  for (let i = 0; i < 16; i++) {
    const x = -130 + Math.floor(hash(i, 1, 6) * 300)
    const y = -12 + Math.floor(hash(i, 2, 6) * 10)

    ground.rect(x, y - 2, 1, 2, '#3a4a2a')
    ground.set(x + 1, y - 1, '#5a6a3a')
    ground.set(x - 1, y - 1, '#2a3422')
  }
  const rand = seeded(83)
  let falling = ''

  for (let i = 0; i < 7; i++) {
    const x = Math.floor(-110 + rand() * 120)
    const y = Math.floor(-150 + rand() * 30)

    falling += `<rect class="lf lf${i % 3}" style="animation-delay:${(-rand() * 26).toFixed(1)}s" x="${x}" y="${y}" width="2" height="${i % 2 === 0 ? 2 : 1}" fill="${rand() < 0.5 ? '#ff7a3e' : '#c8382e'}"/>`
  }

  return (
    px(back.svg() + crown(-36, -108, 30, 18, 4)) +
    px(land.svg() + gate.svg()) +
    px(trunks.svg() + crown(40, -82, 26, 16, 9) + crown(-84, -122, 52, 30, 2) + ground.svg()) +
    px(glows + stones.svg() + falling)
  )
}

// ---------- the corners: maple boughs overhanging the frame ----------

// Top left, from the frame's corner, the sun to the right.
function bough(): string {
  const a = new Art()

  limb(a, [-8, 2, 3.2], [24, 10, 2.2], true)
  limb(a, [24, 10, 2.2], [56, 12, 1.4], true)
  limb(a, [56, 12, 1.4], [86, 20, 0.6], true)
  limb(a, [24, 10, 1.2], [34, 28, 0.6], true)

  return px(a.svg() + use('mc', 4, 10) + use('mc', 30, 20) + use('ml', 18, 4) + use('mc', 56, 22) + use('ml', 44, 12) + use('ml', 74, 20) + use('ml', 6, 22))
}

// Bottom right, from the frame's corner, the sun to the left.
function sprig(): string {
  const a = new Art()

  limb(a, [8, 4, 2.6], [-26, -14, 1.6], false)
  limb(a, [-26, -14, 1.6], [-56, -18, 0.6], false)

  return px(a.svg() + use('mc', -14, -6, true) + use('mc', -40, -18, true) + use('ml', -28, -12, true) + use('ml', -52, -22, true) + use('ml', -6, -20, true))
}

// ---------- birds, crossing now and then (the first bird at the origin) ----------

function birds(): string {
  const up = new Art()
  const down = new Art()

  for (const [bx, by] of [[0, 0], [8, 3], [15, 1], [22, 5]] as const) {
    for (const [dx, dy] of [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] as const) {
      up.set(bx + dx, by + dy, '#1c0c1a')
    }
    for (const [dx, dy] of [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]] as const) {
      down.set(bx + dx, by + dy, '#1c0c1a')
    }
  }

  return px(`<g class="fly"><g class="flap-a">${up.svg()}</g><g class="flap-b">${down.svg()}</g></g>`)
}

// ---------- layout ----------
//
// The pagoda on its terrace stands at the right, past the conversation, cropped by the frame's
// edge where it must be; the grove with its wall, steps, torii and maples at the left, reaching
// from under the app's sidebar into the gap before the conversation; boughs overhang the top-left
// and bottom-right corners. The sky, the ridges, the valley's forest and the ground span the
// width, calm under the veil. Phones have no sidebar, so all of it draws in and shrinks.

type Spots = Record<'temple' | 'grove' | 'bough' | 'sprig' | 'birds', Spot>

function spots(a: number, tallestA: number): Spots {
  const { v, left, right } = visible(a)
  const shown = Math.min(H, W / tallestA)
  const top = (H - shown) / 2
  const bottom = top + shown
  const phone = a < 0.8
  const s = phone ? 0.5 : Math.min(1, Math.max(0.6, 0.45 + (v / W) * 0.55))

  return {
    temple: [right - v * (phone ? 0.24 : 0.12), PAGODA * PX, s],
    grove: [left + v * (phone ? 0.24 : 0.1), bottom, s],
    bough: [left, top, s],
    sprig: [right, bottom, s],
    birds: [right - v * (phone ? 0.3 : 0.3), top + 130 * s, s],
  }
}

const { css: LAYOUT, placed } = layout(spots)
// Where the sun sits at 16:10, in art pixels, for lighting the clouds and the ridges.
const HOME = spots(1.4, 1.6).temple
const SUN_AT: [number, number] = [HOME[0] / PX + SUN[0] * HOME[2], PAGODA + SUN[1] * HOME[2]]

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<defs>
${PATTERNS}
${grad('g-lantern', '#ffb050', 0.55)}
<linearGradient id="g-mist" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e07a7a" stop-opacity="0"/><stop offset="1" stop-color="#e07a7a" stop-opacity="0.22"/></linearGradient>
${SPRITES}
${scrimGradient('#0b0710')}
</defs>
<style>
${LAYOUT}

  /* Every animation steps, so the scene redraws only when a frame changes. All of it is slow. */
  .tw { animation: tw 9s step-end infinite; }
  @keyframes tw { 0% { opacity: 1; } 50% { opacity: 0.3; } }

  .drift { animation: drift 120s steps(12) infinite alternate; }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(12px); } }

  .flame { animation: flame 5s step-end infinite; }
  .at-grove .flame { animation-delay: -2s; }
  @keyframes flame { 0% { opacity: 1; } 35% { opacity: 0.8; } 50% { opacity: 0.95; } 80% { opacity: 0.86; } }

  /* A few birds cross the sky about once a minute, flapping slowly. */
  .fly { opacity: 0; animation: fly 60s infinite; animation-delay: -4s; }
  @keyframes fly {
    0% { opacity: 1; transform: translate(0, 0); animation-timing-function: steps(96); }
    48% { opacity: 1; transform: translate(-240px, -20px); animation-timing-function: steps(1); }
    49%, 100% { opacity: 0; transform: translate(-240px, -20px); }
  }
  .flap-a, .flap-b { animation: flap 1.6s step-end infinite; }
  .flap-b { opacity: 0; animation-delay: -0.8s; }
  @keyframes flap { 0% { opacity: 1; } 50% { opacity: 0; } }

  .lf { animation: leaf-a 22s infinite; }
  .lf1 { animation-name: leaf-b; animation-duration: 27s; }
  .lf2 { animation-name: leaf-c; animation-duration: 19s; }
  @keyframes leaf-a {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(14); }
    6% { opacity: 1; }
    50% { transform: translate(10px, 40px); animation-timing-function: steps(16); }
    100% { transform: translate(26px, 110px); opacity: 0; }
  }
  @keyframes leaf-b {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(12); }
    6% { opacity: 1; }
    40% { transform: translate(-8px, 34px); animation-timing-function: steps(22); }
    100% { transform: translate(18px, 120px); opacity: 0; }
  }
  @keyframes leaf-c {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(18); }
    6% { opacity: 1; }
    60% { transform: translate(22px, 56px); animation-timing-function: steps(12); }
    100% { transform: translate(32px, 104px); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .tw, .drift, .flame, .fly, .flap-a, .flap-b, .lf { animation: none; }
  }
</style>
${skyBands(SKY)}
${stars()}
${placed('temple', sun())}
${clouds(...SUN_AT)}
${ridges(SUN_AT[0])}
<rect y="${118 * PX}" width="${W}" height="${44 * PX}" fill="url(#g-mist)"/>
${forest(SUN_AT[0])}
${foreground()}
${placed('temple', terrace() + pagoda())}
${placed('grove', grove())}
${placed('bough', bough())}
${placed('sprig', sprig())}
${placed('birds', birds())}
${SCRIM}
</svg>`

export const kyotoSunset: Look = {
  id: 'kyoto-sunset',
  label: 'Kyoto sunset',
  description: 'Pixel-art Kyoto at sunset: a towering pagoda on its terrace, a torii up stone steps under red maples',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'kyoto-sunset', glass: { blur: 0, tint: '#0d0912', opacity: 0.3 } },
  },
  scenes: {
    'kyoto-sunset': {
      source: SCENE,
      alt: 'Pixel art of Kyoto at sunset: a towering five-storey pagoda with tiled, upturned eaves, brackets, railings and a bronze spire on a stone terrace with steps and lanterns, pines on the hillside, and the low sun behind its lowest eave; on the left, stone steps up a wall to a vermilion torii under big red maples, with rocks and a lantern below; ridgelines fading into haze over a forested valley, clouds lit from below, maple boughs overhanging the corners, drifting leaves and birds crossing',
    },
  },
}
