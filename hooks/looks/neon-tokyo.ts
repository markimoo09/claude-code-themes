import type { Look } from './types'

import { makeColors } from '../make-colors.js'

// Tokyo at night, drawn as pixel art. A full moon with the Skytree's lattice crossing it, Mt Fuji
// dusky on the horizon, the orange-lit Tokyo Tower over a neon skyline of katakana signs
// (ラーメン, カラオケ, トウキョウ), an elevated line with the last car of a train leaving it, a
// scramble crossing with pedestrians, a cherry tree hung with red lanterns dropping petals, and
// a glowing vending machine with a black cat on top.
// The accent is the neon sakura pink; red stays the lanterns' and means danger in the app.
const { theme, problems } = makeColors({
  label: 'Neon Tokyo',
  only: 'dark',
  roles: {
    accent: '#ff6fb5',
    danger: '#ff5a4f',
    success: '#5fd39a',
    warning: '#ffbe55',
    pro: '#a58bff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0c0a18',
        'surface-1': '#110e20',
        'surface-2': '#161228',
        'surface-3': '#1a162e',
        'text-primary': '#f3f0fb',
        'text-secondary': '#cbc5de',
        'text-muted': '#a7a0c0',
      },
    },
  },
})

// ---------- a pixel canvas ----------
//
// Every sprite is drawn into an Art, cell by cell, in art pixels (PX scene units each). It is
// written out as one <path> per color: runs of a color on a row, merged down the rows into
// rectangles where they line up. A fill can also be a pattern, such as the towers' lattices.

const PX = 5
const W = 1600
const H = 1000
const GW = W / PX // 320 art pixels across
const GH = H / PX // 200 down

const OFFSET = 4096
const ROW = 16384

type Run = { x: number; y: number; w: number; h: number; fill: string }

class Art {
  private readonly cells = new Map<number, string>()

  set(x: number, y: number, fill: string | undefined): void {
    const k = (Math.round(y) + OFFSET) * ROW + Math.round(x) + OFFSET

    if (fill === undefined) {
      this.cells.delete(k)
    } else {
      this.cells.set(k, fill)
    }
  }

  has(x: number, y: number): boolean {
    return this.cells.has((Math.round(y) + OFFSET) * ROW + Math.round(x) + OFFSET)
  }

  rect(x: number, y: number, w: number, h: number, fill: string): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.set(x + i, y + j, fill)
      }
    }
  }

  disc(cx: number, cy: number, r: number, fill: string): void {
    const R = Math.ceil(r)

    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy <= r * r + r * 0.5) {
          this.set(cx + dx, cy + dy, fill)
        }
      }
    }
  }

  svg(): string {
    const rows = new Map<number, [number, string][]>()

    for (const [k, fill] of this.cells) {
      const y = Math.floor(k / ROW) - OFFSET
      const row = rows.get(y) ?? []

      row.push([(k % ROW) - OFFSET, fill])
      rows.set(y, row)
    }
    const runs: Run[] = []
    let open = new Map<string, Run>()

    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const row = (rows.get(y) ?? []).sort((a, b) => a[0] - b[0])
      const next = new Map<string, Run>()
      let i = 0

      while (i < row.length) {
        const [x, fill] = row[i] ?? [0, '']
        let j = i + 1

        while (j < row.length && (row[j]?.[0] ?? 0) === (row[j - 1]?.[0] ?? 0) + 1 && row[j]?.[1] === fill) {
          j++
        }
        const key = `${x},${j - i},${fill}`
        const above = open.get(key)

        if (above !== undefined && above.y + above.h === y) {
          above.h++
          next.set(key, above)
        } else {
          const run = { x, y, w: j - i, h: 1, fill }

          runs.push(run)
          next.set(key, run)
        }
        i = j
      }
      open = next
    }
    const byFill = new Map<string, string>()

    for (const r of runs) {
      byFill.set(r.fill, `${byFill.get(r.fill) ?? ''}M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`)
    }

    return [...byFill].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')
  }
}

// An Art's paths at art-pixel scale, with an optional class.
const px = (inner: string, cls?: string): string =>
  `<g${cls === undefined ? '' : ` class="${cls}"`} transform="scale(${PX})">${inner}</g>`

const hash = (x: number, y: number, s = 0): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453

  return n - Math.floor(n)
}

function seeded(seed: number): () => number {
  let s = seed

  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// A soft round glow from a gradient in <defs>, in art pixels.
const glow = (cx: number, cy: number, rx: number, ry: number, id: string, opacity = 1, cls?: string): string =>
  `<ellipse${cls === undefined ? '' : ` class="${cls}"`} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})" opacity="${opacity}"/>`

// ---------- katakana for the neon signs, 5 by 6 ----------

const GLYPHS: Record<string, readonly string[]> = {
  ラ: ['.###.', '.....', '#####', '....#', '...#.', '.##..'],
  ー: ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], // the long mark, upright for vertical text
  メ: ['....#', '...#.', '.##..', '..##.', '.#..#', '#....'],
  ン: ['#....', '.#..#', '....#', '...#.', '..#..', '##...'],
  カ: ['..#..', '#####', '..#.#', '..#.#', '.#..#', '#..##'],
  オ: ['...#.', '#####', '...#.', '..##.', '.#.#.', '#.##.'],
  ケ: ['.#...', '.####', '#..#.', '...#.', '..#..', '.#...'],
  ト: ['.#...', '.#...', '.##..', '.#.#.', '.#...', '.#...'],
  ウ: ['..#..', '#####', '#...#', '....#', '...#.', '.##..'],
  キ: ['..#..', '#####', '..#..', '#####', '..#..', '..#..'],
  ョ: ['.....', '.###.', '...#.', '.###.', '...#.', '.###.'],
}

type SignColors = { bg: string; border: string; glyph: string }

// A neon sign: a lit border and dark face in `frame`, the letters in `letters` (so they can
// flicker on their own). Returns its size in art pixels.
function sign(frame: Art, letters: Art, x: number, y: number, text: string, vertical: boolean, c: SignColors): [number, number] {
  const chars = [...text]
  const iw = vertical ? 5 : chars.length * 6 - 1
  const ih = vertical ? chars.length * 8 - 2 : 6

  frame.rect(x, y, iw + 4, ih + 4, c.border)
  frame.rect(x + 1, y + 1, iw + 2, ih + 2, c.bg)
  chars.forEach((ch, i) => {
    const gx = x + 2 + (vertical ? 0 : i * 6)
    const gy = y + 2 + (vertical ? i * 8 : 0)

    ;(GLYPHS[ch] ?? []).forEach((row, ry) => {
      ;[...row].forEach((cell, rx) => {
        if (cell === '#') {
          letters.set(gx + rx, gy + ry, c.glyph)
        }
      })
    })
  })

  return [iw + 4, ih + 4]
}

// Lit windows: most still, a few in two sets that switch off and on at their own pace.
type Windows = { still: Art; a: Art; b: Art }
const windowSet = (): Windows => ({ still: new Art(), a: new Art(), b: new Art() })
const WINDOW_COLORS = ['#ffd27a', '#ffd27a', '#ffd27a', '#fff0c2', '#86d8ff', '#86d8ff', '#ff8fd2']

function windowsIn(win: Windows, rand: () => number, x: number, top: number, w: number, bottom: number, step: [number, number], size: [number, number], lit: number): void {
  for (let wy = top + 2; wy + size[1] <= bottom; wy += step[1]) {
    for (let wx = x + 2; wx + size[0] <= x + w - 1; wx += step[0]) {
      const r = rand()

      if (r < lit) {
        const layer = r < lit * 0.1 ? win.a : r < lit * 0.2 ? win.b : win.still

        layer.rect(wx, wy, size[0], size[1], WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)] ?? '#ffd27a')
      }
    }
  }
}

const windowsSvg = (win: Windows): string => px(win.still.svg()) + px(win.a.svg(), 'win-a') + px(win.b.svg(), 'win-b')

// ---------- sky ----------

const SKY: readonly [number, string][] = [
  [0, '#08061a'],
  [20, '#0c0922'],
  [40, '#110c2c'],
  [60, '#170f37'],
  [80, '#1f1242'],
  [98, '#29154c'],
  [114, '#371957'],
  [128, '#481d5f'],
  [140, '#5c2264'],
  [152, '#702868'],
]

// Bands of color down the sky, each meeting the next over a few rows of line dithering.
function sky(): string {
  const a = new Art()

  for (let y = 0; y < GH; y++) {
    let i = 0

    while (i + 1 < SKY.length && (SKY[i + 1]?.[0] ?? GH) <= y) {
      i++
    }
    const next = SKY[i + 1]
    const d = next === undefined ? 0 : next[0] - y

    a.rect(0, y, GW, 1, next !== undefined && (d === 1 || d === 3) ? next[1] : (SKY[i]?.[1] ?? '#08061a'))
  }

  return px(a.svg())
}

function stars(): string {
  const rand = seeded(7)
  const still = new Art()
  const twA = new Art()
  const twB = new Art()

  for (let i = 0; i < 170; i++) {
    const x = Math.floor(rand() * GW)
    const y = Math.floor(rand() ** 1.4 * 118)
    const m = rand()
    const layer = m > 0.7 && i % 3 === 0 ? (i % 2 === 0 ? twA : twB) : still

    if (m > 0.95) {
      ;[[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => layer.set(x + (dx ?? 0), y + (dy ?? 0), '#8f88cf'))
      layer.set(x, y, '#ffffff')
    } else {
      layer.set(x, y, m > 0.75 ? '#f2eeff' : m > 0.45 ? '#b3acd9' : '#655e98')
    }
  }

  return px(still.svg()) + px(twA.svg(), 'tw-a') + px(twB.svg(), 'tw-b')
}

// A shooting star that crosses now and then.
function meteor(): string {
  const a = new Art()

  ;['#ffffff', '#e4defc', '#b7aee6', '#8a80c4', '#665d9f', '#4b437f'].forEach((fill, i) => a.set(i * 2, -i, fill))
  ;['#e4defc', '#b7aee6', '#8a80c4', '#665d9f'].forEach((fill, i) => a.set(i * 2 + 1, -i, fill))

  return `<g transform="translate(1180 70)">${px(`<g class="meteor">${a.svg()}</g>`)}</g>`
}

// ---------- the moon (centred on its group's origin) ----------

function moon(): string {
  const halo = ([[27, 0.05], [22, 0.07], [18.5, 0.09]] as const)
    .map(([r, o]) => {
      const a = new Art()

      a.disc(0, 0, r, '#c8b8ff')

      return `<g opacity="${o}">${a.svg()}</g>`
    })
    .join('')
  const body = new Art()
  const r = 15

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy

      if (d2 > r * r + r * 0.5) {
        continue
      }
      const side = dx * 0.7 + dy * 0.7
      const rim = Math.sqrt(d2) > r - 1.3
      let fill = side > 6 ? '#e6d8b0' : '#f6edd0'

      if (rim) {
        fill = side > 0 ? '#d2c193' : side < -4 ? '#fffaf0' : fill
      }
      body.set(dx, dy, fill)
    }
  }
  for (const [cx, cy, cr] of [[-5, -4, 2.2], [4, 3, 3], [-3, 7, 1.4], [6, -6, 1.6], [-9, 2, 1.2], [9, 7, 1]] as const) {
    body.disc(cx, cy, cr, '#e2d3a6')
    body.set(cx - 1, cy - 1, '#cfbd8b')
  }
  // Thin night clouds drifting across its face.
  const clouds = new Art()
  const streak = (x: number, y: number, len: number): void => {
    clouds.rect(x + 3, y, len - 6, 1, '#4b3c86')
    clouds.rect(x, y + 1, len, 1, '#33296a')
    clouds.rect(x + 2, y + 2, len - 5, 1, '#2a2160')
  }

  streak(-36, 7, 40)
  streak(6, 12, 30)
  streak(-22, -12, 20)

  return px(halo + body.svg()) + px(`<g class="drift">${clouds.svg()}</g>`)
}

// ---------- Mt Fuji (peak at its origin) ----------

function fuji(): string {
  const a = new Art()

  for (let d = 0; d <= 64; d++) {
    const hw = Math.round(2 + d * 1.25 + Math.max(0, d - 16) ** 1.5 * 0.06)

    for (let x = -hw; x <= hw; x++) {
      const lit = x < 2 // the moon is to its left
      const snowLine = 12 + Math.round(3 * Math.sin(x * 0.9) + 2 * hash(x, 3))
      const streak = d < 21 && Math.abs(x) % 6 < 1 + (21 - d) / 6 && hash(x, d) > 0.3
      const snow = d < snowLine || streak
      let fill = snow ? (lit ? '#6f689e' : '#544d82') : lit ? '#2f2259' : '#24194b'

      if (x === -hw && !snow) {
        fill = '#3c2d6b'
      }
      a.set(x, d, fill)
    }
  }

  return a.svg()
}

// ---------- skylines ----------

// Distant blocks right across, with sparse dim windows and blinking antenna lights.
function farSkyline(): string {
  const rand = seeded(11)
  const body = new Art()
  const beacons = new Art()
  const win = windowSet()
  let x = -2

  while (x < GW) {
    const w = 5 + Math.floor(rand() * 11)
    const top = 112 + Math.floor(rand() * 26)

    body.rect(x, top, w, 152 - top, '#1b1439')
    body.rect(x, top, w, 1, '#251c48')
    if (rand() < 0.3) {
      const ax = x + 1 + Math.floor(rand() * (w - 2))
      const ah = 3 + Math.floor(rand() * 5)

      body.rect(ax, top - ah, 1, ah, '#1b1439')
      beacons.set(ax, top - ah - 1, '#ff4a4a')
    }
    for (let wy = top + 2; wy < 150; wy += 2) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        const r = rand()

        if (r < 0.12) {
          win.still.set(wx, wy, '#3f3470')
        } else if (r < 0.155) {
          ;(r < 0.14 ? win.still : win.a).set(wx, wy, '#9c7f55')
        }
      }
    }
    x += w
  }

  return px(body.svg()) + windowsSvg(win) + px(beacons.svg(), 'beacon')
}

// Nearer, darker blocks with warm and neon-tinted windows, low enough to keep the middle calm.
function midSkyline(): string {
  const rand = seeded(23)
  const body = new Art()
  const win = windowSet()
  let x = -3

  while (x < GW) {
    const w = 8 + Math.floor(rand() * 13)
    const top = 126 + Math.floor(rand() * 20)

    body.rect(x, top, w, 153 - top, '#100b21')
    body.rect(x, top, w, 1, '#241b44')
    body.rect(x, top + 1, 1, 152 - top, '#1d1638')
    if (rand() < 0.35) {
      body.rect(x + 2, top - 3, 4, 3, '#100b21')
      body.rect(x + 2, top - 3, 4, 1, '#241b44')
    }
    if (rand() < 0.25) {
      body.rect(x + w - 5, top - 5, 3, 3, '#1a1333')
      body.rect(x + w - 5, top - 2, 1, 2, '#100b21')
      body.rect(x + w - 3, top - 2, 1, 2, '#100b21')
    }
    windowsIn(win, rand, x, top, w, 152, [3, 3], [2, 1], 0.34)
    x += w
  }

  return px(body.svg()) + windowsSvg(win)
}

// ---------- the Skytree (base at its origin) ----------

const SKYTREE_H = 136

function skytree(): string {
  const a = new Art()
  const beacon = new Art()

  for (let t = 0; t <= SKYTREE_H; t++) {
    const y = t - SKYTREE_H
    let hw: number

    if (t < 22) {
      hw = (t >= 8 && t <= 9) || (t >= 15 && t <= 16) ? 1 : 0
    } else if (t < 40) {
      hw = t >= 31 ? 2 : 1
    } else if (t < 44) {
      hw = 4
    } else if (t < 58) {
      hw = 2
    } else if (t < 66) {
      hw = t < 61 ? 5 : 6
    } else {
      hw = Math.round(2.5 + ((t - 66) / (SKYTREE_H - 66)) ** 1.6 * 7)
    }
    for (let x = -hw; x <= hw; x++) {
      let fill: string

      if (t < 22) {
        fill = t % 4 < 2 ? '#cfe9ff' : '#8fb3e8'
      } else if (t >= 40 && t < 44) {
        fill = t === 40 ? '#e6f4ff' : t === 43 ? '#7e8fd8' : x % 2 === 0 ? '#fff0c0' : '#2c2f6e'
      } else if (t >= 58 && t < 66) {
        fill = [58, 62].includes(t) ? '#e6f4ff' : t === 59 ? '#9fb6ff' : t === 65 ? '#5a63b8' : (x + t) % 2 === 0 ? '#fff0c0' : '#2c2f6e'
      } else if (Math.abs(x) === hw) {
        fill = '#d8f0ff'
      } else if (t > 66 && t % 10 === 0) {
        fill = '#c7a6ff'
      } else {
        fill = 'url(#st-lattice)'
      }
      a.set(x, y, fill)
    }
  }
  beacon.set(0, -SKYTREE_H - 1, '#ff3b3b')

  return px(glow(0, -70, 20, 56, 'g-violet', 0.55) + glow(0, -76, 14, 10, 'g-violet', 0.8) + a.svg()) + px(beacon.svg(), 'beacon')
}

// ---------- Tokyo Tower (base at its origin) ----------

const TOWER_H = 116

function tokyoTower(): string {
  const a = new Art()
  const beacon = new Art()

  for (let t = 0; t <= TOWER_H; t++) {
    const y = t - TOWER_H
    let hw: number

    if (t < 16) {
      hw = (t >= 6 && t <= 7) || (t >= 11 && t <= 12) ? 1 : 0
    } else if (t < 34) {
      hw = 1 + Math.floor((t - 16) / 8)
    } else if (t < 38) {
      hw = 5
    } else if (t < 64) {
      hw = 3 + Math.round(((t - 38) / 26) * 5)
    } else if (t < 72) {
      hw = t < 67 ? 11 : 12
    } else {
      hw = Math.round(9 + ((t - 72) / (TOWER_H - 72)) ** 1.7 * 17)
    }
    // The arch between the four legs opens from t 92 down.
    const arch = t > 92 ? Math.floor((hw - 5) * Math.sqrt((t - 92) / (TOWER_H - 92))) : -1

    for (let x = -hw; x <= hw; x++) {
      let fill: string

      if (Math.abs(x) < arch) {
        continue
      }
      if (t < 16) {
        fill = Math.floor(t / 3) % 2 === 0 ? '#ff7a3a' : '#ffe8d0'
      } else if (t >= 34 && t < 38) {
        fill = t === 34 ? '#ffd9a8' : t === 37 ? '#c8501f' : x % 2 === 0 ? '#fff1c9' : '#3a1a14'
      } else if (t >= 64 && t < 72) {
        fill = [64, 67].includes(t) ? (t === 64 ? '#ffd9a8' : '#ff9a55') : t >= 70 ? (t === 70 ? '#c8501f' : '#8a2e14') : (x + t) % 2 === 0 ? '#fff1c9' : '#5a2416'
      } else if (Math.abs(x) === hw || Math.abs(x) === arch) {
        fill = '#ffc58a'
      } else if (t < 64 && Math.floor((t - 16) / 6) % 2 === 1) {
        fill = 'url(#tt-white)'
      } else {
        fill = 'url(#tt-orange)'
      }
      a.set(x, y, fill)
    }
  }
  beacon.set(0, -TOWER_H - 1, '#ff3b3b')

  return px(glow(0, -50, 34, 70, 'g-orange', 0.5) + glow(0, -82, 16, 10, 'g-orange', 0.7) + a.svg()) + px(beacon.svg(), 'beacon')
}

// The tower's orange smeared down the wet street, drawn after the street.
function towerReflection(): string {
  const a = new Art()

  for (let i = 0; i < 16; i++) {
    const hw = Math.max(1, Math.round(12 - i * 0.7))
    const jitter = Math.round((hash(i, 9) - 0.5) * 4)

    a.rect(-hw + jitter, 8 + i * 2, hw * 2, 1, i % 3 === 0 ? '#ffb070' : '#ff7a3a')
  }

  return px(`<g opacity="0.22">${a.svg()}</g>`)
}

// ---------- side blocks with neon (origin at the skyline's foot) ----------

// The left block, from its left edge: a tall building with a ラーメン sign, one with a chasing
// arrow, and a low one.
function leftBlock(): string {
  const rand = seeded(31)
  const body = new Art()
  const neon = new Art()
  const letters = new Art()
  const chev = [new Art(), new Art(), new Art()]
  const beacon = new Art()
  const win = windowSet()

  const buildings: [number, number, number, string][] = [
    [0, 24, -62, '#140e29'],
    [22, 22, -46, '#181030'],
    [42, 20, -30, '#120c25'],
  ]

  for (const [x, w, top, fill] of buildings) {
    body.rect(x, top, w, 4 - top, fill)
    body.rect(x, top, w, 1, '#2b2150')
    body.rect(x + w - 1, top + 1, 1, 3 - top, '#0c0819')
    windowsIn(win, rand, x, top, w, 2, [4, 4], [2, 2], 0.42)
  }
  // Roof details: an antenna with its light, a water tank, air conditioners.
  body.rect(6, -70, 1, 8, '#2b2150')
  beacon.set(6, -71, '#ff4a4a')
  body.rect(30, -51, 5, 4, '#1d153a')
  body.rect(31, -47, 1, 1, '#1d153a')
  body.rect(33, -47, 1, 1, '#1d153a')
  for (const y of [-24, -16, -8]) {
    body.rect(60, y, 3, 2, '#3a3160')
  }

  sign(neon, letters, 3, -58, 'ラーメン', true, { bg: '#26091a', border: '#ff4fa3', glyph: '#ffd0e8' })
  // A cyan arrow sign whose three chevrons light one after another.
  neon.rect(28, -42, 9, 20, '#36e3ff')
  neon.rect(29, -41, 7, 18, '#0a1a26')
  chev.forEach((c, i) => {
    const y = -39 + i * 5

    for (let k = 0; k < 3; k++) {
      c.set(30 + k, y + k, '#c9f6ff')
      c.set(34 - k, y + k, '#c9f6ff')
    }
  })

  return (
    px(glow(7.5, -41, 16, 26, 'g-pink', 0.8) + glow(32.5, -32, 12, 16, 'g-cyan', 0.6)) +
    px(body.svg()) +
    windowsSvg(win) +
    px(neon.svg()) +
    px(letters.svg(), 'flicker-slow') +
    chev.map((c, i) => px(c.svg(), `chev chev${i}`)).join('') +
    px(beacon.svg(), 'beacon')
  )
}

// The right block, from its right edge: low buildings with a カラオケ sign and a rooftop
// トウキョウ billboard.
function rightBlock(): string {
  const rand = seeded(41)
  const body = new Art()
  const neon = new Art()
  const karaoke = new Art()
  const billboard = new Art()
  const win = windowSet()

  const buildings: [number, number, number, string][] = [
    [-96, 28, -20, '#130d27'],
    [-72, 34, -30, '#181030'],
    [-40, 40, -30, '#140e29'],
  ]

  for (const [x, w, top, fill] of buildings) {
    body.rect(x, top, w, 4 - top, fill)
    body.rect(x, top, w, 1, '#2b2150')
    body.rect(x, top + 1, 1, 3 - top, '#221a42')
    windowsIn(win, rand, x, top + 12, w, 2, [4, 4], [2, 2], 0.4)
  }
  // The billboard's legs and catwalk.
  body.rect(-34, -34, 1, 4, '#2b2150')
  body.rect(-10, -34, 1, 4, '#2b2150')
  body.rect(-38, -34, 37, 1, '#3a3160')

  sign(neon, karaoke, -68, -26, 'カラオケ', false, { bg: '#0a1a26', border: '#36e3ff', glyph: '#c9f6ff' })
  sign(neon, billboard, -37, -44, 'トウキョウ', false, { bg: '#1f0b10', border: '#ffb547', glyph: '#ffe7b0' })

  return (
    px(glow(-54.5, -21, 20, 10, 'g-cyan', 0.7) + glow(-20.5, -39, 22, 10, 'g-amber', 0.6)) +
    px(body.svg()) +
    windowsSvg(win) +
    px(neon.svg()) +
    px(karaoke.svg(), 'flicker') +
    px(billboard.svg())
  )
}

// Neon colors smeared down the wet street below each block, drawn after the street.
function reflection(spots: [number, number, string][]): string {
  const a = new Art()

  for (const [cx, hw0, fill] of spots) {
    for (let i = 0; i < 12; i++) {
      const hw = Math.max(1, Math.round(hw0 - i * 0.5))

      if (i % 2 === 0 || hash(cx, i) > 0.5) {
        a.rect(Math.round(cx - hw + (hash(i, cx) - 0.5) * 3), 8 + i * 2, hw * 2, 1, fill)
      }
    }
  }

  return px(`<g opacity="0.2">${a.svg()}</g>`)
}

// ---------- the elevated line ----------

const RAIL_Y = 147

function track(): string {
  const a = new Art()

  // Overhead wire on its poles.
  a.rect(0, 137, GW, 1, '#2b2450')
  for (let x = 18; x < GW; x += 36) {
    a.rect(x, 135, 1, 12, '#3a3260')
    a.rect(x - 1, 135, 3, 1, '#3a3260')
  }
  a.rect(0, RAIL_Y, GW, 1, '#7d73a8')
  a.rect(0, RAIL_Y + 1, GW, 3, '#2a2344')
  a.rect(0, RAIL_Y + 4, GW, 1, '#17122b')
  for (let x = 6; x < GW; x += 36) {
    a.rect(x - 1, RAIL_Y + 5, 6, 1, '#17122b')
    a.rect(x, RAIL_Y + 5, 4, 14, '#1f1937')
    a.rect(x, RAIL_Y + 5, 1, 14, '#2f2752')
  }

  return px(a.svg())
}

// The last car of a train that has nearly left the scene to the right: only its back end shows
// at the window's right edge, with its red tail light, so nothing moves behind the words. Its
// origin is the window's right edge; the car's back is TAIL art pixels in from it.
const TAIL = 22

function exitingTrain(): string {
  const a = new Art()
  const tail = new Art()
  const top = RAIL_Y - 9
  const x = -TAIL

  a.rect(x + 2, top, 40, 1, '#555c78')
  a.rect(x + 1, top + 1, 41, 1, '#363b52')
  a.rect(x, top + 2, 42, 1, '#41475f')
  for (let i = 0; i < 42; i++) {
    const door = [12, 23, 34].some(d => i >= d && i < d + 3)
    const pane = door ? '#c9ad66' : i % 6 < 4 ? '#d9bf78' : '#3a4058'

    a.set(x + i, top + 3, i < 3 ? '#3a4058' : door && i % 3 === 1 ? '#4a5068' : pane)
    a.set(x + i, top + 4, i < 3 ? '#3a4058' : door ? '#4a5068' : pane)
  }
  a.rect(x, top + 2, 2, 2, '#2c3248')
  a.rect(x, top + 5, 42, 1, '#2e9a68')
  a.rect(x, top + 6, 42, 1, '#3a4058')
  a.rect(x, top + 7, 42, 1, '#3a3550')
  a.rect(x + 4, top + 8, 6, 1, '#14111f')
  tail.set(x, top + 6, '#ff4040')

  return px(glow(x, top + 6, 6, 4, 'g-tail', 0.9) + a.svg() + tail.svg())
}

// ---------- the street ----------

// A small figure on the crossing: hair, coat, legs, sometimes an umbrella.
function person(a: Art, x: number, y: number, coat: string, umbrella?: string): void {
  if (umbrella === undefined) {
    a.set(x, y - 3, '#1a1424')
  } else {
    a.rect(x - 1, y - 4, 3, 1, umbrella)
    a.set(x, y - 5, umbrella)
  }
  a.set(x, y - 2, coat)
  a.set(x, y - 1, coat)
  a.set(x, y, '#0b0912')
}

const COATS = ['#3d4a7a', '#7a3d5c', '#c9c2d8', '#2d5c4f', '#8a5a2b', '#5a4a8a', '#a8344a']
const UMBRELLAS = ['#e8443a', '#b9c3e0', '#f2c14e', '#ff7cc0', '#3fcf86']

function street(): string {
  const a = new Art()
  const rand = seeded(53)
  const stripe = '#27223f'

  a.rect(0, 152, GW, GH - 152, '#0d0a1a')
  a.rect(0, 152, GW, 3, '#171230')
  a.rect(0, 155, GW, 1, '#2a2447')
  // The scramble crossing: two wide crosswalks, two short ones and the diagonals between.
  for (let x = 76; x < 248; x += 4) {
    a.rect(x, 161, 2, 4, stripe)
    a.rect(x, 187, 2, 4, stripe)
  }
  for (let y = 168; y < 185; y += 3) {
    a.rect(64, y, 9, 1, stripe)
    a.rect(250, y, 9, 1, stripe)
  }
  for (let k = 0; k < 20; k++) {
    a.rect(Math.round(78 + k * 8.4), Math.round(169 + k * 0.75), 3, 1, '#221d38')
    a.rect(Math.round(242 - k * 8.4), Math.round(169 + k * 0.75), 3, 1, '#221d38')
  }
  // Pedestrian signals at the corners.
  for (const x of [61, 260]) {
    a.rect(x, 146, 1, 12, '#3a3456')
    a.rect(x - 1, 146, 3, 4, '#1f1a33')
    a.set(x, 148, '#4fffa0')
  }
  // People waiting and crossing.
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * GW)
    const y = [158, 167, 192, 199][Math.floor(rand() * 4)] ?? 167
    const coat = COATS[Math.floor(rand() * COATS.length)] ?? '#3d4a7a'

    person(a, x, y, coat, rand() < 0.3 ? UMBRELLAS[Math.floor(rand() * UMBRELLAS.length)] : undefined)
  }

  return px(a.svg())
}

// People walking across, each group back and forth on its own.
function walkers(): string {
  const rand = seeded(61)
  const groups: string[] = []

  for (let g = 0; g < 4; g++) {
    const a = new Art()
    const y = [166, 192, 166, 192][g] ?? 166
    const x0 = 40 + g * 60

    for (let i = 0; i < 3; i++) {
      person(a, x0 + i * 4 + Math.floor(rand() * 3), y, COATS[(g * 3 + i) % COATS.length] ?? '#3d4a7a', rand() < 0.4 ? UMBRELLAS[(g + i) % UMBRELLAS.length] : undefined)
    }
    groups.push(px(`<g class="walk walk${g}">${a.svg()}</g>`))
  }

  return groups.join('')
}

// ---------- the cherry tree (trunk's foot at its origin) ----------

function sakura(): string {
  const wood = new Art()
  const bloom = new Art()
  const lanterns = new Art()

  // Trunk and branches as chains of discs, thinning toward the tips.
  const limbs: [number, number, number][][] = [
    [[0, 8, 4], [3, -18, 3.4], [12, -36, 2.8], [26, -50, 2]],
    [[12, -36, 2.2], [32, -50, 1.6], [52, -58, 1.2], [80, -56, 0.8]],
    [[20, -44, 1.6], [34, -68, 1]],
    [[6, -26, 1.8], [-6, -50, 1]],
    [[52, -58, 1], [66, -72, 0.7]],
    [[40, -48, 1], [92, -42, 0.7]],
  ]

  for (const limb of limbs) {
    for (let i = 0; i < limb.length - 1; i++) {
      const [x1, y1, r1] = limb[i] ?? [0, 0, 1]
      const [x2, y2, r2] = limb[i + 1] ?? [0, 0, 1]
      const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1))

      for (let s = 0; s <= steps; s++) {
        const t = s / steps

        wood.disc(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), r1 + (r2 - r1) * t, '#24141f')
      }
    }
  }
  // Moonlight along the trunk's upper-left edges.
  const woodSvg = new Art()

  for (let y = -80; y <= 12; y++) {
    for (let x = -12; x <= 100; x++) {
      if (wood.has(x, y)) {
        woodSvg.set(x, y, !wood.has(x - 1, y) || !wood.has(x, y - 1) ? '#47293a' : '#24141f')
      }
    }
  }

  // Blossom clusters: ragged discs, lit from the upper left.
  const clusters: [number, number, number][] = [
    [-4, -54, 9], [10, -62, 11], [26, -68, 12], [42, -74, 10], [54, -62, 11], [68, -70, 10],
    [80, -58, 9], [90, -48, 7], [34, -52, 8], [18, -47, 7], [62, -50, 7], [-10, -40, 6], [74, -44, 6],
  ]
  const inBloom = (x: number, y: number): [number, number, number] | undefined => {
    let best: [number, number, number] | undefined
    let bestD = Infinity

    for (const c of clusters) {
      const d = Math.hypot(x - c[0], y - c[1]) / (c[2] * (0.8 + hash(x, y, 2) * 0.18 + hash(Math.floor(x / 3), Math.floor(y / 3), 4) * 0.16))

      if (d <= 1 && d < bestD) {
        best = c
        bestD = d
      }
    }

    return best
  }
  for (let y = -90; y <= -30; y++) {
    for (let x = -20; x <= 104; x++) {
      const c = inBloom(x, y)

      if (c === undefined) {
        continue
      }
      const dy = (y - c[1]) / c[2]
      let fill = dy < -0.3 ? '#ffb3d6' : dy > 0.4 ? '#d9719f' : '#f293c1'

      if (!inBloom(x - 1, y) || !inBloom(x, y - 1)) {
        fill = '#ffe0ee'
      } else if (!inBloom(x + 1, y) || !inBloom(x, y + 1)) {
        fill = '#a84f82'
      } else if (hash(x, y, 5) < 0.06) {
        fill = '#ffd2e6'
      }
      bloom.set(x, y, fill)
    }
  }

  // A rope of red lanterns slung under the branches.
  for (let x = 40; x <= 94; x++) {
    const t = (x - 40) / 54

    lanterns.set(x, Math.round(-40 + Math.sin(t * Math.PI) * 4 - t * 2), '#6a3a48')
  }
  const lanternAt: [number, number][] = [[50, -36], [66, -36], [82, -38]]

  for (const [lx, ly] of lanternAt) {
    lanterns.rect(lx + 2, ly, 1, 2, '#6a3a48')
    const top = ly + 2
    const rows = ['#2a1818', '#d93a2a', '#ff7a45', '#ffb070', '#ff7a45', '#d93a2a', '#2a1818']

    rows.forEach((fill, r) => {
      const capped = r === 0 || r === rows.length - 1

      lanterns.rect(lx + (capped ? 1 : 0), top + r, capped ? 4 : 6, 1, fill)
      if (!capped) {
        lanterns.set(lx, top + r, '#a82a20')
        lanterns.set(lx + 5, top + r, '#a82a20')
      }
    })
    lanterns.rect(lx + 2, top + 7, 2, 2, '#ffcc66')
  }

  // Falling petals, each on its own path and delay.
  const rand = seeded(71)
  let petals = ''

  for (let i = 0; i < 16; i++) {
    const x = Math.floor(-6 + rand() * 96)
    const y = Math.floor(-52 + rand() * 14)
    const fill = rand() < 0.5 ? '#ffc7df' : '#ff9cc8'

    petals += `<rect class="pt pt${i % 3}" style="animation-delay:${(-rand() * 14).toFixed(1)}s" x="${x}" y="${y}" width="${i % 4 === 0 ? 2 : 1}" height="1" fill="${fill}"/>`
  }

  return px(
    woodSvg.svg() +
      bloom.svg() +
      lanternAt.map(([lx, ly]) => glow(lx + 3, ly + 6, 9, 9, 'g-lantern', 0.9, 'lantern-glow')).join('') +
      lanterns.svg() +
      petals,
  )
}

// ---------- the vending machine, with a cat on top (foot's left corner at its origin) ----------

function vending(): string {
  const a = new Art()
  const cat = new Art()
  const eyes = new Art()
  const shut = new Art()

  a.rect(0, -25, 13, 1, '#aab6cf')
  a.rect(0, -24, 13, 24, '#d8e2f2')
  a.rect(0, -24, 1, 24, '#b5c2da')
  a.rect(12, -24, 1, 24, '#8e9ab5')
  a.rect(1, -23, 11, 3, '#9fdcff')
  a.rect(2, -22, 9, 1, '#e8f8ff')
  a.rect(1, -19, 11, 12, '#eaf6ff')
  const drinks = ['#e8443a', '#3a7bd5', '#f29b30', '#3fbf6f', '#b05ad8']

  for (const row of [-18, -14, -10]) {
    drinks.forEach((fill, i) => {
      a.rect(2 + i * 2, row, 1, 3, fill)
      a.set(2 + i * 2, row, '#ffffff')
    })
    for (let i = 0; i < 5; i++) {
      a.set(2 + i * 2, row + 3, row === -10 ? '#c4cfe2' : '#4a8cff')
    }
  }
  a.rect(1, -7, 11, 6, '#c4cfe2')
  a.rect(9, -6, 2, 2, '#5a6480')
  a.rect(2, -3, 7, 2, '#2a3046')
  a.rect(0, 0, 13, 1, '#3a4460')

  // The cat: sitting, ears up, tail hanging down the machine's lit face.
  const shape = ['#...#..', '#####..', '#####..', '#####..', '.####..', '.#####.', '######.', '######.']

  shape.forEach((row, r) => {
    ;[...row].forEach((cell, c) => {
      if (cell === '#') {
        cat.set(3 + c, -33 + r, '#0c0a14')
      }
    })
  })
  for (const [x, y] of [[3, -33], [3, -32], [3, -31], [4, -28], [3, -27], [4, -32]] as const) {
    cat.set(x, y, '#3b3566')
  }
  for (const [x, y] of [[9, -25], [9, -24], [10, -23], [10, -22], [10, -21], [9, -20]] as const) {
    cat.set(x, y, '#0c0a14')
  }
  eyes.set(4, -31, '#ffd84a')
  eyes.set(6, -31, '#ffd84a')
  shut.set(4, -31, '#0c0a14')
  shut.set(6, -31, '#0c0a14')

  return px(
    glow(6.5, -12, 22, 24, 'g-vend', 0.55) +
      glow(6.5, 2, 26, 4, 'g-vend', 0.8) +
      a.svg() +
      cat.svg() +
      eyes.svg() +
      `<g class="cat-blink">${shut.svg()}</g>`,
  )
}

// ---------- layout ----------
//
// The scene is cropped to the window's shape (slice). The landmarks are placed per band of
// aspect ratios, for the narrowest shape in the band: the moon and the Skytree in the gap
// between the app's sidebar (about the left 17%) and the conversation (from about 30%), the
// tower and the vending machine past the conversation on the right, the neon blocks at the
// edges, the cherry tree low on the left, and the tail of a departing train at the right edge.
// Phones have no sidebar, so all of it draws in.

type Spot = [number, number, number]
type Spots = Record<'moon' | 'skytree' | 'tower' | 'left' | 'right' | 'train' | 'sakura' | 'vend', Spot>

const SKYLINE = 150 * PX // the skyline's foot, in scene units

function spots(a: number, tallestA: number): Spots {
  const v = Math.min(W, H * a)
  const left = (W - v) / 2
  const right = left + v
  const shown = Math.min(H, W / tallestA)
  const top = (H - shown) / 2
  const bottom = top + shown
  const s = Math.min(1, Math.max(0.6, 0.45 + (v / W) * 0.55))
  const phone = a < 0.8
  // The moon sits just right of the Skytree and high enough that the antenna crosses it.
  const skytreeX = left + v * (phone ? 0.22 : 0.225)

  return {
    moon: [skytreeX + 48 * s, Math.max(SKYLINE - 590 * s, top + 90 * s), s],
    skytree: [skytreeX, SKYLINE, s],
    tower: [right - v * (phone ? 0.24 : 0.115), SKYLINE, s],
    left: [left, SKYLINE, s],
    right: [right, SKYLINE, s],
    train: [right, 0, 1],
    sakura: [left + v * (phone ? 0.02 : 0.06), H, s],
    vend: [right - v * 0.05 - 13 * PX * s, Math.min(905, bottom - 30), s],
  }
}

const f = (n: number): string => n.toFixed(0)
const at = ([x, y, s]: Spot): string => `translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})`
const css = ([x, y, s]: Spot): string => `transform: translate(${f(x)}px, ${f(y)}px) scale(${s.toFixed(2)});`
// A dark veil behind the conversation, so the words stay readable over the busy middle of the
// city: clear at the edges where the landmarks stand, darkest over the column of text (about 32%
// to 80% across, past the app's sidebar). It is stretched to the visible width; on phones,
// where words run edge to edge, to three times it, so only its even middle shows, a little lighter.
function scrimRule(a: number): string {
  const v = Math.min(W, H * a)
  const left = (W - v) / 2
  const [x, sx] = a < 0.8 ? [left - v, (3 * v) / W] : [left, v / W]

  return `.at-scrim { transform: translate(${f(x)}px, 0px) scale(${sx.toFixed(3)}, 1); opacity: ${a < 0.8 ? 0.75 : 1}; }`
}

const rules = (p: Spots): string =>
  (Object.keys(p) as (keyof Spots)[]).map(k => `.at-${k} { ${css(p[k])} }`).join(' ')

// Widest first; each later band is narrower and wins where it applies.
const BANDS = [2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
const LAYOUT = [
  `  ${rules(spots(BANDS[0] ?? 2.2, 2.6))} ${scrimRule(BANDS[0] ?? 2.2)}`,
  ...BANDS.map((high, i) => {
    const low = BANDS[i + 1] ?? 0.3

    return `  @media (max-aspect-ratio: ${Math.round(high * 100)}/100) { ${rules(spots(low, high))} ${scrimRule(low)} }`
  }),
].join('\n')

// Where everything sits for a 16:10 window, written on the elements too, for a renderer that
// reads no CSS (the preview image).
const HOME = spots(1.6, 1.6)
const placed = (k: keyof Spots, inner: string): string => `<g class="at-${k}" transform="${at(HOME[k])}">${inner}</g>`

const grad = (id: string, color: string, opacity: number): string =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

// A 4 by 4 lattice of crossing diagonals, one art pixel per cell.
const lattice = (id: string, bg: string, lit: string): string =>
  `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${bg}"/><path fill="${lit}" d="M0 0h1v1h-1zM1 1h1v1h-1zM2 2h1v1h-1zM3 3h1v1h-1zM3 0h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM0 3h1v1h-1z"/></pattern>`

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<defs>
${lattice('tt-orange', '#8c2a14', '#ff8a3d')}
${lattice('tt-white', '#9a5a3c', '#ffe2c4')}
${lattice('st-lattice', '#26307a', '#7fb8ff')}
${grad('g-pink', '#ff4fa3', 0.5)}${grad('g-cyan', '#36e3ff', 0.45)}${grad('g-amber', '#ffb547', 0.45)}
${grad('g-orange', '#ff6a2a', 0.45)}${grad('g-violet', '#9c7bff', 0.4)}${grad('g-lantern', '#ff8a3d', 0.6)}
${grad('g-vend', '#a8e4ff', 0.45)}${grad('g-tail', '#ff4040', 0.5)}
<linearGradient id="g-scrim" x1="0" x2="1">${(
  [[0, 0], [0.19, 0], [0.33, 0.66], [0.78, 0.66], [0.88, 0], [1, 0]] as const
)
  .map(([o, a]) => `<stop offset="${o}" stop-color="#090713" stop-opacity="${a}"/>`)
  .join('')}</linearGradient>
</defs>
<style>
${LAYOUT}

  /* Every animation steps, so the scene redraws only when a frame changes. */
  .tw-a, .tw-b { animation: tw 6s step-end infinite; }
  .tw-b { animation-delay: -3s; }
  @keyframes tw { 0% { opacity: 1; } 50% { opacity: 0.2; } }

  .beacon { animation: beacon 2.4s step-end infinite; }
  @keyframes beacon { 0% { opacity: 1; } 45% { opacity: 0.1; } }

  .win-a { animation: win 9s step-end infinite; }
  .win-b { animation: win 13s step-end infinite; animation-delay: -5s; }
  @keyframes win { 0% { opacity: 1; } 55% { opacity: 0; } 80% { opacity: 1; } }

  .flicker { animation: flicker 7s step-end infinite; }
  .flicker-slow { animation: flicker 11s step-end infinite; animation-delay: -4s; }
  @keyframes flicker { 0% { opacity: 1; } 88% { opacity: 0.3; } 89% { opacity: 1; } 91% { opacity: 0.3; } 92% { opacity: 1; } }

  .chev { animation: chev 1.5s step-end infinite; }
  .chev1 { animation-delay: -1s; }
  .chev2 { animation-delay: -0.5s; }
  @keyframes chev { 0% { opacity: 1; } 33% { opacity: 0.2; } }

  .lantern-glow { animation: lantern 3.2s step-end infinite; }
  @keyframes lantern { 0% { opacity: 0.9; } 40% { opacity: 0.7; } 60% { opacity: 1; } }

  .drift { animation: drift 60s steps(14) infinite alternate; }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(14px); } }

  .meteor { opacity: 0; animation: meteor 23s infinite; }
  @keyframes meteor {
    0%, 90% { opacity: 0; transform: translate(0, 0); animation-timing-function: steps(1); }
    91% { opacity: 1; transform: translate(0, 0); animation-timing-function: steps(12); }
    95% { opacity: 0; transform: translate(-48px, 24px); }
    100% { opacity: 0; transform: translate(-48px, 24px); }
  }

  .walk0 { animation: walk-r 30s steps(48) infinite alternate; }
  .walk1 { animation: walk-l 34s steps(52) infinite alternate; }
  .walk2 { animation: walk-l 28s steps(40) infinite alternate; animation-delay: -9s; }
  .walk3 { animation: walk-r 36s steps(56) infinite alternate; animation-delay: -14s; }
  @keyframes walk-r { from { transform: translateX(0); } to { transform: translateX(48px); } }
  @keyframes walk-l { from { transform: translateX(0); } to { transform: translateX(-46px); } }

  .pt { animation: fall-a 14s infinite; }
  .pt1 { animation-name: fall-b; animation-duration: 17s; }
  .pt2 { animation-name: fall-c; animation-duration: 12s; }
  @keyframes fall-a {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(12); }
    6% { opacity: 1; }
    45% { transform: translate(12px, 24px); animation-timing-function: steps(16); }
    100% { transform: translate(36px, 64px); opacity: 0; }
  }
  @keyframes fall-b {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(10); }
    6% { opacity: 1; }
    40% { transform: translate(-6px, 20px); animation-timing-function: steps(20); }
    100% { transform: translate(24px, 70px); opacity: 0; }
  }
  @keyframes fall-c {
    0% { transform: translate(0, 0); opacity: 0; animation-timing-function: steps(18); }
    6% { opacity: 1; }
    60% { transform: translate(28px, 30px); animation-timing-function: steps(14); }
    100% { transform: translate(44px, 58px); opacity: 0; }
  }

  .cat-blink { opacity: 0; animation: blink 6s step-end infinite; }
  @keyframes blink { 0% { opacity: 0; } 94% { opacity: 1; } 97% { opacity: 0; } }

  @media (prefers-reduced-motion: reduce) {
    .tw-a, .tw-b, .beacon, .win-a, .win-b, .flicker, .flicker-slow, .chev, .lantern-glow, .drift,
    .meteor, .walk, .pt, .cat-blink { animation: none; }
  }
</style>
${sky()}
${stars()}
${meteor()}
${placed('moon', moon())}
<g transform="translate(${148 * PX} ${88 * PX})">${px(fuji())}</g>
${farSkyline()}
${placed('skytree', skytree())}
${placed('tower', tokyoTower())}
${midSkyline()}
${placed('left', leftBlock())}
${placed('right', rightBlock())}
${track()}
${placed('train', exitingTrain())}
${street()}
${placed('tower', towerReflection())}
${placed('left', reflection([[7, 6, '#ff4fa3'], [32, 4, '#36e3ff']]))}
${placed('right', reflection([[-54, 10, '#36e3ff'], [-20, 12, '#ffb547']]))}
${walkers()}
${placed('sakura', sakura())}
${placed('vend', vending())}
<g class="at-scrim"><rect width="${W}" height="${H}" fill="url(#g-scrim)"/></g>
</svg>`

export const neonTokyo: Look = {
  id: 'neon-tokyo',
  label: 'Neon Tokyo',
  description: 'Pixel-art Tokyo at night: Skytree, Tokyo Tower, neon signs and sakura',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'neon-tokyo', glass: { blur: 0, tint: '#0b0916', opacity: 0.3 } },
  },
  scenes: {
    'neon-tokyo': {
      source: SCENE,
      alt: 'Pixel art of Tokyo at night: a full moon behind the Skytree, Mt Fuji on the horizon, the orange-lit Tokyo Tower over a skyline of neon katakana signs, an elevated line with the tail of a departing train, a scramble crossing, a cherry tree hung with red lanterns, and a black cat on a glowing vending machine',
    },
  },
}
