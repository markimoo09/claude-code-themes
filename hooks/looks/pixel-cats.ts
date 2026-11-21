import type { Look } from './types'

import { makeColors } from '../make-colors.js'
import { Art, seeded } from './pixel'

// Pixel (the gray-and-white tuxedo) and Charlie (the orange-and-white one) at home on a winter
// night, drawn as pixel art: Pixel sits by his yarn in front of a lamp-lit bookshelf,
// Charlie loafs on top of the cat tree by the moonlit window, under a string of fairy lights.
// Colors come from them: Charlie's orange is the accent, Pixel's bell green is success, their
// pink noses are literals.
const { theme, problems } = makeColors({
  label: 'Pixel cats',
  only: 'dark',
  roles: {
    accent: '#e8954a',
    danger: '#ef6b5b',
    success: '#6fc35f',
    warning: '#e3b341',
    pro: '#e07fa0',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#17131c',
        'surface-1': '#1c1722',
        'surface-2': '#221c29',
        'surface-3': '#27202f',
        'text-primary': '#f5eee6',
        'text-secondary': '#d6cabd',
        'text-muted': '#ab9f93',
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

const SPAN = 78 // base units across the grid, from the pose's left edge (u0)

type CatSpec = {
  scale: number
  pal: Palette
  eyeR: number
  white: (u: number, v: number) => boolean
  stripe: (u: number, v: number) => boolean
  cream: (u: number, v: number) => boolean
  tag: 'bell' | 'tag'
  pose: Pose
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

const inFace = (u: number, v: number): boolean => inHead(u, v) || inCheeks(u, v)

// ---------- poses ----------
//
// A pose is the body below the head: its silhouette, the legs (drawn white on both cats), where
// the toe lines go, the grid's left edge and how many base rows it needs, where the shadow
// falls, and two tail frames. A tail is discs along a path from the body outward, written for a
// tail on the left and mirrored for one on the right. The head always faces the viewer.

type Shape = (u: number, v: number) => boolean
type Pose = {
  body: Shape
  legs: Shape
  toe: [number, number]
  u0: number
  rows: number
  shadow: [number, number]
  tail: [number, number][][]
}

const fluffy = (u: number, v: number, cu: number, cv: number, ru: number, rv: number): boolean => {
  const fluff = 1 + 0.05 * Math.sin(11 * Math.atan2(v - cv, u - cu))

  return ell(u, v, cu, cv, ru * fluff, rv * fluff) <= 1
}

// Sitting up facing the viewer, front paws side by side, the tail curled round to one side.
const SIT: Pose = {
  body: (u, v) => {
    if (v > 53.6) {
      return false
    }
    const fluff = 1 + 0.05 * Math.sin(11 * Math.atan2(v - 39, u - 23))

    return ell(u, v, 23, 39, 14.6 * fluff, 13 * fluff) <= 1 || ell(u, v, 23, 46.5, 17.4 * fluff, 7.6) <= 1
  },
  legs: (u, v) => {
    const h = half(u)

    return (v >= 33 && v <= 51.5 && h >= 16.3 && h <= 21.6) || ell(h, v, 18.9, 51.4, 3.7, 2.1) <= 1
  },
  toe: [18.9, 50.6],
  u0: -16,
  rows: 54,
  shadow: [15, 27],
  tail: [
    [[10, 49], [3, 51.6], [-4, 51], [-8.6, 47.4], [-9.6, 42.6]],
    [[10, 49], [3, 51.8], [-4, 51.8], [-9.6, 50.4], [-13, 47.6]],
  ],
}

// A loaf: lying flat, legs folded out of sight, a long low body running off to the right behind
// the head, the tips of the front paws peeking out under the chin, and the tail hanging down over
// the edge of whatever the cat is lying on.
const LOAF: Pose = {
  body: (u, v) => v <= 45.4 && (fluffy(u, v, 38, 35.5, 20, 10) || ell(u, v, 23, 36, 12, 9.5) <= 1),
  legs: (u, v) => v <= 45.6 && ell(half(u), v, 18.4, 43.6, 3.8, 2.4) <= 1,
  toe: [18.4, 43.4],
  u0: -10,
  rows: 62,
  shadow: [38, 22],
  tail: [
    [[-9, 41], [-12.5, 42.5], [-14, 46.5], [-14.2, 52.5], [-13.4, 58.4]],
    [[-9, 41], [-12.5, 42.5], [-13.6, 46.5], [-12.6, 52.4], [-10.8, 58]],
  ],
}

const catShape = (pose: Pose): Shape => (u, v) => inFace(u, v) || inEar(u, v) || pose.body(u, v) || pose.legs(u, v)

function inTail(u: number, v: number, points: [number, number][], side: 'left' | 'right'): boolean {
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
  const h = Math.ceil(spec.pose.rows * s)
  const at = (x: number, y: number): [number, number] => [spec.pose.u0 + (x + 0.5) / s, (y + 0.5) / s]
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
    const { body, legs, toe } = spec.pose
    const legGap = v > 37 && body(u, v) && !legs(u, v) && (legs(u - 0.9, v) || legs(u + 0.9, v))
    const toes = legs(u, v) && v > toe[1] && Math.abs(half(u) - toe[0]) > 0.6 && Math.abs(half(u) - toe[0]) < 1.4

    return ruffEdge || legGap || toes ? 'w' : 'W'
  }
  // A soft shadow where the head meets the body, so the two read apart.
  if (!inFace(u, v) && !inEar(u, v) && (inFace(u - 0.9, v) || inFace(u + 0.9, v) || inFace(u, v - 0.9))) {
    return 'd'
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
      const u = spec.pose.u0 + (x + 0.5) / s
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

// ---------- compact paths ----------
//
// Runs of one color, written short: a run one pixel tall is a stroke through the middle of its
// row (one pixel wide by default), a taller block is a filled rectangle, and each starts from
// where the last one ended, so its numbers stay small. Two <path>s per color at most.

type Run = { x: number; y: number; w: number; h: number; fill: string }

// A relative move, without the space a minus sign makes unneeded.
const move = (dx: number, dy: number): string => `m${dx}${dy < 0 ? '' : ' '}${dy}`

function encode(runs: Run[]): string {
  const byFill = new Map<string, Run[]>()

  for (const r of runs) {
    byFill.set(r.fill, [...(byFill.get(r.fill) ?? []), r])
  }
  let out = ''

  for (const [fill, all] of byFill) {
    let d = ''
    let [cx, cy] = [0, 0]

    for (const r of all.filter(r => r.h === 1)) {
      d += d === '' ? `M${r.x} ${r.y + 0.5}` : move(r.x - cx, r.y + 0.5 - cy)
      d += `h${r.w}`;
      [cx, cy] = [r.x + r.w, r.y + 0.5]
    }
    if (d !== '') {
      out += `<path stroke="${fill}" d="${d}"/>`
    }
    d = ''
    for (const r of all.filter(r => r.h > 1)) {
      d += d === '' ? `M${r.x} ${r.y}` : move(r.x - cx, r.y - cy)
      d += `h${r.w}v${r.h}h-${r.w}z`;
      [cx, cy] = [r.x, r.y]
    }
    if (d !== '') {
      out += `<path fill="${fill}" d="${d}"/>`
    }
  }

  return out
}

// A cat's grid, run by run along its rows.
function paths(grid: Grid, pal: Palette): string {
  const runs: Run[] = []

  grid.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const k = row[x]
      let end = x + 1

      while (end < row.length && row[end] === k) {
        end++
      }
      const fill = k === undefined ? undefined : pal[k]

      if (fill !== undefined) {
        runs.push({ x, y, w: end - x, h: 1, fill })
      }
      x = end
    }
  })

  return encode(runs)
}

// An Art's drawing, re-encoded: it writes every block as an absolute rectangle.
function artPaths(a: Art): string {
  const runs: Run[] = []

  for (const [, fill, d] of a.svg().matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)) {
    for (const [, x, y, w, h] of (d ?? '').matchAll(/M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\d+z/g)) {
      runs.push({ x: Number(x), y: Number(y), w: Number(w), h: Number(h), fill: fill ?? '' })
    }
  }

  return encode(runs)
}

function drawCat(spec: CatSpec, name: string): string {
  const body = paint(spec, catShape(spec.pose), (u, v) => coat(spec, u, v))
  const open = face(spec, body, false)
  const shut = face(spec, body, true)
  const tailCoat = (u: number, v: number): string => (spec.tailStripes && (u + v) % 4 < 1.2 ? 'S' : 'D')
  const tails = spec.pose.tail.map(points => paint(spec, (u, v) => inTail(u, v, points, spec.tail), tailCoat))
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
  pose: SIT,
  tail: 'left',
  tailStripes: false,
  white: (u, v) =>
    ell(u, v, 23, 22.8, 6.6, 4.8) <= 1 ||
    (v >= 9.4 && v <= 22 && Math.abs(u - 23) <= 0.7 + (v - 9.4) * 0.3) ||
    ell(u, v, 23, 31.4, 10.2, 7.6) <= 1 ||
    ell(u, v, 23, 42.5, 9.6, 11.5) <= 1 ||
    SIT.legs(u, v),
  stripe: () => false,
  cream: () => false,
  pal: {
    o: '#24242b', D: '#4a4a56', d: '#393943', h: '#60606d', W: '#f8f5ef', w: '#dcd5ca', I: '#e2a3ab',
    E: '#eeac42', e: '#c27818', P: '#17120c', L: '#fff8e8', N: '#eea2ac', n: '#c97a85', m: '#3a2e2e',
    x: '#9a9aa6', C: '#a6d495', T: '#4cbb3a', t: '#c4f3b3', B: '#c98a98',
  },
}

// Charlie: orange with tabby stripes on the forehead and back, cream around the muzzle,
// white chin, chest and paws, amber-brown eyes.
const CHARLIE: CatSpec = {
  scale: 0.95,
  eyeR: 3.75,
  tag: 'tag',
  pose: LOAF,
  tail: 'right',
  tailStripes: true,
  white: (u, v) =>
    ell(u, v, 23, 23.9, 4.9, 3.3) <= 1 ||
    ell(u, v, 23, 31.8, 9.8, 7.4) <= 1 ||
    LOAF.legs(u, v),
  stripe: (u, v) => {
    const du = Math.abs(u - 23)

    if (inHead(u, v) && v < 11.5 - du * 0.45 && v > 3.5 && du < 6.5) {
      return Math.floor(du * 0.9) % 2 === 1
    }
    if (inCheeks(u, v) && du > 11.6 && (Math.round(v) === 19 || Math.round(v) === 21)) {
      return true
    }

    return LOAF.body(u, v) && !inFace(u, v) && u > 33 && v < 43 && Math.floor(u / 2.6) % 2 === 0
  },
  cream: (u, v) => ell(u, v, 23, 21.2, 7.4, 4.3) <= 1,
  pal: {
    o: '#8a4a1c', D: '#eda865', d: '#d38a45', h: '#f8c993', W: '#fdf8ef', w: '#ead9c2', I: '#f0a8a8',
    S: '#cf7d38', E: '#d9a24c', e: '#a8701f', P: '#24140a', L: '#fff6e0', N: '#f0a3a6', n: '#c87a7e',
    m: '#8a4a1c', x: '#fff1dc', C: '#cfd2da', T: '#cf3a2f', t: '#f48a7e', r: '#e8e9ee', B: '#f2938a',
  },
}

// Art pixels: one grid cell of either cat, and of everything else in the room, is PX scene units.
const PX = 4.5

// One cat with its shadow, placed so its body's left edge (base u = 0) is the group's origin and
// the bottom of its lowest drawn row of body pixels sits exactly on the line it rests on (y 0).
// A hanging tail reaches below that line.
function seated(spec: CatSpec, name: string, shadow: boolean, between = ''): string {
  const s = spec.scale
  const [shadowU, shadowR] = spec.pose.shadow
  const body = paint(spec, catShape(spec.pose), () => 'D')
  let rows = body.length

  while (rows > 0 && (body[rows - 1] ?? []).every(cell => cell === undefined)) {
    rows--
  }
  const under = shadow
    ? `<ellipse cx="${(shadowU * s * PX).toFixed(1)}" cy="${-PX}" rx="${(shadowR * s * PX).toFixed(1)}" ry="${4 * PX}" fill="#120d10" opacity=".35"/>`
    : ''

  return `${under}${between}<g transform="translate(${(spec.pose.u0 * s * PX).toFixed(1)} ${(-rows * PX).toFixed(1)}) scale(${PX})">${drawCat(spec, name)}</g>`
}

// An Art's paths at art-pixel scale.
const art = (a: Art): string => `<g transform="scale(${PX})">${artPaths(a)}</g>`
// A soft glow in art pixels, from a gradient in <defs>.
const glow = (cx: number, cy: number, rx: number, ry: number, id: string): string =>
  `<ellipse cx="${cx * PX}" cy="${cy * PX}" rx="${rx * PX}" ry="${ry * PX}" fill="url(#${id})"/>`

// ---------- the left corner: Pixel, his yarn, the bookshelf and the lamp ----------
//
// Art pixels from the group's origin: Pixel's body's left edge (base u = 0) on the floor. Pixel
// sits in front of the shelf facing the viewer, his tail curled toward his balls of yarn.

const BOOKS = ['#a8433a', '#3f6e8c', '#c9a24a', '#4f7d4f', '#7a4f86', '#d98c5f', '#8c3f55', '#5d8a96']

// A row of book spines standing on a shelf at y, from x for w pixels, up to h tall.
function books(a: Art, x: number, y: number, w: number, h: number, rand: () => number): void {
  for (let bx = x; bx < x + w; ) {
    const bw = Math.min(2 + Math.floor(rand() * 3), x + w - bx)
    const bh = h - Math.floor(rand() * 7)
    const color = BOOKS[Math.floor(rand() * BOOKS.length)] ?? '#a8433a'

    a.rect(bx, y - bh, bw, bh, color)
    if (bw > 2) {
      a.rect(bx, y - bh + 3, bw, 1, '#e8d2a0')
      a.rect(bx, y - 4, bw, 1, '#e8d2a0')
    }
    bx += bw + (rand() < 0.15 ? 1 : 0)
  }
}

// A trailing pothos leaf: two by two, lit on its top left.
const leaf = (a: Art, x: number, y: number): void => {
  a.rect(x, y, 2, 2, '#4f8a46')
  a.set(x, y, '#78b35f')
}

function leftCorner(): string {
  const back = new Art()
  const rand = seeded(7)
  const [L, R, T, B] = [-8, 44, -112, -6]

  // The hanging plant in the corner, from the ceiling on a macramé cord.
  back.rect(-24, -420, 1, 252, '#d9c7a8') // long enough to reach the top at every scale
  for (let i = 0; i < 9; i++) {
    back.set(-24 - Math.round(i * 0.75), -168 + i, '#d9c7a8')
    back.set(-24 + Math.round(i * 0.75), -168 + i, '#d9c7a8')
  }
  back.rect(-31, -159, 15, 9, '#e6dccb')
  back.rect(-31, -159, 15, 1, '#f4ede0')
  back.rect(-31, -155, 15, 1, '#c9b9a0')
  back.rect(-30, -150, 13, 1, '#b8a68c')
  for (const [x, len] of [[-31, 34], [-26, 46], [-20, 26], [-17, 38]] as const) {
    for (let j = 0; j < len; j++) {
      back.set(x + Math.round(Math.sin(j / 5) * 1.5), -150 + j, '#3f6e38')
    }
    for (let j = 2; j < len; j += 5) {
      leaf(back, x + Math.round(Math.sin(j / 5) * 1.5) + (j % 2 === 0 ? -2 : 1), -150 + j)
    }
  }
  for (const [x, y] of [[-30, -162], [-26, -164], [-21, -163], [-18, -161]] as const) {
    leaf(back, x, y)
  }

  // A framed picture of a fish on the wall, above the shelf.
  back.rect(0, -156, 17, 15, '#8a6a48')
  back.rect(1, -155, 15, 13, '#e9dcc4')
  back.rect(3, -153, 11, 9, '#35577e')
  back.rect(5, -150, 5, 3, '#e8954a')
  back.rect(10, -151, 1, 5, '#e8954a')
  back.rect(11, -150, 1, 3, '#e8954a')
  back.set(6, -149, '#2a1a10')
  back.set(4, -152, '#9fc6ea')
  back.set(5, -153, '#9fc6ea')

  // The bookshelf: carcass, dark back, top board, two shelves, plinth.
  back.rect(L, T, R - L, B - T, '#5a3a28')
  back.rect(L + 2, T + 4, R - L - 4, B - T - 8, '#2f2019')
  back.rect(L - 1, T, R - L + 2, 3, '#7a5038')
  back.rect(L - 1, T, R - L + 2, 1, '#9a6a46')
  for (const y of [-80, -46]) {
    back.rect(L + 2, y, R - L - 4, 3, '#6b4630')
    back.rect(L + 2, y, R - L - 4, 1, '#8a5c3e')
  }
  back.rect(L, B - 4, R - L, 4, '#46301f')

  // Top shelf: books, a standing photo, a mug.
  books(back, L + 3, -80, 26, 24, rand)
  back.rect(25, -91, 9, 11, '#c9a26a')
  back.rect(26, -90, 7, 9, '#7fa9c9')
  back.rect(26, -85, 7, 4, '#6b8f5a')
  back.rect(36, -86, 5, 6, '#e6dccb')
  back.rect(41, -85, 1, 3, '#e6dccb')
  back.rect(36, -86, 5, 1, '#f6efe2')
  // Middle shelf: a stack lying flat, more books, a little cactus.
  for (const [i, color] of ['#7a4f86', '#c9a24a', '#3f6e8c'].entries()) {
    back.rect(L + 3 + (i % 2), -48 - 3 * (i + 1), 13 - i, 3, color)
    back.rect(L + 3 + (i % 2), -48 - 3 * (i + 1), 1, 3, '#e8d2a0')
  }
  books(back, 8, -46, 22, 25, rand)
  back.rect(33, -53, 7, 6, '#b5643f')
  back.rect(32, -54, 9, 1, '#c97a50')
  back.rect(35, -61, 3, 7, '#5f9a50')
  back.rect(33, -59, 2, 3, '#5f9a50')
  back.rect(38, -58, 2, 3, '#5f9a50')
  back.set(35, -61, '#8cc46e')
  // Bottom shelf: two woven baskets.
  for (const x of [L + 3, 19]) {
    back.rect(x, -24, 21, 14, '#a07b4c')
    back.rect(x, -24, 21, 2, '#bc9662')
    for (let y = -21; y < -10; y += 3) {
      back.rect(x, y, 21, 1, '#86643c')
    }
  }

  // The plant on top of the shelf, trailing down its side.
  back.rect(-5, -119, 10, 7, '#b5643f')
  back.rect(-6, -120, 12, 2, '#c97a50')
  for (const [x, y] of [[-4, -124], [-1, -127], [2, -125], [-7, -122], [4, -122]] as const) {
    leaf(back, x, y)
  }
  for (let j = 0; j < 44; j++) {
    back.set(-9 + Math.round(Math.sin(j / 6)), -116 + j, '#3f6e38')
    if (j % 5 === 2) {
      leaf(back, -9 + Math.round(Math.sin(j / 6)) + (j % 2 === 0 ? -2 : 1), -116 + j)
    }
  }

  // The lamp: brass base and stem, a lit shade.
  back.rect(25, -115, 10, 3, '#b88a4a')
  back.rect(26, -116, 8, 1, '#d4a862')
  back.rect(29, -128, 2, 12, '#a87a3e')
  for (let j = 0; j < 15; j++) {
    const w = 12 + Math.round((j * 10) / 14)
    const x = 30 - Math.floor(w / 2)

    back.rect(x, -143 + j, w, 1, '#f6d692')
    back.set(x, -143 + j, '#fbe9bd')
    back.rect(x + w - 2, -143 + j, 2, 1, '#e3b46a')
  }
  back.rect(24, -143, 12, 1, '#e0ad62')
  back.rect(19, -129, 22, 1, '#fff2c8')

  // Yarn: a ball by Pixel's tail, its strand wandering off to a smaller ball.
  const yarn = new Art()

  yarn.disc(-20, -5, 4.6, '#d0607a')
  for (const [x, y, w] of [[-23, -8, 4], [-24, -5, 7], [-23, -2, 5]] as const) {
    yarn.rect(x, y, w, 1, '#a8445c')
  }
  yarn.rect(-22, -9, 2, 1, '#f290a6')
  for (let x = -25; x > -29; x--) {
    yarn.set(x, -1 - Math.round((1 + Math.sin(x / 2.2)) * 0.8), '#d0607a')
  }
  yarn.disc(-32, -4, 3.4, '#5a86c0')
  yarn.rect(-34, -5, 5, 1, '#3f6aa0')
  yarn.rect(-33, -3, 4, 1, '#3f6aa0')

  const lamp = glow(30, -134, 70, 62, 'g-lamp')

  return `${lamp}${art(back)}${seated(PIXEL, 'pixel', true, art(yarn))}`
}

// ---------- the right corner: the window, the cat tree, Charlie on top ----------
//
// Art pixels from the group's origin: the middle of the cat tree's base, on the floor.

const SISAL = (a: Art, x: number, y: number, w: number, h: number): void => {
  a.rect(x, y, w, h, '#cdb184')
  for (let j = 0; j < h; j += 2) {
    a.rect(x, y + j, w, 1, '#ad9264')
  }
  a.rect(x, y, 1, h, '#ddc49a')
  a.rect(x + w - 1, y, 1, h, '#9a7f54')
}
const PLATFORM = (a: Art, x: number, y: number, w: number): void => {
  a.rect(x, y, w, 4, '#8a7d70')
  a.rect(x, y, w, 1, '#a89b8d')
  a.rect(x, y + 3, w, 1, '#6a5f55')
}

function rightCorner(): string {
  const back = new Art()
  const rand = seeded(11)
  const [wl, wt, ww, wh] = [-46, -172, 60, 60]

  // The window: frame, night sky in bands, the moon, stars, cross bars and sill.
  back.rect(wl, wt, ww, wh, '#3e2618')
  for (const [y, color] of [[3, '#1a2148'], [18, '#202a58'], [33, '#28356a'], [46, '#30407a']] as const) {
    back.rect(wl + 3, wt + y, ww - 6, wh - 3 - y, color)
  }
  back.disc(wl + 46, wt + 13, 5.4, '#fff2c8')
  back.disc(wl + 44, wt + 11, 1.2, '#eadbae')
  back.set(wl + 48, wt + 16, '#eadbae')
  back.set(wl + 49, wt + 12, '#eadbae')
  for (let i = 0; i < 16; i++) {
    const x = wl + 4 + Math.floor(rand() * (ww - 8))
    const y = wt + 4 + Math.floor(rand() * 40)

    back.set(x, y, i % 4 === 0 ? '#ffffff' : '#c9d2f4')
  }
  for (const [x, y] of [[wl + 12, wt + 10], [wl + 36, wt + 30]] as const) {
    back.rect(x - 1, y, 3, 1, '#fff6d8')
    back.rect(x, y - 1, 1, 3, '#fff6d8')
  }
  back.rect(wl + 28, wt + 3, 3, wh - 6, '#3e2618')
  back.rect(wl + 3, wt + 27, ww - 6, 3, '#3e2618')
  back.rect(wl - 3, wt + wh - 3, ww + 6, 4, '#5a3a26')
  back.rect(wl - 3, wt + wh - 3, ww + 6, 1, '#76503a')

  // Curtains, tied back, on a brass rod.
  back.rect(wl - 9, wt - 6, ww + 18, 2, '#c9a26a')
  back.rect(wl - 10, wt - 7, 2, 4, '#e0bd84')
  back.rect(wl + ww + 8, wt - 7, 2, 4, '#e0bd84')
  for (const side of [0, 1]) {
    for (let j = 0; j < 72; j++) {
      const pinch = j > 40 && j < 46 ? 2 : j > 34 && j < 52 ? 1 : 0
      const w = 9 - pinch
      const x = side === 0 ? wl - 8 : wl + ww + 8 - w

      back.rect(x, wt - 4 + j, w, 1, '#6d4256')
      back.set(x + 3, wt - 4 + j, '#5a3546')
      back.set(x + 6, wt - 4 + j, '#5a3546')
      back.set(side === 0 ? x : x + w - 1, wt - 4 + j, '#835368')
      if (j === 42) {
        back.rect(x, wt - 4 + j, w, 2, '#c9a26a')
      }
    }
  }

  // The cat tree: base, a cubby with a round door, two sisal posts, three carpeted platforms.
  back.rect(-30, -5, 60, 5, '#7c7064')
  back.rect(-30, -5, 60, 1, '#9a8e82')
  back.rect(-28, -33, 28, 28, '#857868')
  back.rect(-28, -33, 2, 28, '#9a8e80')
  back.rect(-2, -33, 2, 28, '#6a5f55')
  for (let dy = -8; dy <= 8; dy++) {
    const half = Math.round(7 * Math.sqrt(1 - (dy / 8.6) ** 2))

    back.rect(-14 - half, -18 + dy, half * 2, 1, '#231c18')
  }
  back.rect(-21, -27, 14, 1, '#6a5f55')
  PLATFORM(back, -30, -37, 32)
  SISAL(back, 10, -64, 8, 59)
  PLATFORM(back, 2, -68, 28)
  SISAL(back, -18, -88, 8, 51)
  PLATFORM(back, -40, -92, 50)
  // A pom-pom on a string under the middle platform.
  back.rect(26, -64, 1, 14, '#d8cfc0')
  back.disc(26, -47, 2.6, '#e05a6a')
  back.set(25, -48, '#f58a96')

  // Charlie on the top platform, the end of her body at its right edge, her tail over it.
  const charlieX = (8 - 58 * CHARLIE.scale) * PX
  const moon = glow(wl + ww / 2, wt + wh / 2, 62, 56, 'g-moon')

  return `${moon}${art(back)}<g transform="translate(${charlieX.toFixed(1)} ${-92 * PX})">${seated(CHARLIE, 'charlie', false)}</g>`
}

// ---------- the room ----------

const W = 1600
const H = 1000
// The wall meets the floor here; the cats and the tree stand lower, toward the viewer.
const FLOOR = 740
// Where both corners stand at 16:10, before the per-aspect layout moves them.
const FEET = 862

// String lights across the top of the wall, in three swags.
function fairyLights(): string {
  const a = new Art()
  const across = Math.ceil(W / PX)
  const y = (x: number): number => 8 + Math.round(9 * Math.sin((Math.PI * x) / (across / 3)) ** 2)
  const BULBS = [
    ['#ffd27a', '#6a5440'],
    ['#ff9fb0', '#6a4450'],
    ['#9fe0ff', '#40566a'],
    ['#c8f59a', '#4f6040'],
  ] as const

  for (let x = 0; x < across; x++) {
    a.set(x, y(x), '#4a3f3a')
  }
  for (let x = 4, i = 0; x < across; x += 9, i++) {
    const [bulb, halo] = BULBS[i % BULBS.length] ?? BULBS[0]
    const by = y(x) + 1

    a.rect(x - 1, by + 1, 4, 3, halo)
    a.rect(x - 0, by, 2, 1, '#2e2622')
    a.rect(x, by + 1, 2, 3, bulb)
  }

  return art(a)
}

// Three small framed pictures on the wall behind the conversation, and a rug on the floor.
function middle(): string {
  const a = new Art()

  for (const [x, y, w, h, mat, inside] of [
    [124, 56, 24, 18, '#e9dcc4', '#3d5a7a'],
    [153, 50, 14, 20, '#e9dcc4', '#7a4a5a'],
    [172, 58, 26, 17, '#e9dcc4', '#4f6e4a'],
  ] as const) {
    a.rect(x, y, w, h, '#8a6a48')
    a.rect(x + 1, y + 1, w - 2, h - 2, mat)
    a.rect(x + 3, y + 3, w - 6, h - 6, inside)
  }
  // Their scenes: hills under a moon, a heart, a paw print.
  a.rect(127, 66, 18, 5, '#2d4560')
  a.rect(131, 64, 8, 2, '#2d4560')
  a.disc(140, 62, 1.6, '#fff2c8')
  a.rect(158, 57, 2, 2, '#e8899a')
  a.rect(161, 57, 2, 2, '#e8899a')
  a.rect(157, 59, 7, 2, '#e8899a')
  a.rect(158, 61, 5, 1, '#e8899a')
  a.rect(159, 62, 3, 1, '#e8899a')
  a.rect(183, 66, 4, 3, '#e6dccb')
  for (const [x, y] of [[180, 63], [183, 62], [186, 62], [189, 63]] as const) {
    a.rect(x, y, 2, 2, '#e6dccb')
  }

  // The rug: an oval with a border, a band, a field and a ring in the middle.
  const [cx, cy, rx, ry] = [W / PX / 2, FEET / PX + 2, 150, 16]
  const rings = [
    [1, '#5e3434'],
    [0.93, '#9a5444'],
    [0.85, '#743f3a'],
    [0.42, '#b8804f'],
    [0.36, '#743f3a'],
    [0.16, '#9a5444'],
  ] as const

  for (let dy = -ry; dy <= ry; dy++) {
    for (const [k, color] of rings) {
      const t = 1 - (dy / (ry * k)) ** 2

      if (t > 0) {
        const half = Math.round(rx * k * Math.sqrt(t))

        a.rect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1, color)
      }
    }
  }

  return art(a)
}

// Striped wallpaper, a skirting board and dark wooden planks, from patterns.
const ROOM = `<rect width="${W}" height="${FLOOR}" fill="#2a2332"/>
<rect width="${W}" height="${FLOOR - 24}" fill="url(#p-wall)"/>
<rect y="${FLOOR - 24}" width="${W}" height="24" fill="#3a2c26"/><rect y="${FLOOR - 24}" width="${W}" height="4.5" fill="#4d3b31"/>
<rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="#3a2a21"/><rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="url(#p-floor)"/>`

const DEFS = `<defs>
<pattern id="p-wall" width="54" height="10" patternUnits="userSpaceOnUse"><rect width="27" height="10" fill="#2e2737"/></pattern>
<pattern id="p-floor" y="${FLOOR}" width="320" height="72" patternUnits="userSpaceOnUse">${[0, 36]
  .map(
    (y, row) =>
      `<rect y="${y + 9}" width="320" height="4.5" fill="#412f25"/><rect y="${y + 22.5}" width="320" height="4.5" fill="#33251d"/><rect y="${y + 31.5}" width="320" height="4.5" fill="#2c2019"/><rect x="${row * 160 + 40}" y="${y}" width="4.5" height="36" fill="#2c2019"/>`,
  )
  .join('')}</pattern>
<radialGradient id="g-lamp"><stop offset="0" stop-color="#ffcf86" stop-opacity=".42"/><stop offset=".5" stop-color="#ffcf86" stop-opacity=".14"/><stop offset="1" stop-color="#ffcf86" stop-opacity="0"/></radialGradient>
<radialGradient id="g-moon"><stop offset="0" stop-color="#a9b8ff" stop-opacity=".2"/><stop offset="1" stop-color="#a9b8ff" stop-opacity="0"/></radialGradient>
</defs>`

// ---------- layout ----------
//
// The scene is cropped to the window's shape (slice), so what is visible depends on the
// aspect ratio. For each band of aspect ratios this places, for the narrowest shape in it, the
// left corner with Pixel in the gap between the app's sidebar (about the left 17%) and the
// conversation's text (from about 30%), and the right corner with the cat tree near the right
// edge. Phones have no sidebar, so the left corner moves to the edge.

// How far each corner reaches, in art pixels from its origin.
const LEFT_REACH = 36 // the far ball of yarn, left of Pixel's tail
const RIGHT_REACH = 30 // the tree's base, right of its middle

function place(a: number, tallestA: number): string {
  const v = Math.min(W, 1000 * a) // visible width
  const left = (W - v) / 2
  const right = left + v
  const shown = Math.min(H, W / tallestA) // visible height at the band's widest shape
  const bottom = (H - shown) / 2 + shown
  const s = Math.min(1, Math.max(0.55, 0.45 + (v / W) * 0.55))
  const feet = Math.min(FEET, bottom - 22)
  const leftX = a >= 0.8 ? left + v * 0.2 : left + v * 0.04 + LEFT_REACH * PX * s
  const rightX = right - v * 0.05 - RIGHT_REACH * PX * s
  const f = (n: number): string => n.toFixed(0)

  return [
    `.left { transform: translate(${f(leftX)}px, ${f(feet)}px) scale(${s.toFixed(2)}); }`,
    `.right { transform: translate(${f(rightX)}px, ${f(feet)}px) scale(${s.toFixed(2)}); }`,
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
${DEFS}
<g class="room">
${ROOM}
${middle()}
${fairyLights()}
<g class="left">${leftCorner()}</g>
<g class="right">${rightCorner()}</g>
</g>
</svg>`

export const pixelCats: Look = {
  id: 'pixel-cats',
  label: 'Pixel cats',
  description: 'Pixel and Charlie at home on a cozy night: yarn, a bookshelf and a cat tree',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'pixel-cats', glass: { blur: 0, tint: '#17131c', opacity: 0.3 } },
  },
  scenes: {
    'pixel-cats': {
      source: SCENE,
      alt: 'Pixel art of two fluffy cats at home at night: a gray and white tuxedo sitting by a ball of yarn in front of a bookshelf lit by a lamp, and an orange and white one loafing on top of a cat tree by a moonlit window, under a string of fairy lights',
    },
  },
}
