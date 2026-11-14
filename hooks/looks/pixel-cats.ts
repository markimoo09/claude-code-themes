import type { Look } from './types'

import { makeColors } from '../make-colors.js'

// Pixel (the gray-and-white tuxedo) and Charlie (the orange-and-white one) sitting side by
// side on a light wood floor in a sunny room, drawn as pixel art. Colors come from them:
// Charlie's orange is the accent, Pixel's bell green is success, their pink noses are literals.
const { theme, problems } = makeColors({
  label: 'Pixel cats',
  only: 'light',
  roles: {
    accent: '#c8742a',
    danger: '#c0392b',
    success: '#3f8f3a',
    warning: '#b7861a',
    pro: '#c25a7a',
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#efe7dc',
        'surface-1': '#f5efe6',
        'surface-2': '#faf6f0',
        'surface-3': '#faf6f0',
        'text-primary': '#2b2118',
        'text-secondary': '#574838',
        'text-muted': '#6b5c4b',
      },
    },
  },
})

// ---------- drawing cats from shapes ----------
//
// Each cat is described by shapes in "base" units (46 wide, 54 tall, centred on u = 23),
// then sampled onto a pixel grid at the cat's own scale. Outline, rim shading and fur
// texture come from the sampled silhouette, so the heads stay round at any scale.

type Palette = Record<string, string>
type Grid = (string | undefined)[][]

const U0 = -16 // grid left edge in base units, leaving room for a tail on either side
const SPAN = 78 // base units across the grid

type CatSpec = {
  scale: number
  pal: Palette
  eyeR: number
  white: (u: number, v: number) => boolean
  stripe: (u: number, v: number) => boolean
  cream: (u: number, v: number) => boolean
  tag: 'bell' | 'tag'
  tail: 'left' | 'right'
  tailStripes: boolean
}

const sq = (n: number): number => n * n
const ell = (u: number, v: number, cu: number, cv: number, ru: number, rv: number): number =>
  sq((u - cu) / ru) + sq((v - cv) / rv)

function inTri(u: number, v: number, a: [number, number], b: [number, number], c: [number, number]): boolean {
  const side = (p: [number, number], q: [number, number]): number => (u - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (v - q[1])
  const d1 = side(a, b)
  const d2 = side(b, c)
  const d3 = side(c, a)

  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

// Mirrors to the left half, so each shape is written once.
const half = (u: number): number => (u > 23 ? 46 - u : u)

const hash = (x: number, y: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453

  return n - Math.floor(n)
}

const inHead = (u: number, v: number): boolean => ell(u, v, 23, 16.5, 13.6, 12.6) <= 1

// The longhair ruff around the cheeks, spiky at the sides.
function inCheeks(u: number, v: number): boolean {
  const du = (u - 23) / 16.4
  const dv = (v - 21.6) / 7.6
  const a = Math.atan2(dv, du)

  return Math.hypot(du, dv) <= 0.9 + 0.13 * Math.abs(Math.sin(5 * a + 0.4))
}

const inEar = (u: number, v: number): boolean => inTri(half(u), v, [8.6, 12.5], [10.8, 0.6], [19.2, 6])
const inInnerEar = (u: number, v: number): boolean => inTri(half(u), v, [11.2, 10.4], [11.9, 3.4], [16.8, 6.6])

function inBody(u: number, v: number): boolean {
  if (v > 53.6) {
    return false
  }
  const a = Math.atan2(v - 39, u - 23)
  const fluff = 1 + 0.05 * Math.sin(11 * a)

  return ell(u, v, 23, 39, 14.6 * fluff, 13 * fluff) <= 1 || ell(u, v, 23, 46.5, 17.4 * fluff, 7.6) <= 1
}

const inLegs = (u: number, v: number): boolean => {
  const h = half(u)

  return (v >= 33 && v <= 51.5 && h >= 16.3 && h <= 21.6) || ell(h, v, 18.9, 51.4, 3.7, 2.1) <= 1
}

const inFace = (u: number, v: number): boolean => inHead(u, v) || inCheeks(u, v)
const inCat = (u: number, v: number): boolean => inFace(u, v) || inEar(u, v) || inBody(u, v) || inLegs(u, v)

// The tail: discs along a path, base units, from the body's side outward.
const TAIL_FRAMES: [number, number][][] = [
  [[10, 49], [3, 51.6], [-4, 51], [-8.6, 47.4], [-9.6, 42.6]],
  [[10, 49], [3, 51.8], [-4, 51.8], [-9.6, 50.4], [-13, 47.6]],
]

function inTail(u: number, v: number, frame: number, side: 'left' | 'right'): boolean {
  const points = TAIL_FRAMES[frame] ?? []
  const uu = side === 'left' ? u : 46 - u

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i] ?? [0, 0]
    const [x2, y2] = points[i + 1] ?? [0, 0]

    for (let t = 0; t <= 1; t += 0.1) {
      const r = 3.4 - ((i + t) / (points.length - 1)) * 1.1

      if (sq(uu - (x1 + (x2 - x1) * t)) + sq(v - (y1 + (y2 - y1) * t)) <= sq(r)) {
        return true
      }
    }
  }

  return false
}

const SHADE: Record<string, string> = { D: 'd', W: 'w', h: 'D', S: 'S', I: 'I' }

// Samples a mask onto the cat's grid and colors it: outline, rim light and shadow, texture.
function paint(spec: CatSpec, mask: (u: number, v: number) => boolean, base: (u: number, v: number) => string): Grid {
  const s = spec.scale
  const w = Math.ceil(SPAN * s)
  const h = Math.ceil(54 * s)
  const at = (x: number, y: number): [number, number] => [U0 + (x + 0.5) / s, (y + 0.5) / s]
  const m = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && mask(...at(x, y))
  const grid: Grid = []

  for (let y = 0; y < h; y++) {
    const row: (string | undefined)[] = []

    for (let x = 0; x < w; x++) {
      if (!m(x, y)) {
        row.push(undefined)
        continue
      }
      if (!m(x - 1, y) || !m(x + 1, y) || !m(x, y - 1) || !m(x, y + 1)) {
        row.push('o')
        continue
      }
      const [u, v] = at(x, y)
      let k = base(u, v)

      if (!m(x + 2, y) || !m(x, y + 2)) {
        k = SHADE[k] ?? k
      } else if ((!m(x - 2, y) || !m(x, y - 2)) && k === 'D') {
        k = 'h'
      } else if ((k === 'D' || k === 'h') && hash(x, y) < 0.07) {
        k = SHADE[k] ?? k
      }
      row.push(k)
    }
    grid.push(row)
  }

  return grid
}

// The coat at a point, before eyes and the rest are drawn over it.
function coat(spec: CatSpec, u: number, v: number): string {
  if (inInnerEar(u, v)) {
    return 'I'
  }
  if (spec.white(u, v)) {
    // The ruff's lower edge and the gap between the front legs, as soft lines.
    const ruffEdge = !inFace(u, v) && inFace(u, v - 0.9)
    const legGap = v > 37 && inBody(u, v) && !inLegs(u, v) && (inLegs(u - 0.9, v) || inLegs(u + 0.9, v))
    const toes = v > 50.6 && Math.abs(half(u) - 18.9) > 0.6 && Math.abs(half(u) - 18.9) < 1.4

    return ruffEdge || legGap || toes ? 'w' : 'W'
  }
  if (spec.stripe(u, v)) {
    return 'S'
  }
  if (spec.cream(u, v)) {
    return 'h'
  }

  return 'D'
}

const EYE_V = 16.4
const eyeCentres = [16.6, 29.4]

// Eyes, nose, mouth, whiskers, collar and tag, drawn over the coat.
function face(spec: CatSpec, grid: Grid, isBlinking: boolean): Grid {
  const s = spec.scale
  const out: Grid = grid.map(row => row.map(() => undefined))
  const r = spec.eyeR

  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === undefined || cell === 'o') {
        return
      }
      const u = U0 + (x + 0.5) / s
      const v = (y + 0.5) / s
      let k: string | undefined

      for (const cu of eyeCentres) {
        const d = Math.hypot(u - cu, v - EYE_V) / r

        if (isBlinking) {
          if (d <= 1.25) {
            const lid = Math.abs(v - (EYE_V + 0.35 * r * (1 - sq((u - cu) / r)))) <= 0.55 / s
            k = lid && d <= 1.1 ? 'o' : cell
          }
          continue
        }
        if (d <= 1) {
          const pupil = ell(u, v, cu, EYE_V + 0.1 * r, 0.36 * r, 0.82 * r) <= 1
          const glint = Math.hypot(u - (cu - 0.38 * r), v - (EYE_V - 0.4 * r)) <= 0.62 / s + 0.15
          k = glint ? 'L' : pupil ? 'P' : v < EYE_V - 0.3 * r ? 'e' : 'E'
        } else if (d <= 1 + 0.75 / (s * r)) {
          k = 'o'
        }
      }
      if (!isBlinking) {
        // Nose: a small rounded triangle, darker at its foot.
        const nv = v - 21.6

        if (nv >= -0.2 && nv <= 1.9 && Math.abs(u - 23) <= 1.9 - nv * 0.9) {
          k = nv > 1.2 ? 'n' : 'N'
        }
        // Blush: a soft pink patch on each cheek, below and outside the eyes.
        if (ell(Math.abs(u - 23), v, 9.6, 21.4, 1.9, 0.95) <= 1) {
          k = 'B'
        }
        // Mouth: a bold "ω" under the nose, its corners turned up in a smile.
        const t = Math.abs(u - 23)
        const mv = t <= 2.6 ? 24 + 0.95 * Math.sin((Math.PI * t) / 2.6) : 24 - (t - 2.6) * 0.9

        if (t <= 3.2 && Math.abs(v - mv) <= 0.55 / s) {
          k = 'm'
        }
        if (t < 0.4 && v > 23.3 && v < 24.3) {
          k = 'm'
        }
        // Whiskers across the cheeks.
        for (const [dy, slope] of [[0, -0.08], [1.4, 0.1]] as const) {
          const wu = Math.abs(u - 23)

          if (wu > 6.4 && wu < 15.5 && Math.abs(v - (22.6 + dy + (wu - 6.4) * slope)) <= 0.4 / s && cell !== 'W') {
            k = 'x'
          }
        }
        // Collar, mostly under the ruff, and the tag or bell at its centre.
        const cv = 28.7 + sq((u - 23) / 8) * 1.3

        if (Math.abs(u - 23) <= 8.5 && Math.abs(v - cv) <= 0.5) {
          k = 'C'
        }
        if (spec.tag === 'bell') {
          const d = Math.hypot(u - 23, v - 31.1)

          if (d <= 2.1) {
            k = d <= 0.9 && u < 23 && v < 31 ? 't' : v > 31.9 && Math.abs(u - 23) < 0.6 ? 'o' : 'T'
          }
        } else {
          if (Math.abs(Math.hypot(u - 23, v - 30.2) - 0.9) <= 0.45) {
            k = 'r'
          }
          const d = Math.hypot(u - 23, v - 32.3)

          if (d <= 1.9) {
            k = d <= 0.8 && u < 23 && v < 32.2 ? 't' : 'T'
          }
        }
      }
      const outRow = out[y]

      if (outRow !== undefined) {
        outRow[x] = k
      }
    })
  })

  return out
}

// One <path> per color: each run of a color on a row is "M x y h w v1 h-w z".
function paths(grid: Grid, pal: Palette): string {
  const runs: Record<string, string> = {}

  grid.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const k = row[x]
      let end = x + 1

      while (end < row.length && row[end] === k) {
        end++
      }
      if (k !== undefined && pal[k] !== undefined) {
        runs[k] = (runs[k] ?? '') + `M${x} ${y}h${end - x}v1h-${end - x}z`
      }
      x = end
    }
  })

  return Object.entries(runs)
    .map(([k, d]) => `<path fill="${pal[k]}" d="${d}"/>`)
    .join('')
}

function drawCat(spec: CatSpec, name: string): string {
  const body = paint(spec, inCat, (u, v) => coat(spec, u, v))
  const open = face(spec, body, false)
  const shut = face(spec, body, true)
  const tailCoat = (u: number, v: number): string => (spec.tailStripes && (u + v) % 4 < 1.2 ? 'S' : 'D')
  const tails = [0, 1].map(frame => paint(spec, (u, v) => inTail(u, v, frame, spec.tail), tailCoat))
  const late = name === 'charlie' ? ' late' : ''

  return `
<g class="tail-a${late}">${paths(tails[0] ?? [], spec.pal)}</g>
<g class="tail-b${late}">${paths(tails[1] ?? [], spec.pal)}</g>
${paths(body, spec.pal)}
${paths(open, spec.pal)}
<g class="blink-${name}">${paths(shut, spec.pal)}</g>`
}

// Pixel: dark gray mask and back, white blaze, muzzle, chest and legs, big round amber eyes.
const PIXEL: CatSpec = {
  scale: 1.15,
  eyeR: 3.9,
  tag: 'bell',
  tail: 'left',
  tailStripes: false,
  white: (u, v) =>
    ell(u, v, 23, 22.8, 6.6, 4.8) <= 1 ||
    (v >= 9.4 && v <= 22 && Math.abs(u - 23) <= 0.7 + (v - 9.4) * 0.3) ||
    ell(u, v, 23, 31.4, 10.2, 7.6) <= 1 ||
    ell(u, v, 23, 42.5, 9.6, 11.5) <= 1 ||
    inLegs(u, v),
  stripe: () => false,
  cream: () => false,
  pal: {
    o: '#24242b', D: '#4a4a56', d: '#393943', h: '#60606d', W: '#f8f5ef', w: '#dcd5ca', I: '#e2a3ab',
    E: '#eeac42', e: '#c27818', P: '#17120c', L: '#fff8e8', N: '#eea2ac', n: '#c97a85', m: '#3a2e2e',
    x: '#9a9aa6', C: '#a6d495', T: '#4cbb3a', t: '#c4f3b3', B: '#c98a98',
  },
}

// Charlie: orange with tabby stripes on the forehead and sides, cream around the muzzle,
// white chin, chest and legs, amber-brown eyes.
const CHARLIE: CatSpec = {
  scale: 0.95,
  eyeR: 3.75,
  tag: 'tag',
  tail: 'left',
  tailStripes: true,
  white: (u, v) =>
    ell(u, v, 23, 23.9, 4.9, 3.3) <= 1 ||
    ell(u, v, 23, 31.8, 9.8, 7.4) <= 1 ||
    ell(u, v, 23, 42.5, 9, 11.5) <= 1 ||
    (inLegs(u, v) && !(u > 23 && v > 38 && v < 47 && u < 27.5)),
  stripe: (u, v) => {
    const du = Math.abs(u - 23)

    if (inHead(u, v) && v < 11.5 - du * 0.45 && v > 3.5 && du < 6.5) {
      return Math.floor(du * 0.9) % 2 === 1
    }
    if (inCheeks(u, v) && du > 11.6 && (Math.round(v) === 19 || Math.round(v) === 21)) {
      return true
    }

    return inBody(u, v) && du > 10.5 && v > 36 && Math.round(v * 0.8) % 3 === 0
  },
  cream: (u, v) => ell(u, v, 23, 21.2, 7.4, 4.3) <= 1,
  pal: {
    o: '#8a4a1c', D: '#eda865', d: '#d38a45', h: '#f8c993', W: '#fdf8ef', w: '#ead9c2', I: '#f0a8a8',
    S: '#cf7d38', E: '#d9a24c', e: '#a8701f', P: '#24140a', L: '#fff6e0', N: '#f0a3a6', n: '#c87a7e',
    m: '#8a4a1c', x: '#fff1dc', C: '#cfd2da', T: '#cf3a2f', t: '#f48a7e', r: '#e8e9ee', B: '#f2938a',
  },
}

// Art pixels: one grid cell of either cat is PX scene units.
const PX = 4.5

// One cat with its floor shadow, placed so its body's left edge (base u = 0) is the group's
// origin and the bottom of its lowest drawn row of pixels sits exactly on the floor line
// (y 0), so cats of different scales stand on the same line.
function seated(spec: CatSpec, name: string): string {
  const s = spec.scale
  const shadowU = spec.tail === 'right' ? 31 : 15
  const body = paint(spec, inCat, () => 'D')
  let rows = body.length

  while (rows > 0 && (body[rows - 1] ?? []).every(cell => cell === undefined)) {
    rows--
  }

  return `<ellipse cx="${(shadowU * s * PX).toFixed(1)}" cy="${-PX}" rx="${(27 * s * PX).toFixed(1)}" ry="${4 * PX}" fill="#e2ccaa"/>
<g transform="translate(${(U0 * s * PX).toFixed(1)} ${(-rows * PX).toFixed(1)}) scale(${PX})">${drawCat(spec, name)}</g>`
}

const PIXEL_SVG = seated(PIXEL, 'pixel')
const CHARLIE_SVG = seated(CHARLIE, 'charlie')

// ---------- window ----------

const rect = (x: number, y: number, w: number, h: number, fill: string): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

// Pixel clouds: rows of runs, art pixels.
const cloud = (x: number, y: number): string =>
  rect(x + 3, y, 6, 1, '#ffffff') + rect(x + 1, y + 1, 11, 1, '#ffffff') + rect(x, y + 2, 15, 2, '#ffffff') + rect(x + 1, y + 4, 13, 1, '#e3f1fb')

// 56 x 47 art pixels: frame, daytime sky, clouds, sun, cross bars, sill, plaid curtains.
const WINDOW = `<g transform="scale(${PX})">
${rect(0, 0, 56, 46, '#6b3a22')}
${rect(3, 3, 50, 13, '#8fcbef')}
${rect(3, 16, 50, 13, '#a9d8f4')}
${rect(3, 29, 50, 14, '#c6e6f8')}
${rect(38, 6, 8, 8, '#ffe39a')}${rect(37, 7, 10, 6, '#ffe39a')}${rect(39, 7, 6, 6, '#fff1c4')}
${cloud(7, 9)}${cloud(30, 31)}${cloud(10, 34)}
${rect(27, 3, 3, 40, '#6b3a22')}
${rect(3, 21, 50, 3, '#6b3a22')}
${rect(-3, 43, 62, 4, '#7d4a2b')}${rect(-3, 43, 62, 1, '#9a6240')}
${rect(-8, -5, 72, 2, '#5a3020')}
${rect(-7, -3, 8, 52, '#f4ead6')}${rect(55, -3, 8, 52, '#f4ead6')}
${[-5, -1, 57, 61].map(x => rect(x, -3, 1, 52, '#cdb48c')).join('')}
${[6, 18, 30, 42].map(y => rect(-7, y, 8, 1, '#b39770') + rect(55, y, 8, 1, '#b39770')).join('')}
</g>`

// ---------- room ----------

const W = 1600
const H = 1000
// The floor starts high enough that the cats sit above the app's message box.
const FLOOR = 740

function room(): string {
  let out = rect(0, 0, W, FLOOR, '#f2ece3')

  for (let x = 0; x < W; x += 54) {
    out += rect(x, 0, 27, FLOOR - 24, '#ede6db')
  }
  // Pale honey wood, light enough that the conversation's muted text stays at 4.5:1 or
  // better over every color here once the frosted layer is over it.
  out += rect(0, FLOOR - 24, W, 24, '#dcc5a3') + rect(0, FLOOR - 24, W, 4.5, '#e9d6b8')
  out += rect(0, FLOOR, W, H - FLOOR, '#ecdcc2')

  // Long grain streaks, plank seams, staggered joints, all low in contrast.
  for (let row = 0, y = FLOOR; y < H; row++, y += 36) {
    out += rect(0, y + 9, W, 4.5, '#f3e8d6') + rect(0, y + 22.5, W, 4.5, '#e4d0b2') + rect(0, y + 31.5, W, 4.5, '#dcc5a3')

    for (let x = (row % 2) * 160 + 40; x < W; x += 320) {
      out += rect(x, y, 4.5, 36, '#dcc5a3')
    }
  }

  return out
}

// ---------- layout ----------
//
// The scene is cropped to the window's shape (slice), so what is visible depends on the
// aspect ratio. For each band of aspect ratios this places, for the narrowest shape in it:
// Pixel in the gap between the app's sidebar (about the left 17%) and the conversation's
// text (from about 30%), his tail curling back under the sidebar; Charlie near the right
// edge; and the window above Charlie. Phones have no sidebar, so Pixel moves to the edge.

const BODY_W = 46 * PX // a cat's body width at scale 1, before its own scale

function place(a: number, tallestA: number): string {
  const v = Math.min(W, 1000 * a) // visible width
  const left = (W - v) / 2
  const right = left + v
  const shown = Math.min(H, W / tallestA) // visible height at the band's widest shape
  const top = (H - shown) / 2
  const bottom = top + shown
  const s = Math.min(1, Math.max(0.55, 0.45 + (v / W) * 0.55))
  const feet = Math.min(862, bottom - 22)
  const margin = v * 0.05
  // Pixel's body starts 5.6 base units in from his group's origin.
  // On phones there is no sidebar to tuck his tail under, so leave room for it at the edge.
  const pixelX = a >= 0.8 ? left + v * 0.205 - 5.6 * PIXEL.scale * PX * s : left + v * 0.04 + 15 * PIXEL.scale * PX * s
  const charlieX = right - margin - BODY_W * CHARLIE.scale * s
  const ws = s * 0.9
  const windowX = Math.min(charlieX + (BODY_W * CHARLIE.scale * s) / 2 - 28 * PX * ws, right - v * 0.02 - 63 * PX * ws)
  const f = (n: number): string => n.toFixed(0)

  return [
    `.pixel { transform: translate(${f(pixelX)}px, ${f(feet)}px) scale(${s.toFixed(2)}); }`,
    `.charlie { transform: translate(${f(charlieX)}px, ${f(feet)}px) scale(${s.toFixed(2)}); }`,
    `.window { transform: translate(${f(windowX)}px, ${f(top + 90)}px) scale(${ws.toFixed(2)}); }`,
  ].join(' ')
}

// Widest first; each later band is narrower and wins where it applies.
const BANDS = [2.2, 2.0, 1.8, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
const LAYOUT = [
  `  ${place(BANDS[0] ?? 2.2, 2.6)}`,
  ...BANDS.map((high, i) => {
    const low = BANDS[i + 1] ?? 0.3

    return `  @media (max-aspect-ratio: ${Math.round(high * 100)}/100) { ${place(low, high)} }`
  }),
].join('\n')

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<style>
${LAYOUT}

  /* Every animation steps: the scene redraws only when a frame changes. */
  .tail-b { opacity: 0; }
  .tail-a { animation: tail-a 4s step-end infinite; }
  .tail-b { animation: tail-b 4s step-end infinite; }
  .late { animation-delay: -2s; }
  @keyframes tail-a { 0% { opacity: 1; } 75% { opacity: 0; } }
  @keyframes tail-b { 0% { opacity: 0; } 75% { opacity: 1; } }

  .blink-pixel, .blink-charlie { opacity: 0; }
  .blink-pixel { animation: blink 5s step-end infinite; }
  .blink-charlie { animation: blink 7s step-end infinite; animation-delay: -3s; }
  @keyframes blink { 0% { opacity: 0; } 95% { opacity: 1; } 98% { opacity: 0; } }

  @media (prefers-reduced-motion: reduce) {
    .tail-a, .tail-b, .blink-pixel, .blink-charlie { animation: none; }
  }
</style>
<g class="room">
${room()}
<g class="window">${WINDOW}</g>
<g class="pixel">${PIXEL_SVG}</g>
<g class="charlie">${CHARLIE_SVG}</g>
</g>
</svg>`

export const pixelCats: Look = {
  id: 'pixel-cats',
  label: 'Pixel cats',
  description: 'Pixel and Charlie in a sunny pixel room',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'pixel-cats', glass: { blur: 0, tint: '#f3ede4', opacity: 0.45 } },
  },
  scenes: {
    'pixel-cats': {
      source: SCENE,
      alt: 'Pixel art of two fluffy cats, a bigger gray and white tuxedo and a smaller orange and white one, sitting on a light wood floor below a sunny window',
    },
  },
}
