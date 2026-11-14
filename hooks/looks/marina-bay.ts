import type { Look } from './types'

import { makeColors } from '../make-colors.js'
import { Art, GH, GW, H, PX, SCRIM, type Spot, W, glow, grad, hash, lattice, layout, px, scrimGradient, seeded, skyBands, visible, windowSet, windowsIn, windowsSvg } from './pixel'

// Downtown Singapore at night, drawn as pixel art, looking across Marina Bay. On the left the
// Downtown Core's towers, the Singapore Flyer behind them, the Merlion spouting into the bay and
// the Esplanade's spiky domes; on the right Marina Bay Sands, its three towers under the SkyPark,
// sweeping a laser show into the sky, the Supertrees glowing and changing color beyond it, the
// ArtScience Museum's lotus on the water and a bumboat. Fireworks now and then, the bay below
// full of warm reflections under a magenta-to-coral sky. The accent is a tropical teal that
// stands out from the warm scene; red keeps meaning danger.
const { theme, problems } = makeColors({
  label: 'Marina Bay',
  only: 'dark',
  roles: {
    accent: '#2ed3c6',
    danger: '#ff5d5d',
    success: '#7bd46a',
    warning: '#ffc145',
    pro: '#c38bff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d0a19',
        'surface-1': '#120e21',
        'surface-2': '#171229',
        'surface-3': '#1b162f',
        'text-primary': '#f4f0fa',
        'text-secondary': '#cdc5dd',
        'text-muted': '#a9a0bf',
      },
    },
  },
})

// The bay's edge, in art pixels: the skyline stands on it, the water runs below it.
const SHORE = 152

const CITY_WINDOWS = ['#ffd27a', '#ffd27a', '#ffe9b8', '#ffb86b', '#ff9ad0', '#9fe2ff']

// ---------- sky ----------

// Indigo overhead, warming through magenta to a coral glow over the city lights.
const SKY: readonly [number, string][] = [
  [0, '#0a0820'],
  [22, '#110b2e'],
  [44, '#1a0f3c'],
  [66, '#251348'],
  [86, '#331752'],
  [104, '#451b5a'],
  [118, '#5c205e'],
  [130, '#78285f'],
  [140, '#9a345c'],
  [148, '#c04a55'],
]

function stars(): string {
  const rand = seeded(5)
  const still = new Art()
  const twA = new Art()
  const twB = new Art()

  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rand() * GW)
    const y = Math.floor(rand() ** 1.6 * 96)
    const m = rand()
    const layer = m > 0.7 && i % 3 === 0 ? (i % 2 === 0 ? twA : twB) : still

    layer.set(x, y, m > 0.85 ? '#fff1e0' : m > 0.5 ? '#d9b8e6' : '#7d6aa8')
  }

  return px(still.svg()) + px(twA.svg(), 'tw-a') + px(twB.svg(), 'tw-b')
}

// Low clouds lit from below by the city.
function clouds(): string {
  const a = new Art()
  const streak = (x: number, y: number, len: number): void => {
    a.rect(x + 4, y, len - 9, 1, '#2c1a4f')
    a.rect(x, y + 1, len, 1, '#3d1f58')
    a.rect(x + 3, y + 2, len - 6, 1, '#a0466a')
  }

  streak(18, 102, 46)
  streak(150, 96, 60)
  streak(236, 108, 40)
  streak(96, 114, 34)

  return px(`<g class="drift">${a.svg()}</g>`)
}

// ---------- fireworks (centred on their group's origin) ----------

// A burst in three frames: the shell popping, the ring of sparks, the sparks falling and fading.
function firework(seed: number, colors: [string, string, string]): string {
  const rand = seeded(seed)
  const [hot, mid, dim] = colors
  const frames = [new Art(), new Art(), new Art()]
  const pop = frames[0] ?? new Art()

  pop.rect(-1, -1, 3, 3, mid)
  pop.set(0, 0, '#ffffff')
  for (let i = 1; i < 6; i++) {
    pop.set(0, i + 1, i < 3 ? mid : dim)
  }
  const rays = 18

  for (let k = 0; k < rays; k++) {
    const angle = (k / rays) * Math.PI * 2 + rand() * 0.2
    const [cx, cy] = [Math.cos(angle), Math.sin(angle)]

    for (let r = 2; r <= 10; r++) {
      frames[1]?.set(Math.round(cx * r), Math.round(cy * r), r > 7 ? hot : mid)
    }
    for (let r = 11; r <= 16; r++) {
      frames[2]?.set(Math.round(cx * r), Math.round(cy * r + (r - 10) * 0.9), r === 16 ? hot : dim)
    }
  }
  frames[1]?.set(0, 0, '#ffffff')

  return frames.map((f, i) => px(f.svg(), `fw fw-f${i}`)).join('')
}

// ---------- the distant city, right across ----------

function farSkyline(): string {
  const rand = seeded(13)
  const body = new Art()
  const win = windowSet()
  let x = -2

  while (x < GW) {
    const w = 6 + Math.floor(rand() * 12)
    const top = 122 + Math.floor(rand() * 20)

    body.rect(x, top, w, SHORE - top, '#24163f')
    body.rect(x, top, w, 1, '#33204f')
    for (let wy = top + 2; wy < SHORE - 1; wy += 2) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        const r = rand()

        if (r < 0.1) {
          win.still.set(wx, wy, '#4a3570')
        } else if (r < 0.13) {
          ;(r < 0.12 ? win.still : win.a).set(wx, wy, '#c49860')
        }
      }
    }
    x += w
  }

  return px(body.svg()) + windowsSvg(win)
}

// ---------- the Downtown Core (from the window's left edge, foot on the shore) ----------

type Crown = 'flat' | 'spire' | 'stepped' | 'slant' | 'pyramid'

function downtown(): string {
  const rand = seeded(29)
  const body = new Art()
  const trim = new Art()
  const beacons = new Art()
  const win = windowSet()
  const towers: [number, number, number, string, Crown][] = [
    [-2, 16, 98, '#1c1236', 'flat'],
    [13, 13, 114, '#22163f', 'stepped'],
    [25, 14, 86, '#1a1133', 'slant'],
    [38, 10, 106, '#1f1439', 'spire'],
    [47, 15, 72, '#1d1237', 'pyramid'],
    [61, 12, 34, '#22163f', 'flat'],
    [72, 14, 26, '#1a1133', 'flat'],
    [85, 12, 20, '#1c1236', 'flat'],
  ]

  for (const [x, w, h, fill, crown] of towers) {
    const top = -h

    body.rect(x, top, w, h + 1, fill)
    body.rect(x, top + 1, 1, h, '#3d2a66')
    body.rect(x + w - 1, top + 1, 1, h, '#100a22')
    windowsIn(win, rand, x, top + 2, w, -1, [2, 3], [1, 1], 0.38, CITY_WINDOWS)
    switch (crown) {
      case 'flat':
        body.rect(x, top, w, 1, '#3d2a66')
        break
      case 'spire':
        body.rect(x + Math.floor(w / 2), top - 12, 1, 12, '#4d3a78')
        beacons.set(x + Math.floor(w / 2), top - 13, '#ff4a4a')
        trim.rect(x, top, w, 1, '#ffb86b')
        break
      case 'stepped':
        body.rect(x + 2, top - 4, w - 4, 4, fill)
        body.rect(x + 4, top - 7, w - 8, 3, fill)
        trim.rect(x + 2, top - 4, w - 4, 1, '#ffe6a8')
        trim.rect(x + 4, top - 7, w - 8, 1, '#ffe6a8')
        beacons.set(x + Math.floor(w / 2), top - 8, '#ff4a4a')
        break
      case 'slant':
        for (let i = 0; i < w; i++) {
          body.rect(x + i, top - Math.floor(i / 2), 1, Math.floor(i / 2), fill)
          trim.set(x + i, top - Math.floor(i / 2), '#ff7ab8')
        }
        break
      case 'pyramid':
        for (let i = 0; i < Math.ceil(w / 2); i++) {
          body.rect(x + i, top - i, w - i * 2, 1, fill)
          trim.set(x + i, top - i, '#ffe0a8')
          trim.set(x + w - 1 - i, top - i, '#ffe0a8')
        }
        break
    }
  }

  return px(body.svg()) + windowsSvg(win) + px(trim.svg()) + px(beacons.svg(), 'beacon')
}

// ---------- the Singapore Flyer (foot on the shore) ----------

function flyer(): string {
  const a = new Art()
  const capsules = [new Art(), new Art(), new Art()]
  const r = 22
  const cy = -30

  // A-frame legs, then the terminal at its foot.
  for (const dir of [-1, 1]) {
    for (let t = 0; t <= 1; t += 0.03) {
      a.set(Math.round(dir * t * 12), Math.round(cy + t * (-cy - 6)), '#4a2c6a')
    }
  }
  a.rect(-20, -6, 40, 6, '#1c1236')
  a.rect(-20, -6, 40, 1, '#3d2a66')
  for (let x = -18; x < 19; x += 3) {
    a.rect(x, -4, 2, 1, '#ffb86b')
  }
  // Spokes, rims and hub.
  for (let k = 0; k < 12; k++) {
    const angle = (k / 12) * Math.PI * 2

    for (let d = 2; d < r - 1; d++) {
      a.set(Math.round(Math.cos(angle) * d), Math.round(cy + Math.sin(angle) * d), '#4a2c6a')
    }
  }
  for (let y = -r - 1; y <= r + 1; y++) {
    for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y)

      if (Math.abs(d - r) < 0.6) {
        a.set(x, cy + y, '#e58fd6')
      } else if (Math.abs(d - (r - 2)) < 0.5) {
        a.set(x, cy + y, '#6a3a8a')
      }
    }
  }
  a.rect(-1, cy - 1, 3, 3, '#ffe0a8')
  // Capsules around the rim, lit in three sets that chase round.
  for (let k = 0; k < 28; k++) {
    const angle = (k / 28) * Math.PI * 2

    capsules[k % 3]?.rect(Math.round(Math.cos(angle) * (r + 1)), Math.round(cy + Math.sin(angle) * (r + 1)), 1, 1, '#fff1c9')
  }

  return px(glow(0, cy, r + 8, r + 8, 'g-violet', 0.45) + a.svg()) + capsules.map((c, i) => px(c.svg(), `cap cap${i}`)).join('')
}

// ---------- the Esplanade's two spiky domes (foot on the shore) ----------

function esplanade(): string {
  const a = new Art()

  for (const [cx, rx, ry] of [[-9, 8, 7], [7, 7, 6]] as const) {
    for (let y = -ry; y <= 0; y++) {
      const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2))

      for (let x = -hw; x <= hw; x++) {
        a.set(cx + x, y, Math.abs(x) === hw || y === -ry ? '#cdb98a' : 'url(#esp)')
      }
    }
  }
  a.rect(-19, 0, 36, 1, '#2e2050')

  return px(glow(-1, -3, 20, 8, 'g-gold', 0.35) + a.svg())
}

// ---------- Marina Bay Sands (centre tower's foot at its origin) ----------

const MBS_H = 66
const MBS_TOWERS = [-20, 0, 20]

function marinaBaySands(): string {
  const rand = seeded(37)
  const body = new Art()
  const floors = new Art()
  const park = new Art()

  // Three towers, each a pair of legs that splay toward the foot, with lit floors.
  for (const cx of MBS_TOWERS) {
    for (let t = 0; t < MBS_H; t++) {
      const y = t - MBS_H
      const flare = Math.round((t / MBS_H) ** 3 * 4)
      const x0 = cx - 6
      const x1 = cx + 6 + flare

      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1
        const seam = x === cx

        body.set(x, y, edge ? (x === x0 ? '#4d3a78' : '#1c1236') : seam ? '#160f2a' : '#2a1f4a')
        if (!edge && !seam && t > 2 && t % 2 === 0) {
          const r = rand()

          if (r < 0.62) {
            floors.set(x, y, r < 0.5 ? '#ffe3a8' : '#ffc98a')
          }
        }
      }
    }
  }
  // The SkyPark across the roofs, its cantilever reaching north (left), trees and the pool's edge.
  const parkTop = -MBS_H - 4

  for (let x = -48; x <= 30; x++) {
    const taper = x < -42 || x > 28 ? 1 : 0

    park.set(x, parkTop + taper, '#ffe9c8')
    park.set(x, parkTop + 1, '#4a3a6a')
    park.set(x, parkTop + 2, '#4a3a6a')
    park.set(x, parkTop + 3, x % 2 === 0 ? '#ffe3a0' : '#2c2148')
  }
  park.rect(-48, parkTop - 1, 26, 1, '#6fe6ff')
  for (let x = -16; x <= 26; x += 3) {
    park.set(x, parkTop - 1, '#2f6e4f')
    park.set(x + 1, parkTop - 2, '#3f8a5f')
  }

  return px(glow(0, -40, 54, 50, 'g-gold', 0.55) + body.svg() + floors.svg() + park.svg())
}

// The laser show from the SkyPark: green and pink beams in three sets lit in turn, so they
// seem to sweep.
function lasers(): string {
  const top = -MBS_H - 5
  const sets: number[][] = [
    [-26, -8, 18, 40],
    [-16, 4, 28, 50],
    [-34, -14, 10, 32],
  ]
  const emitters = [-30, 0, 22, 8]

  return sets
    .map((angles, s) => {
      const beams = angles
        .map((deg, i) => {
          const x0 = emitters[i] ?? 0
          const rad = (deg * Math.PI) / 180
          const x1 = x0 + Math.sin(rad) * 220
          const y1 = top - Math.cos(rad) * 220
          const color = i % 2 === 0 ? '#5dff9e' : '#ff6fd8'

          return `<line x1="${x0}" y1="${top}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${color}" stroke-width="2.4" opacity="0.12"/><line x1="${x0}" y1="${top}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${color}" stroke-width="0.7" opacity="0.6"/>`
        })
        .join('')

      return px(beams, `laser laser${s}`)
    })
    .join('')
}

// ---------- the Supertrees (from the window's right edge, foot on the shore) ----------

function supertrees(): string {
  const trunks = new Art()
  const lightsA = new Art()
  const lightsB = new Art()
  const trees: [number, number, number][] = [
    [-36, 30, 8],
    [-23, 44, 11],
    [-10, 34, 9],
    [0, 24, 7],
  ]

  for (const [cx, h, crown] of trees) {
    for (let t = 0; t < h; t++) {
      const y = -t
      const hw = t < h * 0.15 ? 3 : t < h * 0.45 ? 2 : 1

      for (let x = -hw; x <= hw; x++) {
        trunks.set(cx + x, y, (x + t) % 2 === 0 ? '#3a2350' : '#24183a')
        if ((x + t) % 4 === 0 || Math.abs(x) === hw) {
          lightsA.set(cx + x, y, '#d65bd8')
          lightsB.set(cx + x, y, '#47e6c8')
        }
      }
    }
    // The canopy: an upturned umbrella of ribs, lit along its rim.
    const rows = 6

    for (let r = 0; r < rows; r++) {
      const y = -h - r
      const hw = 1 + Math.round(((r + 1) / rows) ** 0.8 * crown)

      for (let x = -hw; x <= hw; x++) {
        trunks.set(cx + x, y, '#2a1d40')
        if (r === rows - 1 || Math.abs(x) === hw || (x + r) % 3 === 0) {
          lightsA.set(cx + x, y, r === rows - 1 ? '#ff9be8' : '#b14fd0')
          lightsB.set(cx + x, y, r === rows - 1 ? '#9dffe8' : '#2fbfa6')
        }
      }
    }
  }

  return px(glow(-18, -40, 26, 26, 'g-violet', 0.5) + trunks.svg()) + px(lightsA.svg(), 'st-a') + px(lightsB.svg(), 'st-b')
}

// ---------- the ArtScience Museum's lotus (foot on the shore) ----------

function artScience(): string {
  const a = new Art()

  a.rect(-18, -2, 36, 2, '#2e2050')
  for (const k of [-4, 4, -3, 3, -2, 2, -1, 1, 0]) {
    const angle = k * 0.3
    const len = 17 - Math.abs(k) * 1.6
    const [bx, by] = [k * 2.4, -2]
    const petal = new Art()

    for (let d = 0; d <= len; d += 0.25) {
      const cx = bx + Math.sin(angle) * d
      const cy = by - Math.cos(angle) * d
      const half = 1.2 + 1.3 * Math.sin((Math.PI * d) / (len + 1))

      for (let ox = -3; ox <= 3; ox++) {
        if (Math.abs(ox) <= half) {
          const x = Math.round(cx + ox * Math.cos(angle))
          const y = Math.round(cy + ox * Math.sin(angle))

          petal.set(x, y, d > len - 1.5 ? '#ffffff' : ox > 0.4 ? '#aeb8cc' : '#eef2f9')
        }
      }
    }
    // Outline each petal so the ones in front stand out from those behind.
    for (let y = -24; y <= 0; y++) {
      for (let x = -24; x <= 24; x++) {
        if (petal.has(x, y)) {
          const edge = !petal.has(x - 1, y) || !petal.has(x + 1, y) || !petal.has(x, y - 1)

          a.set(x, y, edge ? '#7a6493' : undefined)
          if (!edge) {
            a.set(x, y, '#eef2f9')
          }
        }
      }
    }
    // Repaint the petal's own shading over its inside.
    for (let d = 0; d <= len; d += 0.25) {
      const cx = bx + Math.sin(angle) * d
      const cy = by - Math.cos(angle) * d
      const half = 1.2 + 1.3 * Math.sin((Math.PI * d) / (len + 1)) - 1

      for (let ox = -2; ox <= 2; ox++) {
        if (Math.abs(ox) <= half) {
          a.set(Math.round(cx + ox * Math.cos(angle)), Math.round(cy + ox * Math.sin(angle)), d > len - 2.5 ? '#ffffff' : ox > 0 ? '#b9c3d6' : '#eef2f9')
        }
      }
    }
  }

  return px(glow(0, -8, 22, 12, 'g-pink', 0.4) + a.svg())
}

// ---------- the bay ----------

function water(): string {
  const a = new Art()

  a.rect(0, SHORE, GW, GH - SHORE, '#120b26')
  a.rect(0, SHORE + 16, GW, GH - SHORE - 16, '#0f0a21')
  a.rect(0, SHORE + 32, GW, GH - SHORE - 32, '#0c081b')
  for (let y = SHORE + 3; y < GH; y += 3) {
    for (let x = Math.floor(hash(y, 1) * 9); x < GW; x += 9 + Math.floor(hash(x, y) * 6)) {
      if (hash(x, y, 3) < 0.55) {
        a.rect(x, y, 2 + Math.floor(hash(y, x) * 4), 1, '#1d1338')
      }
    }
  }
  // The embankment, and the promenade's string of lamps along it.
  a.rect(0, SHORE - 1, GW, 2, '#2e2050')
  for (let x = 2; x < GW; x += 6) {
    a.set(x, SHORE - 2, '#ffd98a')
  }

  return px(a.svg())
}

// Lit things smeared down the water below them, in two sets that shimmer in turn.
function reflection(spots: [number, number, string, number][]): string {
  const a = new Art()
  const b = new Art()

  for (const [cx, hw0, fill, rows] of spots) {
    for (let i = 0; i < rows; i++) {
      const hw = Math.max(1, Math.round(hw0 - i * (hw0 / rows) * 0.6))
      const jitter = Math.round((hash(i, cx) - 0.5) * 4)

      if (hash(cx, i, 4) > 0.2) {
        ;(i % 2 === 0 ? a : b).rect(cx - hw + jitter, 2 + i * 2, hw * 2, 1, fill)
      }
    }
  }

  return px(`<g opacity="0.3">${a.svg()}</g>`, 'sh-a') + px(`<g opacity="0.3">${b.svg()}</g>`, 'sh-b')
}

// ---------- the Merlion (pedestal's foot at its origin, facing right) ----------

// M mane, S its grooves and the body's shade, W the face, D eye and open mouth, L scales,
// p and P the pedestal.
const MERLION = [
  '..........MMMM..............',
  '........MMMMMMMM............',
  '.......SMMSMMMMMM...........',
  '......SMMSMMSMMMMM..........',
  '.....SMMSMMSMMWWWWW.........',
  '.....MMSMMSMMMWWDWWW........',
  '....SMMSMMSMMWWWWWWWWW......',
  '....MMSMMSMMMWWWWWWWWWD.....',
  '....SMMSMMSMMWWWWWDDDDD.....',
  '....MMSMMSMMMWWWWD..........',
  '.....SMMSMMSMWWWWWWW........',
  '.....MSMMSMMSMWWWWS.........',
  '......SMMSMMSMMMS...........',
  '.......SMSMSMSMS............',
  '..LL....WLWLWLWWS...........',
  '.LWWL...LWLWLWLWWS..........',
  '.SWWWL..WLWLWLWLWWS.........',
  '..SWWWL.LWLWLWLWLWWS........',
  '...SWWWLWLWLWLWLWLWS........',
  '....SWWWLWLWLWLWLWWS........',
  '.....SWWWWLWLWLWLWWS........',
  '......SWWWWWWWWWWWS.........',
  '.......pppppppppppp.........',
  '......pPPPPPPPPPPPPp........',
  '.....PPPPPPPPPPPPPPPP.......',
]
const MERLION_COLORS: Record<string, string> = {
  M: '#ece2ea',
  S: '#a796b6',
  W: '#fdf8f5',
  D: '#3a2448',
  L: '#d3c4d8',
  p: '#7a6896',
  P: '#3d3158',
}

function merlion(): string {
  const a = new Art()
  const jetA = new Art()
  const jetB = new Art()
  const top = -MERLION.length
  const left = -13

  MERLION.forEach((row, r) => {
    ;[...row].forEach((cell, c) => {
      const fill = MERLION_COLORS[cell]

      if (fill !== undefined) {
        a.set(left + c, top + r, fill)
      }
    })
  })
  a.rect(-14, 0, 30, 2, '#2e2050')
  // The water jet: an arc from the mouth down into the bay, its drops in two alternating sets.
  const [mx, my] = [left + 23, top + 8]

  for (let t = 0; t <= 1; t += 0.012) {
    const x = Math.round(mx + t * 34)
    // Rises a little out of the mouth, then falls to the water (y 0) at t = 1.
    const y = Math.round(my - 6 * t + (6 - my) * t * t)
    const step = Math.floor(t * 40)

    ;(step % 2 === 0 ? jetA : jetB).set(x, y, t < 0.4 ? '#e8f8ff' : '#9fd6f2')
    if (t < 0.3) {
      a.set(x, y + 1, '#cfefff')
    }
  }
  // The splash where it lands.
  for (const [dx, dy] of [[-2, -1], [0, -2], [2, -1], [-1, -1], [1, -1]] as const) {
    ;((dx + dy) % 2 === 0 ? jetA : jetB).set(mx + 34 + dx, dy, '#e8f8ff')
  }

  return px(glow(0, -12, 18, 16, 'g-white', 0.45) + a.svg()) + px(jetA.svg(), 'jet-a') + px(jetB.svg(), 'jet-b')
}

// ---------- a bumboat (centred on its waterline) ----------

function bumboat(): string {
  const a = new Art()

  for (let x = -11; x <= 11; x++) {
    const end = Math.abs(x) > 8 ? 1 : 0

    a.set(x, -1 + end, '#7a3d33')
    a.set(x, 0, Math.abs(x) > 10 ? '#5a2f2a' : '#5a2f2a')
  }
  a.rect(-7, -4, 14, 1, '#c94c3a')
  a.rect(-6, -3, 1, 2, '#3a2a2a')
  a.rect(5, -3, 1, 2, '#3a2a2a')
  for (let x = -5; x <= 4; x += 2) {
    a.set(x, -2, '#ffd27a')
  }
  for (let x = -7; x <= 6; x += 2) {
    a.set(x, -5, '#ffe6a8')
  }

  return px(`<g class="bob">${glow(0, -2, 12, 4, 'g-gold', 0.6)}${a.svg()}</g>`)
}

// ---------- layout ----------
//
// The towers of the Downtown Core stand at the left edge (under the app's sidebar on a desktop),
// the Flyer and the Merlion in the gap between the sidebar and the conversation, Marina Bay Sands,
// the Supertrees and the lotus past the conversation on the right. Phones have no sidebar, so
// all of it draws in and shrinks.

type Spots = Record<'downtown' | 'flyer' | 'merlion' | 'esplanade' | 'mbs' | 'gardens' | 'artscience' | 'boat' | 'fw1' | 'fw2' | 'fw3', Spot>

const SHORE_Y = SHORE * PX

function spots(a: number, tallestA: number): Spots {
  const { v, left, right } = visible(a)
  const shown = Math.min(H, W / tallestA)
  const top = (H - shown) / 2
  const bottom = top + shown
  const phone = a < 0.8
  // Phones are narrow, so the landmarks shrink further there to stand side by side.
  const s = phone ? 0.45 : Math.min(1, Math.max(0.6, 0.45 + (v / W) * 0.55))

  return {
    downtown: [left, SHORE_Y, s],
    flyer: [left + v * (phone ? 0.36 : 0.27), SHORE_Y, s],
    merlion: [left + v * (phone ? 0.18 : 0.215), SHORE_Y, s],
    // Off to the left on phones, where there is no room for it.
    esplanade: [phone ? left - 200 : left + v * 0.335, SHORE_Y, s],
    mbs: [right - v * (phone ? 0.27 : 0.145), SHORE_Y, s],
    gardens: [right, SHORE_Y, s],
    artscience: [right - v * (phone ? 0.58 : 0.285), SHORE_Y, s],
    boat: [right - v * 0.09, Math.min(SHORE_Y + 120, bottom - 50), s],
    fw1: [left + v * 0.12, top + 90 * s, s],
    fw2: [right - v * 0.06, top + 120 * s, s],
    fw3: [left + v * (phone ? 0.75 : 0.29), top + 100 * s, s],
  }
}

const { css: LAYOUT, placed } = layout(spots)

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<defs>
${lattice('esp', '#3e3747', '#a8976d')}
${grad('g-gold', '#ffc66b', 0.5)}${grad('g-violet', '#c35bff', 0.4)}
${grad('g-pink', '#ff9ad8', 0.35)}${grad('g-white', '#ffe9dc', 0.45)}
${scrimGradient('#0a0716')}
</defs>
<style>
${LAYOUT}

  /* Every animation steps, so the scene redraws only when a frame changes. */
  .tw-a, .tw-b { animation: tw 6s step-end infinite; }
  .tw-b { animation-delay: -3s; }
  @keyframes tw { 0% { opacity: 1; } 50% { opacity: 0.25; } }

  .beacon { animation: beacon 2.4s step-end infinite; }
  @keyframes beacon { 0% { opacity: 1; } 45% { opacity: 0.1; } }

  .win-a { animation: win 9s step-end infinite; }
  .win-b { animation: win 13s step-end infinite; animation-delay: -5s; }
  @keyframes win { 0% { opacity: 1; } 55% { opacity: 0; } 80% { opacity: 1; } }

  .drift { animation: drift 70s steps(12) infinite alternate; }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(12px); } }

  .cap { animation: cap 1.8s step-end infinite; }
  .cap1 { animation-delay: -1.2s; }
  .cap2 { animation-delay: -0.6s; }
  @keyframes cap { 0% { opacity: 1; } 33% { opacity: 0.25; } }

  /* The laser show: three sets of beams in turn for six seconds, then dark for six. Where
     nothing animates (a still frame), the first set and the fireworks' rings stay lit. */
  .laser { animation: laser 12s step-end infinite; }
  .laser1, .laser2 { opacity: 0; }
  .laser1 { animation-delay: -11s; }
  .laser2 { animation-delay: -10s; }
  @keyframes laser { 0% { opacity: 1; } 8.33% { opacity: 0; } 25% { opacity: 1; } 33.33% { opacity: 0; } }

  .st-a { animation: st 8s step-end infinite; }
  .st-b { opacity: 0; animation: st 8s step-end infinite; animation-delay: -4s; }
  @keyframes st { 0% { opacity: 1; } 50% { opacity: 0; } }

  .sh-a, .sh-b { animation: tw 1.6s step-end infinite; }
  .sh-b { animation-delay: -0.8s; }

  .jet-a, .jet-b { animation: jet 0.5s step-end infinite; }
  .jet-b { animation-delay: -0.25s; }
  @keyframes jet { 0% { opacity: 1; } 50% { opacity: 0; } }

  .bob { animation: bob 2.4s step-end infinite; }
  @keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(1px); } }

  /* Fireworks: each burst pops, rings out and falls in its own slot of a long cycle. */
  .fw { animation: 11s step-end infinite; }
  .fw-f0, .fw-f2 { opacity: 0; }
  .fw-f0 { animation-name: fw0; }
  .fw-f1 { animation-name: fw1; }
  .fw-f2 { animation-name: fw2; }
  @keyframes fw0 { 0% { opacity: 1; } 3% { opacity: 0; } }
  @keyframes fw1 { 0% { opacity: 0; } 3% { opacity: 1; } 7% { opacity: 0; } }
  @keyframes fw2 { 0% { opacity: 0; } 7% { opacity: 1; } 10% { opacity: 0.5; } 13% { opacity: 0; } }
  .at-fw2 .fw { animation-delay: -4s; }
  .at-fw3 .fw { animation-delay: -7.5s; }

  @media (prefers-reduced-motion: reduce) {
    .tw-a, .tw-b, .beacon, .win-a, .win-b, .drift, .cap, .laser, .st-a, .st-b, .sh-a, .sh-b,
    .jet-a, .jet-b, .bob, .fw { animation: none; }
  }
</style>
${skyBands(SKY)}
${stars()}
${clouds()}
${placed('fw1', firework(3, ['#ffd36b', '#ffb347', '#a8692a']))}
${placed('fw2', firework(9, ['#ff8fe0', '#ff5fc8', '#8a2f7a']))}
${placed('fw3', firework(17, ['#8ff0ff', '#4fd8ff', '#2a6f8a']))}
${farSkyline()}
${placed('flyer', flyer())}
${placed('downtown', downtown())}
${placed('esplanade', esplanade())}
${placed('gardens', supertrees())}
${placed('mbs', lasers() + marinaBaySands())}
${placed('artscience', artScience())}
${water()}
${placed('downtown', reflection([[6, 5, '#ffd27a', 18], [19, 5, '#ffe6a8', 20], [43, 4, '#ffb86b', 18], [54, 5, '#ffe9b8', 14]]))}
${placed('flyer', reflection([[0, 14, '#e58fd6', 10]]))}
${placed('mbs', reflection([[-20, 7, '#ffe3a8', 22], [0, 7, '#ffe3a8', 22], [20, 8, '#ffe3a8', 22], [-36, 6, '#6fe6ff', 6]]))}
${placed('gardens', reflection([[-22, 6, '#d65bd8', 14], [-10, 5, '#b14fd0', 12]]))}
${placed('artscience', reflection([[0, 12, '#e3e8f2', 10]]))}
${placed('merlion', merlion())}
${placed('boat', bumboat())}
${SCRIM}
</svg>`

export const marinaBay: Look = {
  id: 'marina-bay',
  label: 'Marina Bay',
  description: 'Pixel-art Singapore at night: Marina Bay Sands, the Merlion and the Supertrees',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'marina-bay', glass: { blur: 0, tint: '#0b0816', opacity: 0.3 } },
  },
  scenes: {
    'marina-bay': {
      source: SCENE,
      alt: 'Pixel art of downtown Singapore at night across Marina Bay: city towers and the Singapore Flyer on the left, the Merlion spouting water into the bay, Marina Bay Sands with a laser show and the glowing Supertrees on the right, the lotus-shaped ArtScience Museum, a bumboat and fireworks over the water',
    },
  },
}
