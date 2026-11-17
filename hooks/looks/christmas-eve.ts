import type { Look } from './types'

import { makeColors } from '../make-colors.js'
import { Art, GW, H, PX, SCRIM, type Spot, W, glow, grad, hash, layout, px, scrimGradient, seeded, skyBands, visible } from './pixel'

// Christmas eve, drawn as pixel art: a snowy night, warm with lights. On the right a big fir
// stands in the snow, every tier heavy with snow along its boughs, wrapped in gold garland and
// strings of coloured bulbs that twinkle in turns, hung with red, gold and silver baubles, a
// glowing star on top and presents in the snow at its foot. On the left a log cabin under a
// thick roof of snow, icicles along its eave, its windows glowing with firelight, a wreath on the
// door, bulbs along the eave and smoke curling from the stone chimney, a snowman in front. A full
// moon hangs over it, a sleigh crosses the sky now and then, and snow falls over snowy hills, a
// pine forest and a village's lit windows under a sky that warms toward the horizon. Holly
// hangs into the top-left corner and a strand of big bulbs into the top-right. The accent is the
// lights' gold; red stays danger in the app.
const { theme, problems } = makeColors({
  label: 'Christmas eve',
  only: 'dark',
  roles: {
    accent: '#f5b84a',
    danger: '#ff5a64',
    success: '#6fcf8f',
    warning: '#ffcc5c',
    pro: '#c49aff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#120c0c',
        'surface-1': '#170f0f',
        'surface-2': '#1c1313',
        'surface-3': '#221716',
        'text-primary': '#f9f0e6',
        'text-secondary': '#dccdc0',
        'text-muted': '#b5a397',
      },
    },
  },
})

// ---------- textures ----------

const pattern = (id: string, w: number, h: number, base: string, cells: [number, number, string, number?][]): string =>
  `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><path fill="${base}" d="M0 0h${w}v${h}h-${w}z"/>${cells
    .map(([x, y, fill, cw = 1]) => `<path fill="${fill}" d="M${x} ${y}h${cw}v1h-${cw}z"/>`)
    .join('')}</pattern>`

const PATTERNS = [
  // Fir needles: moonlit, plain and in shade.
  pattern('firl', 4, 3, '#2a5e3c', [[0, 0, '#3c7a4c'], [2, 1, '#3c7a4c'], [1, 2, '#1e4a30']]),
  pattern('fir', 4, 3, '#1a4029', [[0, 0, '#245238'], [2, 1, '#245238'], [1, 2, '#12301f'], [3, 2, '#12301f']]),
  pattern('fird', 4, 3, '#0f2819', [[0, 0, '#163322'], [2, 1, '#163322'], [1, 2, '#0a1d12']]),
  // Snow on the ground, and the brighter snow on the roof.
  pattern('snow', 7, 4, '#7c82ac', [[1, 0, '#9096be'], [5, 2, '#9096be'], [3, 1, '#7076a2'], [0, 3, '#7076a2'], [4, 3, '#a4aad0']]),
  pattern('snowr', 6, 3, '#aab0d4', [[1, 0, '#c0c6e4'], [4, 1, '#9aa0c8'], [2, 2, '#b8bede']]),
  // Logs, each 4 rows: its lit top, the wood, its shaded underside and the dark gap.
  pattern('logs', 1, 4, '#6a3c24', [[0, 0, '#8e5634'], [0, 2, '#54301c'], [0, 3, '#24120a']]),
  pattern('plank', 3, 1, '#5a2e1c', [[2, 0, '#381a0e']]),
  pattern('stone', 6, 4, '#5a4a52', [[0, 0, '#2e242c', 6], [0, 2, '#2e242c', 6], [0, 1, '#2e242c'], [3, 3, '#2e242c'], [2, 1, '#6e5e66'], [5, 3, '#6e5e66']]),
].join('')

// A distant fir: 7 wide, 11 tall, its foot at the origin, snow on its left boughs.
function farPine(): string {
  const a = new Art()
  const rows = [1, 1, 3, 3, 5, 3, 5, 7, 5, 7, 7]

  rows.forEach((w, i) => {
    const y = i - 11
    const hw = (w - 1) / 2

    a.rect(-hw, y, w, 1, '#161b2a')
    a.set(-hw, y, i % 2 === 0 ? '#8a8eb6' : '#5a5e86')
  })
  a.set(0, 0, '#100c14')

  return `<g id="pn">${a.svg()}</g>`
}

const use = (id: string, x: number, y: number): string => `<use href="#${id}" x="${x}" y="${y}"/>`

// ---------- sky ----------

// A deep night overhead, warming through plum to a rosy glow on the horizon from the village.
const SKY: readonly [number, string][] = [
  [0, '#0b0918'],
  [18, '#0f0c1f'],
  [34, '#140f27'],
  [50, '#1a122e'],
  [64, '#211534'],
  [77, '#2a1838'],
  [89, '#341b3c'],
  [100, '#3f1f3e'],
  [110, '#4b243e'],
  [119, '#58293e'],
  [127, '#66303e'],
  [134, '#74383e'],
]

function stars(): string {
  const rand = seeded(29)
  const still = new Art()
  const tw = new Art()

  for (let i = 0; i < 36; i++) {
    const x = Math.floor(rand() * GW)
    const y = Math.floor(rand() ** 1.4 * 95)
    const m = rand()
    const fill = m > 0.75 ? '#fff4dc' : m > 0.4 ? '#c4b8e0' : '#776a98'

    ;(i % 4 === 0 ? tw : still).set(x, y, fill)
    if (m > 0.93) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        ;(i % 4 === 0 ? tw : still).set(x + dx, y + dy, '#8a7eb0')
      }
    }
  }

  return px(still.svg()) + px(tw.svg(), 'tw')
}

// The full moon, its centre at the origin: warm cream, shaded to the right, with soft craters.
function moon(): string {
  const r = 15
  const a = new Art()
  const halo = new Art()

  halo.disc(0, 0, r + 4, '#ffe8c0')
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.5) {
        continue
      }
      const t = (dx + dy * 0.4) / r

      a.set(dx, dy, t < -0.55 ? '#fffaea' : t < 0.35 ? '#f8e9c6' : t < 0.75 ? '#e8d4a8' : '#d4bd8e')
    }
  }
  for (const [cx, cy, cr] of [[-5, -4, 3], [4, 5, 2.4], [6, -6, 1.6], [-3, 7, 1.4], [9, 1, 1.2]] as const) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy <= cr * cr) {
          a.set(cx + dx, cy + dy, dx + dy < 0 ? '#dcc69c' : '#e6d4ae')
        }
      }
    }
  }

  return px(glow(0, 0, 70, 70, 'g-moon', 0.55) + `<g opacity="0.16">${halo.svg()}</g>` + a.svg())
}

// ---------- the land behind: snowy hills, a pine forest and a village ----------

const ridgeTop = (x: number, base: number, amp: number, seed: number): number =>
  Math.round(base - amp * (0.55 * Math.sin(x * 0.02 + seed) + 0.3 * Math.sin(x * 0.051 + seed * 2) + 0.15 * Math.sin(x * 0.12 + seed * 3)))

function hills(): string {
  const far = new Art()
  const near = new Art()

  for (let x = 0; x < GW; x++) {
    const t1 = ridgeTop(x, 132, 9, 1)

    far.rect(x, t1 + 1, 1, 184 - t1, '#2c2848')
    far.set(x, t1, '#4c4872')
    const t2 = ridgeTop(x, 154, 7, 5)

    near.rect(x, t2 + 2, 1, 184 - t2, '#3a3660')
    near.rect(x, t2, 1, 2, '#625e8e')
    near.set(x, t2, '#7874a4')
  }
  let pines = ''
  const rand = seeded(7)

  for (let x = -4; x < GW + 4; x += 3 + Math.floor(rand() * 7)) {
    if (x > 118 && x < 206) {
      continue
    }
    pines += use('pn', x, ridgeTop(x, 154, 7, 5) + 2 + Math.floor(rand() * 3))
  }
  for (let x = 2; x < GW; x += 9 + Math.floor(rand() * 12)) {
    pines += use('pn', x, ridgeTop(x, 132, 9, 1) + 3)
  }
  // The village: little houses on the near hill, snow on their roofs, windows lit.
  const town = new Art()
  const lit = new Art()

  for (let i = 0, x = 122; x < 202; i++) {
    const w = 6 + Math.floor(hash(i, 3) * 5)
    const h = 4 + Math.floor(hash(i, 4) * 3)
    const foot = ridgeTop(x + w / 2, 154, 7, 5) + 3

    town.rect(x, foot - h, w, h, '#241e36')
    for (let r = 0; r < Math.ceil(w / 2); r++) {
      town.rect(x - 1 + r, foot - h - 1 - r, w + 2 - r * 2, 1, r === 0 ? '#b4b8dc' : '#9498c2')
    }
    for (let wx = x + 1; wx < x + w - 1; wx += 3) {
      if (hash(wx, i, 9) > 0.3) {
        lit.rect(wx, foot - h + 1, 1, 2, hash(wx, i, 8) > 0.7 ? '#ffe7a8' : '#ffc45e')
      }
    }
    if (i === 4) {
      // A steeple, its bell window lit.
      town.rect(x + 2, foot - h - 14, 3, 10, '#241e36')
      town.rect(x + 3, foot - h - 19, 1, 5, '#9498c2')
      lit.set(x + 3, foot - h - 11, '#ffd27a')
    }
    x += w + 2 + Math.floor(hash(i, 5) * 4)
  }

  return px(far.svg()) + `<rect y="${112 * PX}" width="${W}" height="${44 * PX}" fill="url(#g-mist)"/>` + px(near.svg() + pines + town.svg() + lit.svg())
}

// The snow along the bottom, right across.
function foreground(): string {
  const a = new Art()

  for (let x = 0; x < GW; x++) {
    const top = 181 + Math.round(Math.sin(x * 0.045) * 2 + Math.sin(x * 0.13))

    a.rect(x, top + 2, 1, 200 - top, 'url(#snow)')
    a.set(x, top, '#b8bcdc')
    a.set(x, top + 1, '#9ca2c8')
  }

  return px(a.svg())
}

// ---------- falling snow ----------
//
// Each layer is drawn over the whole frame, and again a frame higher; it falls one frame's height
// and starts over, so it never runs out. The far layer is finer and slower.

function snowfall(id: string, seed: number, count: number, near: boolean): string {
  const rand = seeded(seed)
  const a = new Art()

  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * GW)
    const y = Math.floor(rand() * 200)
    const m = rand()

    if (near && m > 0.72) {
      a.set(x, y, '#f4f6ff')
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        a.set(x + dx, y + dy, '#c8cce8')
      }
    } else {
      a.set(x, y, near ? (m > 0.35 ? '#e6eaf8' : '#b8bede') : m > 0.5 ? '#a6acd0' : '#7e84ac')
    }
  }

  return `<g class="${id}"><g id="${id}-s" transform="scale(${PX})">${a.svg()}</g><use href="#${id}-s" transform="translate(-40 -${H})"/></g>`
}

// ---------- the tree (its foot at the origin) ----------

// Tiers from the bottom up: [apex row, base row, half width at the base].
const TIERS: readonly [number, number, number][] = [
  [-66, -10, 42],
  [-88, -34, 35],
  [-108, -57, 28],
  [-125, -79, 21],
  [-139, -99, 14],
  [-151, -117, 8],
]

const tierHw = ([apex, base, w]: readonly [number, number, number], y: number): number => w * ((y - apex) / (base - apex)) ** 0.92
const tierBottom = ([, base]: readonly [number, number, number], x: number): number => base - Math.round(2.6 * Math.abs(Math.sin((x * Math.PI) / 6)))

// The highest tier drawn at (x, y): upper tiers hang in front of the ones below. -1 when none.
function owner(x: number, y: number): number {
  for (let t = TIERS.length - 1; t >= 0; t--) {
    const tier = TIERS[t] ?? [0, 0, 0]

    if (y >= tier[0] && y <= tierBottom(tier, x) && Math.abs(x) <= tierHw(tier, y) + (hash(y, t, 1) > 0.65 ? 1 : 0)) {
      return t
    }
  }

  return -1
}

const BULBS = ['#fff0c0', '#ff5a4e', '#ffc040', '#6ee07a', '#6aaeff'] as const
const BAUBLES: readonly [string, string, string][] = [
  ['#e0404a', '#ff9a8a', '#8a1a26'],
  ['#f0b840', '#fff0b0', '#9a6a1a'],
  ['#c8d0e4', '#ffffff', '#6a7290'],
  ['#e0404a', '#ff9a8a', '#8a1a26'],
  ['#f0b840', '#fff0b0', '#9a6a1a'],
  ['#4a76d8', '#b0ccff', '#1e2e6a'],
]

// Lights in three sets that dim in turns.
type Lights = [Art, Art, Art]
const lightSet = (): Lights => [new Art(), new Art(), new Art()]
const lightsSvg = (l: Lights): string => l.map((a, i) => px(a.svg(), `l${'abc'[i]}`)).join('')

function tree(): string {
  // The plain needles fill the whole shape underneath; the light, the shade and the snow are drawn
  // over them, so the big plain areas stay cheap to write.
  const base = new Art()
  const body = new Art()
  const top = TIERS[TIERS.length - 1]?.[0] ?? -151
  const has = (x: number, y: number): boolean => owner(x, y) >= 0

  for (let y = top; y <= 0; y++) {
    for (let x = -44; x <= 44; x++) {
      const t = owner(x, y)

      if (t < 0) {
        continue
      }
      const tier = TIERS[t] ?? [0, 0, 0]
      const u = x / Math.max(1, tierHw(tier, y))
      // The borders between lit, plain and shade step on alternate rows, so the light falls off softly.
      const step = (y & 1) * 0.08
      let fill = u < -0.36 + step ? 'url(#firl)' : u > 0.44 - step ? 'url(#fird)' : 'url(#fir)'

      // In the shadow of the tier hanging over it, and under each bough.
      if (owner(x, y - 1) > t || owner(x, y - 2) > t || !has(x, y + 1)) {
        fill = 'url(#fird)'
      }
      if (!has(x - 1, y)) {
        fill = '#3e7e52'
      }
      // Snow along the tops of the boughs.
      if (!has(x, y - 1)) {
        fill = x < 4 ? '#e6ecf8' : '#a8b0d4'
      } else if (!has(x - 1, y - 1) || !has(x + 1, y - 1)) {
        fill = x < 4 ? '#c4cce6' : '#8890b8'
      }
      base.set(x, y, 'url(#fir)')
      if (fill !== 'url(#fir)') {
        body.set(x, y, fill)
      }
    }
  }
  // The trunk under the lowest tier.
  for (let y = -10; y <= 0; y++) {
    body.rect(-3, y, 7, 1, '#4a2a1a')
    body.set(-3, y, '#7a4a2e')
    body.set(3, y, '#2a160c')
  }
  // Garland and bulbs, wound round each tier as a sagging swag, and baubles between.
  const beads = new Art()
  const lights = lightSet()
  let n = 0

  TIERS.slice(0, -1).forEach((tier, t) => {
    const yc = tier[1] - 13 + (t === 0 ? 2 : 0)
    const hwAt = tierHw(tier, yc)

    for (let x = -Math.floor(hwAt); x <= Math.floor(hwAt); x++) {
      const y = Math.round(yc + 0.16 * x + 3.5 * (1 - (x / hwAt) ** 2))

      if (owner(x, y) !== t) {
        continue
      }
      beads.set(x, y, (x & 1) === 0 ? '#f0c860' : '#b8862e')
      if ((x + t * 2) % 5 === 0 && owner(x, y + 2) === t && owner(x + 1, y + 2) === t) {
        lights[n % 3]?.rect(x, y + 1, 2, 2, BULBS[n % BULBS.length] ?? '#fff0c0')
        lights[n % 3]?.set(x, y + 1, '#ffffff')
        n++
      }
    }
  })
  const balls = new Art()
  const rand = seeded(41)

  for (let i = 0, tries = 0; i < 22 && tries < 400; tries++) {
    const t = Math.floor(rand() * (TIERS.length - 1))
    const tier = TIERS[t] ?? [0, 0, 0]
    const y = Math.floor(tier[0] + 10 + rand() * (tier[1] - tier[0] - 16))
    const hw = tierHw(tier, y) - 4
    const x = Math.round((rand() * 2 - 1) * hw)

    if (hw < 2 || ![-1, 0, 1, 2, 3, 4].every(k => owner(x, y + k) === t && owner(x + 3, y + k) === t) || beads.has(x + 1, y + 1) || balls.has(x, y) || balls.has(x + 3, y + 3) || balls.has(x + 1, y - 2) || balls.has(x + 2, y + 5)) {
      continue
    }
    const [c, hi, lo] = BAUBLES[i % BAUBLES.length] ?? ['#e0404a', '#ff9a8a', '#8a1a26']

    balls.rect(x + 1, y - 1, 2, 1, '#8a8070')
    balls.rect(x + 1, y, 2, 4, c)
    balls.rect(x, y + 1, 4, 2, c)
    balls.set(x + 1, y + 1, hi)
    balls.set(x + 3, y + 2, lo)
    balls.set(x + 2, y + 3, lo)
    i++
  }

  return (
    px(glow(0, -70, 70, 90, 'g-tree', 0.5)) +
    px(base.svg() + body.svg() + beads.svg() + balls.svg()) +
    lightsSvg(lights) +
    star(top - 5) +
    presents()
  )
}

// The star on top, its glow pulsing slowly.
function star(cy: number): string {
  const a = new Art()
  const pts: [number, number][] = []

  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? 8.5 : 3.6

    pts.push([Math.cos(ang) * r, Math.sin(ang) * r])
  }
  const inside = (x: number, y: number): boolean => {
    let c = false

    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i] ?? [0, 0]
      const [xj, yj] = pts[j] ?? [0, 0]

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        c = !c
      }
    }

    return c
  }

  for (let y = -9; y <= 9; y++) {
    for (let x = -9; x <= 9; x++) {
      if (!inside(x, y)) {
        continue
      }
      const d = Math.hypot(x, y)

      a.set(x, cy + y, d < 1.5 ? '#fffbe8' : !inside(x, y - 1) || !inside(x - 1, y) ? (x <= 0 ? '#fff0b0' : '#ffd870') : x + y > 2 ? '#d08a20' : '#ffc84a')
    }
  }

  return px(glow(0, cy, 26, 26, 'g-star', 0.85, 'shine') + a.svg())
}

// Presents in the snow at the tree's foot, on a drift of snow round the trunk.
function presents(): string {
  const drift = new Art()

  for (let x = -60; x <= 60; x++) {
    const top = -Math.round(3.4 * Math.sqrt(Math.max(0, 1 - (x / 60) ** 2)))

    drift.rect(x, top + 1, 1, 8 - top, 'url(#snow)')
    drift.set(x, top, x < 0 ? '#cfd4ee' : '#a8aed2')
  }
  const a = new Art()
  // [x, width, height, box, box shade, ribbon]
  const boxes: [number, number, number, string, string, string][] = [
    [-38, 13, 9, '#b8323a', '#7a1a24', '#f0c050'],
    [-23, 10, 12, '#2e7a4a', '#1a4a2c', '#e8404a'],
    [-11, 8, 6, '#7a3a8a', '#4a1e56', '#f0c050'],
    [12, 14, 8, '#d8a040', '#8a5e1c', '#c8323a'],
    [28, 9, 11, '#3a5a9a', '#1e305a', '#e8ecf8'],
  ]

  for (const [x, w, h, box, shade, ribbon] of boxes) {
    const y = 1 - h

    a.rect(x, y, w, h, box)
    a.rect(x + w - 2, y, 2, h, shade)
    a.rect(x, y, w, 1, x < 0 ? '#e6ecf8' : '#c4cae6')
    const rx = x + Math.floor(w / 2) - 1

    a.rect(rx, y + 1, 2, h - 1, ribbon)
    a.rect(x, y + Math.floor(h / 2), w, 1, ribbon)
    // The bow.
    a.set(rx - 2, y - 1, ribbon)
    a.set(rx - 1, y - 2, ribbon)
    a.set(rx + 2, y - 2, ribbon)
    a.set(rx + 3, y - 1, ribbon)
    a.rect(rx, y - 1, 2, 1, ribbon)
  }

  return px(glow(0, -2, 64, 12, 'g-warm', 0.7) + drift.svg() + a.svg())
}

// ---------- the cabin (the frame's bottom left at the origin) ----------

// One window, its top left at (x, y), w by h, glowing with firelight.
function cabinWindow(a: Art, x: number, y: number, w: number, h: number): string {
  a.rect(x - 1, y - 1, w + 2, h + 2, '#24120a')
  for (let r = 0; r < h; r++) {
    a.rect(x, y + r, w, 1, r < 2 ? '#ffe7a8' : r < h - 3 ? '#ffcf6a' : '#f0a040')
  }
  const mx = x + Math.floor(w / 2)

  a.rect(mx, y, 1, h, '#3a1e10')
  a.rect(x, y + Math.floor(h / 2), w, 1, '#3a1e10')
  a.rect(x - 2, y + h + 1, w + 4, 1, '#e6ecf8')
  a.set(x + 1, y + h + 2, '#cfe0f4')

  return glow(x + w / 2, y + h / 2, w * 1.4, h * 1.4, 'g-warm', 0.55, 'flame') + glow(x + w / 2, -12, w * 1.4, 5, 'g-warm', 0.6, 'flame')
}

function cabin(): string {
  const ground = new Art()

  for (let x = -20; x <= 130; x++) {
    const top = -15 + Math.round(Math.sin(x * 0.07) * 1.2 + (x > 110 ? (x - 110) * 0.15 : 0))

    ground.rect(x, top + 1, 1, 15 - top, 'url(#snow)')
    ground.set(x, top, '#b8bcdc')
  }
  const wall = new Art()
  const L = 22
  const R = 86

  wall.rect(L, -42, R - L + 1, 28, 'url(#logs)')
  // Log ends at the corners.
  for (let y = -42; y < -14; y++) {
    const k = (((y + 42) % 4) + 4) % 4
    const end = ['#b07a4c', '#8a5a36', '#6a4028', '#2a160c'][k] ?? '#6a4028'

    wall.rect(L - 2, y, 2, 1, end)
    wall.rect(R + 1, y, 2, 1, k === 0 ? '#8a5a36' : end)
  }
  const lights = lightSet()
  const glows = cabinWindow(wall, 28, -36, 11, 9) + cabinWindow(wall, 68, -36, 11, 9)

  // The door, a wreath on it.
  wall.rect(46, -36, 11, 22, '#24120a')
  wall.rect(47, -35, 9, 21, 'url(#plank)')
  wall.rect(47, -35, 1, 21, '#7a4428')
  wall.set(54, -24, '#f0c860')
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dy)

      if (d <= 3.9 && d >= 1.8) {
        wall.set(51 + dx, -29 + dy, hash(dx, dy, 3) > 0.75 ? '#d8303a' : dx + dy < 0 ? '#4a9a50' : '#245a30')
      }
    }
  }
  wall.rect(50, -25, 3, 1, '#e8404a')
  wall.set(49, -24, '#e8404a')
  wall.set(53, -24, '#e8404a')
  // The roof, under a deep blanket of snow, its lip curling over the eave.
  const roof = new Art()

  for (let y = -62; y <= -44; y++) {
    const k = (-44 - y) * (16 / 18)
    const xl = Math.round(14 + k)
    const xr = Math.round(94 - k)

    roof.rect(xl, y, xr - xl + 1, 1, 'url(#snowr)')
    roof.set(xl, y, '#dfe5f6')
    roof.set(xr, y, '#7e86b0')
  }
  roof.rect(30, -63, 49, 1, '#eef2fc')
  roof.rect(29, -62, 2, 1, '#eef2fc')
  roof.rect(12, -44, 85, 2, '#c8cee8')
  roof.rect(12, -42, 85, 1, '#8a92ba')
  roof.rect(13, -41, 83, 1, '#2a160e')
  for (let x = 14; x < 96; x += 3 + Math.floor(hash(x, 1) * 2)) {
    const len = 1 + Math.floor(hash(x, 2) * 4)

    roof.rect(x, -40, 1, len, '#bcd0ec')
    roof.set(x, -41 + len, '#e8f2ff')
  }
  // The stone chimney, snow on its top, smoke rising.
  roof.rect(66, -70, 8, 14, 'url(#stone)')
  roof.rect(66, -70, 1, 14, '#8a7a80')
  roof.rect(73, -70, 1, 14, '#2a2028')
  roof.rect(65, -72, 10, 2, '#e6ecf8')
  roof.rect(66, -73, 8, 1, '#eef2fc')
  roof.rect(66, -57, 8, 2, '#c8cee8')
  let smoke = ''

  for (let i = 0; i < 3; i++) {
    const p = new Art()

    p.disc(70, -76, 2.2 + i * 0.4, '#4e4864')
    p.set(69, -77, '#6a6482')
    smoke += `<g class="pf" style="animation-delay:-${i * 3}s">${p.svg()}</g>`
  }
  // Bulbs along the eave, the wire sagging between hooks.
  for (let x = 14, i = 0; x <= 94; x++) {
    const y = -40 + Math.round(2 * Math.sin((Math.PI * ((x - 14) % 16)) / 16))

    roof.set(x, y, '#1a120e')
    if ((x - 16) % 4 === 0) {
      lights[i % 3]?.rect(x, y + 1, 1, 2, BULBS[(i + 1) % BULBS.length] ?? '#fff0c0')
      i++
    }
  }

  return px(ground.svg() + glows) + px(roof.svg() + smoke) + px(wall.svg()) + lightsSvg(lights) + px(snowman(95, -6))
}

// The snowman in front of the cabin, standing at (cx, foot): three balls of snow lit from the
// left, coal eyes and buttons, a carrot nose, a striped scarf, twig arms and a knitted hat.
function snowman(cx: number, foot: number): string {
  const a = new Art()
  const ball = (cy: number, r: number): void => {
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (dx * dx + dy * dy > r * r + r * 0.4) {
          continue
        }
        const t = (dx - dy * 0.5) / r

        a.set(cx + dx, cy + dy, dy >= r - 0.5 ? '#6a7098' : t < -0.45 ? '#eef2fc' : t < 0.4 ? '#c4cae6' : '#8a92ba')
      }
    }
  }
  const head = foot - 28

  ball(foot - 7, 7)
  ball(foot - 18, 5.2)
  ball(head, 4)
  // Coal eyes and smile, a carrot nose pointing at the cabin.
  a.set(cx - 2, head - 1, '#1a1418')
  a.set(cx + 1, head - 1, '#1a1418')
  for (const x of [cx - 2, cx - 1, cx, cx + 1]) {
    a.set(x, head + 2 - (x === cx - 2 || x === cx + 1 ? 1 : 0), '#2a2228')
  }
  a.rect(cx - 5, head, 4, 1, '#f08a2a')
  a.set(cx - 5, head, '#c8601a')
  a.set(cx - 2, head + 1, '#d8701e')
  for (const y of [foot - 21, foot - 17, foot - 11, foot - 6]) {
    a.set(cx, y, '#1a1418')
  }
  // The scarf, its end hanging down.
  for (let x = cx - 4; x <= cx + 4; x++) {
    a.rect(x, foot - 24, 1, 2, ((x - cx) & 2) === 0 ? '#d8303a' : '#2e7a4a')
  }
  a.rect(cx + 2, foot - 22, 3, 6, '#d8303a')
  a.rect(cx + 2, foot - 20, 3, 1, '#2e7a4a')
  a.rect(cx + 2, foot - 17, 3, 1, '#2e7a4a')
  a.rect(cx + 4, foot - 22, 1, 6, '#9a1e28')
  // Twig arms, each with a twig forking off.
  for (let i = 0; i < 8; i++) {
    a.set(cx - 5 - i, foot - 20 - Math.floor(i * 0.6), '#5a3a22')
    a.set(cx + 5 + i, foot - 20 - Math.floor(i * 0.6), '#4a2e1a')
  }
  a.set(cx - 11, foot - 26, '#5a3a22')
  a.set(cx - 10, foot - 25, '#5a3a22')
  a.set(cx + 11, foot - 26, '#4a2e1a')
  a.set(cx + 10, foot - 25, '#4a2e1a')
  // A knitted hat, its brim turned up, a bobble on top.
  a.rect(cx - 4, head - 4, 9, 2, '#e8ecf8')
  a.rect(cx - 3, head - 7, 7, 3, '#c8323a')
  a.rect(cx - 2, head - 8, 5, 1, '#c8323a')
  a.rect(cx - 3, head - 7, 2, 2, '#e8545a')
  a.rect(cx + 3, head - 7, 1, 3, '#8a1a24')
  a.disc(cx, head - 10, 1, '#f4f6ff')

  return a.svg()
}

// ---------- the corners ----------

// A holly leaf, its stem at (x0, y0), pointing at angle `ang` (radians), `len` long.
function holly(a: Art, x0: number, y0: number, ang: number, len: number): void {
  const c = Math.cos(ang)
  const s = Math.sin(ang)

  for (let y = -len; y <= len; y++) {
    for (let x = -len; x <= len; x++) {
      const u = x * c + y * s
      const v = -x * s + y * c

      if (u < 0 || u > len) {
        continue
      }
      const spike = Math.abs(Math.sin((u / len) * Math.PI * 2.5))
      const hw = 4.4 * Math.sin((Math.PI * u) / len) ** 0.6 + (spike > 0.8 ? 1.6 : 0) - (spike < 0.25 ? 0.8 : 0)

      if (Math.abs(v) > hw) {
        continue
      }
      a.set(x0 + x, y0 + y, Math.abs(v) < 0.55 ? '#6aa86a' : Math.abs(v) > hw - 0.9 ? '#0e3420' : v < 0 ? '#2f7a44' : '#1b4a2c')
    }
  }
}

// Top left, from the frame's corner: holly leaves and clusters of red berries.
function hollyCorner(): string {
  const a = new Art()

  holly(a, 0, 2, 0.32, 20)
  holly(a, 4, -2, 1.25, 18)
  holly(a, 14, 8, 0.05, 17)
  holly(a, 10, 10, 0.95, 16)
  holly(a, 26, 6, 0.55, 15)
  for (const [bx, by] of [[18, 13], [21, 15], [17, 17], [30, 12], [33, 14], [7, 22], [10, 24]] as const) {
    a.disc(bx, by, 1.6, '#c8202c')
    a.set(bx - 1, by - 1, '#ff8a7a')
    a.set(bx + 1, by + 1, '#7a1018')
  }

  return px(a.svg())
}

// Top right, from the frame's corner: a strand of big bulbs sagging along the top, each glowing.
function strand(): string {
  const wire = new Art()
  const lights = lightSet()
  let halos = ['', '', '']

  for (let x = 2, i = 0; x >= -96; x--) {
    const seg = ((-x % 32) + 32) % 32
    const y = 3 + Math.round(9 * Math.sin((Math.PI * seg) / 32)) + Math.round(-x * 0.04)

    wire.set(x, y, '#2a2418')
    if (seg % 8 === 4) {
      const color = BULBS[i % BULBS.length] ?? '#fff0c0'
      const l = lights[i % 3]

      wire.rect(x, y + 1, 2, 1, '#8a7040')
      l?.rect(x, y + 2, 2, 3, color)
      l?.rect(x - 1, y + 3, 4, 1, color)
      l?.set(x, y + 2, '#ffffff')
      halos[i % 3] += glow(x + 0.5, y + 3.5, 6, 6, 'g-warm', 0.8)
      i++
    }
  }
  halos = halos.map((h, i) => px(h, `l${'abc'[i]}`))

  return px(wire.svg()) + halos.join('') + lightsSvg(lights)
}

// ---------- the sleigh, crossing the sky now and then (the sleigh at the origin) ----------

function reindeer(still: Art, legsA: Art, legsB: Art, x: number, y: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      if (Math.hypot(dx / 5.4, dy / 2.4) <= 1) {
        still.set(x + dx, y + dy, dy === -2 ? '#a8784c' : dy === 2 ? '#4a2e1e' : '#7a5236')
      }
    }
  }
  still.rect(x - 7, y - 3, 2, 2, '#7a5236')
  still.rect(x - 9, y - 5, 3, 2, '#7a5236')
  still.set(x - 9, y - 5, '#a8784c')
  still.set(x - 10, y - 4, '#5a3a26')
  for (const [dx, dy] of [[-7, -6], [-6, -7], [-8, -7], [-5, -8], [-8, -8], [-9, -8]] as const) {
    still.set(x + dx, y + dy, '#d8b888')
  }
  still.set(x + 5, y - 2, '#e8d8c0')
  still.set(x - 5, y - 1, '#e0b050')
  for (const [dx, dy] of [[-4, 3], [-5, 4], [-6, 5], [4, 3], [5, 4], [6, 5]] as const) {
    legsA.set(x + dx, y + dy, '#4a2e1e')
  }
  for (const [dx, dy] of [[-3, 3], [-3, 4], [-2, 5], [3, 3], [3, 4], [2, 5]] as const) {
    legsB.set(x + dx, y + dy, '#4a2e1e')
  }
}

function sleigh(): string {
  const a = new Art()
  const legsA = new Art()
  const legsB = new Art()

  for (let x = -34; x <= -4; x += 2) {
    a.set(x, -2 + Math.round((x + 34) / 15), '#c8a040')
  }
  reindeer(a, legsA, legsB, -14, 0)
  reindeer(a, legsA, legsB, -32, -1)
  // The sleigh: gold runners curling up at the front, a red body with gold trim, a sack of
  // presents and its driver in red.
  a.rect(-3, 4, 18, 1, '#e0b850')
  for (const [x, y] of [[-4, 3], [-5, 2], [-5, 1], [-4, 0], [1, 3], [11, 3]] as const) {
    a.set(x, y, '#e0b850')
  }
  a.rect(-1, -2, 15, 5, '#c0303a')
  a.rect(-1, -2, 15, 1, '#e04a50')
  a.rect(-1, 2, 15, 1, '#7a1a24')
  a.rect(-1, -3, 15, 1, '#e8c060')
  a.rect(-2, -1, 1, 3, '#c0303a')
  a.set(-3, -2, '#e8c060')
  a.rect(10, -8, 5, 5, '#8a6440')
  a.rect(10, -8, 5, 1, '#a8804e')
  a.set(12, -9, '#8a6440')
  a.rect(5, -8, 4, 5, '#c8323a')
  a.rect(5, -4, 4, 1, '#f0f0f0')
  a.rect(6, -10, 2, 1, '#f0c8a0')
  a.rect(5, -9, 3, 1, '#f4f4f4')
  a.rect(6, -11, 3, 1, '#c8323a')
  a.set(8, -12, '#c8323a')
  a.set(9, -12, '#f4f4f4')
  // A trail of sparkle behind.
  const trail = [[17, 1, '#ffe08a'], [20, -1, '#ffe08a'], [23, 2, '#e8c070'], [27, 0, '#c8a070'], [31, 2, '#8a7a7a'], [36, 0, '#6a5e6e']] as const

  for (const [x, y, c] of trail) {
    a.set(x, y, c)
  }

  return px(`<g class="fly">${a.svg()}<g class="ga">${legsA.svg()}</g><g class="gb">${legsB.svg()}</g></g>`)
}

// ---------- layout ----------
//
// The tree stands at the right, past the conversation, cropped by the frame's edge where it must
// be; the cabin and the snowman at the left, the moon over them. Holly hangs into the top-left
// corner, the strand of bulbs along the top right. The sky, the hills, the village and the snow
// span the width, calm under the veil. Phones have no sidebar, so all of it draws in and shrinks.

type Spots = Record<'tree' | 'cabin' | 'moon' | 'holly' | 'strand' | 'sleigh', Spot>

function spots(a: number, tallestA: number): Spots {
  const { v, left, right } = visible(a)
  const shown = Math.min(H, W / tallestA)
  const top = (H - shown) / 2
  const bottom = top + shown
  const phone = a < 0.8
  const s = phone ? 0.5 : Math.min(1, shown / H, Math.max(0.6, 0.45 + (v / W) * 0.55))

  return {
    tree: [right - v * (phone ? 0.24 : 0.13), bottom - 70 * s, s],
    cabin: [left + v * (phone ? 0.02 : 0.03), bottom, s],
    moon: [left + v * (phone ? 0.3 : 0.2), top + 190 * s, s],
    holly: [left, top, s],
    strand: [right, top, s],
    sleigh: [right + 40, top + 320 * s, s],
  }
}

const { css: LAYOUT, placed } = layout(spots)

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<defs>
${PATTERNS}
${grad('g-moon', '#ffe2b0', 0.32)}
${grad('g-tree', '#ffb860', 0.28)}
${grad('g-star', '#ffd870', 0.75)}
${grad('g-warm', '#ffb050', 0.55)}
<linearGradient id="g-mist" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e08a6a" stop-opacity="0"/><stop offset="1" stop-color="#e08a6a" stop-opacity="0.2"/></linearGradient>
${farPine()}
${scrimGradient('#0c0808')}
</defs>
<style>
${LAYOUT}

  /* Every animation steps, so the scene redraws only when a frame changes. All of it is slow. */
  .tw { animation: tw 9s step-end infinite; }
  @keyframes tw { 0% { opacity: 1; } 50% { opacity: 0.3; } }

  /* The lights dim in three sets, in turns. */
  .la, .lb, .lc { animation: blink 6s step-end infinite; }
  .lb { animation-delay: -2s; }
  .lc { animation-delay: -4s; }
  @keyframes blink { 0% { opacity: 1; } 66% { opacity: 0.3; } }

  .shine { animation: shine 7s step-end infinite; }
  @keyframes shine { 0% { opacity: 1; } 50% { opacity: 0.7; } }

  .flame { animation: flame 5s step-end infinite; }
  @keyframes flame { 0% { opacity: 1; } 35% { opacity: 0.8; } 50% { opacity: 0.95; } 80% { opacity: 0.86; } }

  .pf { opacity: 0; animation: puff 9s steps(18) infinite; }
  @keyframes puff {
    0% { opacity: 0.8; transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(8px, -30px); }
  }

  /* Snow falls a frame's height and starts over. */
  .sf { animation: fall 150s steps(200) infinite; }
  .sn { animation: fall 90s steps(200) infinite; }
  @keyframes fall { from { transform: translate(0, 0); } to { transform: translate(40px, ${H}px); } }

  /* The sleigh crosses the sky about every minute and a half, the reindeer galloping. */
  .fly { opacity: 0; animation: fly 90s infinite; animation-delay: -6s; }
  @keyframes fly {
    0% { opacity: 1; transform: translate(0, 0); animation-timing-function: steps(150); }
    36% { opacity: 1; transform: translate(-310px, -26px); animation-timing-function: steps(1); }
    37%, 100% { opacity: 0; transform: translate(-310px, -26px); }
  }
  .ga, .gb { animation: gallop 0.8s step-end infinite; }
  .gb { opacity: 0; animation-delay: -0.4s; }
  @keyframes gallop { 0% { opacity: 1; } 50% { opacity: 0; } }

  @media (prefers-reduced-motion: reduce) {
    .tw, .la, .lb, .lc, .shine, .flame, .pf, .sf, .sn, .fly, .ga, .gb { animation: none; }
  }
</style>
${skyBands(SKY)}
${stars()}
${placed('moon', moon())}
${placed('sleigh', sleigh())}
${hills()}
${snowfall('sf', 11, 90, false)}
${foreground()}
${placed('cabin', cabin())}
${placed('tree', tree())}
${snowfall('sn', 23, 60, true)}
${placed('holly', hollyCorner())}
${placed('strand', strand())}
${SCRIM}
</svg>`

export const christmasEve: Look = {
  id: 'christmas-eve',
  label: 'Christmas eve',
  description: 'Pixel-art Christmas eve: a lit tree with presents in the snow, a glowing log cabin and a snowman under a full moon',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'christmas-eve', glass: { blur: 0, tint: '#0e0909', opacity: 0.3 } },
  },
  scenes: {
    'christmas-eve': {
      source: SCENE,
      alt: 'Pixel art of a snowy Christmas eve: a tall fir heavy with snow, wrapped in gold garland and twinkling coloured bulbs, hung with baubles, a glowing star on top and presents in the snow at its foot; a log cabin under a thick roof of snow with icicles, firelit windows, a wreath on the door, bulbs along the eave and smoke from its stone chimney, a snowman in a striped scarf in front; a full moon, a sleigh crossing the sky, snowy hills with pines and a village of lit windows, falling snow, holly in the top-left corner and a strand of big bulbs along the top right',
    },
  },
}
