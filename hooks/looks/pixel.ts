// A small toolkit for the pixel-art looks (Neon Tokyo, Marina Bay): a canvas that writes
// compact SVG, lit windows, banded skies, and the per-aspect layout and veil that keep the
// landmarks at the edges and the words readable in the middle.

// ---------- a pixel canvas ----------
//
// Every sprite is drawn into an Art, cell by cell, in art pixels (PX scene units each). It is
// written out as one <path> per color: runs of a color on a row, merged down the rows into
// rectangles where they line up. A fill can also be a pattern, such as a tower's lattice.

export const PX = 5
export const W = 1600
export const H = 1000
export const GW = W / PX // 320 art pixels across
export const GH = H / PX // 200 down

const OFFSET = 4096
const ROW = 16384

type Run = { x: number; y: number; w: number; h: number; fill: string }

export class Art {
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
export const px = (inner: string, cls?: string): string =>
  `<g${cls === undefined ? '' : ` class="${cls}"`} transform="scale(${PX})">${inner}</g>`

export const hash = (x: number, y: number, s = 0): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453

  return n - Math.floor(n)
}

export function seeded(seed: number): () => number {
  let s = seed

  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// A soft round glow from a gradient in <defs>, in art pixels.
export const glow = (cx: number, cy: number, rx: number, ry: number, id: string, opacity = 1, cls?: string): string =>
  `<ellipse${cls === undefined ? '' : ` class="${cls}"`} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})" opacity="${opacity}"/>`

// The radial gradient a glow names.
export const grad = (id: string, color: string, opacity: number): string =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

// A 4 by 4 lattice of crossing diagonals, one art pixel per cell.
export const lattice = (id: string, bg: string, lit: string): string =>
  `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${bg}"/><path fill="${lit}" d="M0 0h1v1h-1zM1 1h1v1h-1zM2 2h1v1h-1zM3 3h1v1h-1zM3 0h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM0 3h1v1h-1z"/></pattern>`

// ---------- lit windows ----------
//
// Most stay lit; a few, in two sets, switch off and on at their own pace (classes win-a and
// win-b, which the scene animates).

export type Windows = { still: Art; a: Art; b: Art }
export const windowSet = (): Windows => ({ still: new Art(), a: new Art(), b: new Art() })
export const WINDOW_COLORS: readonly string[] = ['#ffd27a', '#ffd27a', '#ffd27a', '#fff0c2', '#86d8ff', '#86d8ff', '#ff8fd2']

export function windowsIn(
  win: Windows,
  rand: () => number,
  x: number,
  top: number,
  w: number,
  bottom: number,
  step: [number, number],
  size: [number, number],
  lit: number,
  colors: readonly string[] = WINDOW_COLORS,
): void {
  for (let wy = top + 2; wy + size[1] <= bottom; wy += step[1]) {
    for (let wx = x + 2; wx + size[0] <= x + w - 1; wx += step[0]) {
      const r = rand()

      if (r < lit) {
        const layer = r < lit * 0.1 ? win.a : r < lit * 0.2 ? win.b : win.still

        layer.rect(wx, wy, size[0], size[1], colors[Math.floor(rand() * colors.length)] ?? '#ffd27a')
      }
    }
  }
}

export const windowsSvg = (win: Windows): string => px(win.still.svg()) + px(win.a.svg(), 'win-a') + px(win.b.svg(), 'win-b')

// ---------- sky ----------

// Bands of color down the sky from [row, color] stops, each meeting the next over a few rows
// of line dithering.
export function skyBands(stops: readonly [number, string][]): string {
  const a = new Art()

  for (let y = 0; y < GH; y++) {
    let i = 0

    while (i + 1 < stops.length && (stops[i + 1]?.[0] ?? GH) <= y) {
      i++
    }
    const next = stops[i + 1]
    const d = next === undefined ? 0 : next[0] - y

    a.rect(0, y, GW, 1, next !== undefined && (d === 1 || d === 3) ? next[1] : (stops[i]?.[1] ?? '#000000'))
  }

  return px(a.svg())
}

// ---------- layout ----------
//
// The scene is cropped to the window's shape (slice), so each look places its landmarks per
// band of aspect ratios, for the narrowest shape in the band. A spot is [x, y, scale] in scene
// units; a group of class at-<name> is moved there by the band's CSS.

export type Spot = [number, number, number]
type Spots<K extends string> = Record<K, Spot>

const f = (n: number): string => n.toFixed(0)
const at = ([x, y, s]: Spot): string => `translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})`
const css = ([x, y, s]: Spot): string => `transform: translate(${f(x)}px, ${f(y)}px) scale(${s.toFixed(2)});`

// The visible part of the scene at aspect ratio a: its left and right edges, its width.
export function visible(a: number): { v: number; left: number; right: number } {
  const v = Math.min(W, H * a)
  const left = (W - v) / 2

  return { v, left, right: left + v }
}

// A dark veil behind the conversation, so the words stay readable over the busy middle:
// clear at the edges where the landmarks stand, darkest over the column of text (about 32%
// to 80% across, past the app's sidebar). It is stretched to the visible width; on phones,
// where words run edge to edge, to three times it, so only its even middle shows, a little lighter.
function scrimRule(a: number): string {
  const { v, left } = visible(a)
  const [x, sx] = a < 0.8 ? [left - v, (3 * v) / W] : [left, v / W]

  return `.at-scrim { transform: translate(${f(x)}px, 0px) scale(${sx.toFixed(3)}, 1); opacity: ${a < 0.8 ? 0.75 : 1}; }`
}

// The veil's gradient, for <defs>, and the veil itself, drawn last.
export const scrimGradient = (color: string): string =>
  `<linearGradient id="g-scrim" x1="0" x2="1">${(
    [[0, 0], [0.19, 0], [0.33, 0.66], [0.78, 0.66], [0.88, 0], [1, 0]] as const
  )
    .map(([o, a]) => `<stop offset="${o}" stop-color="${color}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`
export const SCRIM = `<g class="at-scrim"><rect width="${W}" height="${H}" fill="url(#g-scrim)"/></g>`

// Widest first; each later band is narrower and wins where it applies.
const BANDS = [2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]

// The CSS that places every spot (and the veil) per band, and `placed`, which wraps a sprite
// in its group, with its 16:10 place also written on the element for a renderer that reads no
// CSS (the preview image).
export function layout<K extends string>(spots: (a: number, tallestA: number) => Spots<K>): {
  css: string
  placed: (k: K, inner: string) => string
} {
  const rules = (p: Spots<K>): string => (Object.keys(p) as K[]).map(k => `.at-${k} { ${css(p[k])} }`).join(' ')
  const home = spots(1.6, 1.6)

  return {
    css: [
      `  ${rules(spots(BANDS[0] ?? 2.2, 2.6))} ${scrimRule(BANDS[0] ?? 2.2)}`,
      ...BANDS.map((high, i) => {
        const low = BANDS[i + 1] ?? 0.3

        return `  @media (max-aspect-ratio: ${Math.round(high * 100)}/100) { ${rules(spots(low, high))} ${scrimRule(low)} }`
      }),
    ].join('\n'),
    placed: (k, inner) => `<g class="at-${k}" transform="${at(home[k])}">${inner}</g>`,
  }
}
