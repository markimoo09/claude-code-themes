import type { Look } from './types'

import { makeColors } from '../make-colors.js'

// A cinematic space-opera scene, original designs throughout: a hooded dark warrior holding
// an upright red energy blade in the lower left, a fleet of wedge-shaped warships with blue
// engines in the upper right, and the plated dome of a moon-sized battle station rising in the
// lower right.
// The accent is the engines' cool blue, so progress and usage indicators (which draw in the
// accent) never read as a red warning; red stays the blade's and means danger in the app.
const { theme, problems } = makeColors({
  label: 'Dark fleet',
  only: 'dark',
  roles: {
    accent: '#6ea8ff',
    danger: '#ef4444',
    success: '#3fbf8f',
    warning: '#f0b429',
    pro: '#b48cff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#07090d',
        'surface-1': '#0b0e14',
        'surface-2': '#10141b',
        'surface-3': '#141921',
        'text-primary': '#e9edf3',
        'text-secondary': '#b9c2ce',
        'text-muted': '#8f9aa8',
      },
    },
  },
})

const W = 1600
const H = 1000

// ---------- sky ----------

function stars(): string {
  let s = 19
  const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647
  let out = ''

  for (let i = 0; i < 380; i++) {
    const m = rand() ** 6 // few bright stars, many faint ones
    const fill = rand() < 0.2 ? '#bcd4ff' : '#eef2f8'
    const twinkle = m > 0.35 && i % 3 === 0 ? ` class="tw tw${i % 2}"` : ''

    out += `<circle${twinkle} cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H).toFixed(0)}" r="${(0.5 + m * 1.6).toFixed(2)}" fill="${fill}" opacity="${(0.45 + m * 0.55).toFixed(2)}"/>`
  }

  return out
}

// ---------- the fleet ----------

// One wedge warship seen from slightly above, bow at (0, 0) pointing left, 360 long and 140
// wide at the stern: a lit upper facet and a shaded lower one meeting on a centre ridge, panel
// lines, a stepped command block near the stern, running lights and three blue engines.
const SHIP = `
<polygon points="0,0 360,-85 360,0" fill="#3b475d"/>
<polygon points="0,0 360,0 360,55" fill="#1e2534"/>
${[80, 150, 220, 290].map(x => `<line x1="${x}" y1="${((-85 * x) / 360).toFixed(1)}" x2="${x}" y2="0" stroke="#262e3d" stroke-width="1.4"/>`).join('')}
${[100, 190, 280].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${((55 * x) / 360).toFixed(1)}" stroke="#10151e" stroke-width="1.2"/>`).join('')}
<polyline points="40,-5 360,-45" fill="none" stroke="#3a4558" stroke-width="1.2"/>
<polygon points="230,-8 352,-22 352,8 230,4" fill="#3a4559"/>
<polygon points="285,-18 348,-27 348,-40 296,-33" fill="#46526a"/>
<polygon points="318,-34 346,-38 346,-50 324,-47" fill="#56637c"/>
<polyline points="230,-8 352,-22" fill="none" stroke="#9aa7bb" stroke-width="1"/>
<polyline points="296,-33 348,-40" fill="none" stroke="#a9b5c7" stroke-width="1"/>
<polyline points="0,0 360,-85" fill="none" stroke="#8a97ac" stroke-width="1.5"/>
<polyline points="0,0 360,0" fill="none" stroke="#5f6c83" stroke-width="1.2"/>
<polyline points="0,0 360,55" fill="none" stroke="#2a3343" stroke-width="1"/>
${[[70, -14], [140, -30], [210, -46], [120, 14], [200, 25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#d6e6ff"/>`).join('')}
<circle cx="260" cy="-58" r="1.7" fill="#ff5a5a"/>
<g class="engines">
${[-50, -18, 18].map(y => `<circle cx="370" cy="${y}" r="30" fill="url(#engine-glow)"/>`).join('')}
${[-50, -18, 18].map(y => `<ellipse cx="362" cy="${y}" rx="5" ry="10" fill="#a8dcff"/>`).join('')}
</g>`

// Lead ship and escorts, placed from the group's origin at the top-right corner of the view.
const FLEET = `
<g class="fleet-drift">
  <g transform="translate(-112 120) scale(0.18) rotate(-10)">${SHIP}</g>
  <g transform="translate(-286 318) scale(0.3) rotate(-10)">${SHIP}</g>
  <g transform="translate(-206 236) scale(0.42) rotate(-10)">${SHIP}</g>
  <g transform="translate(-306 98) scale(0.76) rotate(-10)">${SHIP}</g>
</g>`

// ---------- the warrior ----------

// A hooded, cloaked figure, feet centred on (0, 0), about 420 tall, holding an upright blade
// at his right side. The blade's red lights the cloak's edge and the ground.
const WARRIOR = `
<ellipse cx="40" cy="0" rx="250" ry="34" fill="url(#floor-glow)" class="flicker"/>
<ellipse cx="72" cy="-390" rx="180" ry="290" fill="url(#blade-halo)" class="flicker"/>
<path d="M0,-420 C28,-420 46,-398 50,-370 C54,-350 50,-336 46,-326 C70,-322 92,-308 100,-284 C108,-240 112,-180 118,-120 C124,-60 136,-20 150,0 L-150,0 C-136,-20 -124,-60 -118,-120 C-112,-180 -108,-240 -100,-284 C-92,-308 -70,-322 -46,-326 C-50,-336 -54,-350 -50,-370 C-46,-398 -28,-420 0,-420 Z" fill="#11131a"/>
<path d="M-30,-300 C-10,-250 -18,-150 -40,-10 L-60,-10 C-40,-140 -34,-240 -46,-296 Z" fill="#181b24"/>
<path d="M30,-300 C14,-250 22,-150 46,-10 L62,-10 C42,-140 40,-240 48,-296 Z" fill="#181b24"/>
<ellipse cx="0" cy="-368" rx="23" ry="31" fill="#000000"/>
<path d="M-10,-372 L-4,-369 M10,-372 L4,-369" stroke="#ff4040" stroke-width="2" opacity="0.55"/>
<path d="M46,-326 C70,-322 92,-308 100,-284 C108,-240 112,-180 118,-120 C124,-60 136,-20 150,0" fill="none" stroke="#ff4040" stroke-width="3.5" opacity="0.8" class="flicker"/>
<path d="M50,-370 C54,-350 50,-336 46,-326" fill="none" stroke="#ff4040" stroke-width="3" opacity="0.7" class="flicker"/>
<path d="M-46,-326 C-70,-322 -92,-308 -100,-284 C-108,-240 -112,-180 -118,-120" fill="none" stroke="#4a6a9a" stroke-width="2" opacity="0.35"/>
<path d="M92,-300 C112,-270 102,-232 80,-208 L60,-220 C76,-244 80,-268 70,-292 Z" fill="#14161e"/>
<g class="flicker">
  <rect x="37" y="-548" width="70" height="320" rx="35" fill="#ff2626" opacity="0.14"/>
  <rect x="52" y="-544" width="40" height="312" rx="20" fill="#ff2a2a" opacity="0.28"/>
  <rect x="62" y="-542" width="20" height="306" rx="10" fill="#ff3838" opacity="0.55"/>
  <rect x="-110" y="-472" width="364" height="3" fill="url(#flare)"/>
</g>
<rect x="65.5" y="-540" width="13" height="302" rx="6.5" fill="#ff4a4a"/>
<rect x="69" y="-538" width="6" height="298" rx="3" fill="#fff6f6"/>
<rect x="64" y="-240" width="16" height="44" rx="2" fill="#9aa1ad"/>
${[-232, -222, -212].map(y => `<rect x="64" y="${y}" width="16" height="3" fill="#3a3f48"/>`).join('')}
<rect x="62" y="-242" width="20" height="5" rx="1.5" fill="#c7ccd5"/>
<path d="M72,-214 C66,-210 60,-206 58,-200 L76,-196 Z" fill="#14161e"/>`

// ---------- the battle station ----------

// A moon-sized armored station, its dome rising behind the foot of the view: plated with
// rings and seams, dotted with clusters of lit windows, a cool metallic rim and a faint red
// reflection from the blade. Drawn from the group's origin at the bottom-right corner.
const SC = [-200, 560] as const // centre
const SR = 700 // radius

function stationLights(): string {
  let s = 23
  const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647
  let out = ''

  // Clusters of windows along a few of the plating rings.
  for (let c = 0; c < 44; c++) {
    const ring = [668, 628, 582, 528, 468][Math.floor(rand() * 5)] ?? 600
    const a0 = (-160 + rand() * 140) * (Math.PI / 180)

    for (let k = 0; k < 4 + Math.floor(rand() * 7); k++) {
      const a = a0 + (k - 3) * 0.006 + (rand() - 0.5) * 0.004
      const r = ring + (rand() - 0.5) * 10
      const x = SC[0] + Math.cos(a) * r
      const y = SC[1] + Math.sin(a) * r
      const warm = rand() < 0.75
      const twinkle = c % 5 === 0 && k === 0 ? ' class="tw tw1"' : ''

      out += `<circle${twinkle} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + rand() * 0.9).toFixed(2)}" fill="${warm ? '#ffd9a0' : '#cfe3ff'}" opacity="${(0.55 + rand() * 0.4).toFixed(2)}"/>`
    }
  }

  return out
}

function plating(): string {
  let out = ''

  // Rings around the pole, seen from above it.
  for (const r of [690, 668, 648, 628, 606, 582, 556, 528, 498, 468, 436]) {
    out += `<circle cx="${SC[0]}" cy="${SC[1]}" r="${r}" fill="none" stroke="#1b1f29" stroke-width="${r % 2 === 0 ? 1.6 : 1.1}"/>`
  }
  // Seams running down from the rim toward the pole, staggered between rings.
  for (let deg = -172; deg <= -8; deg += 4) {
    const a = (deg * Math.PI) / 180
    const [r1, r2] = Math.round(deg / 4) % 2 === 0 ? [606, 700] : [528, 648]

    out += `<line x1="${(SC[0] + Math.cos(a) * r1).toFixed(1)}" y1="${(SC[1] + Math.sin(a) * r1).toFixed(1)}" x2="${(SC[0] + Math.cos(a) * r2).toFixed(1)}" y2="${(SC[1] + Math.sin(a) * r2).toFixed(1)}" stroke="#1b1f29" stroke-width="1.1"/>`
  }
  // A few lighter plates catching the light.
  for (const [deg, r] of [[-130, 640], [-112, 594], [-98, 650], [-140, 560], [-84, 600], [-121, 680]] as const) {
    const a = (deg * Math.PI) / 180

    out += `<path d="M${(SC[0] + Math.cos(a) * r).toFixed(1)} ${(SC[1] + Math.sin(a) * r).toFixed(1)} A ${r} ${r} 0 0 1 ${(SC[0] + Math.cos(a + 0.05) * r).toFixed(1)} ${(SC[1] + Math.sin(a + 0.05) * r).toFixed(1)}" fill="none" stroke="#454b5b" stroke-width="9" opacity="0.5"/>`
  }

  return out
}

const PLANET = `
<clipPath id="station-clip"><circle cx="${SC[0]}" cy="${SC[1]}" r="${SR}"/></clipPath>
<circle cx="${SC[0]}" cy="${SC[1]}" r="${SR}" fill="url(#station)"/>
<g clip-path="url(#station-clip)">${plating()}${stationLights()}</g>
<circle cx="${SC[0]}" cy="${SC[1]}" r="${SR + 6}" fill="none" stroke="#8fa6c8" stroke-width="10" opacity="0.12"/>
<circle cx="${SC[0]}" cy="${SC[1]}" r="${SR}" fill="none" stroke="url(#station-rim)" stroke-width="2.5"/>`

// ---------- layout ----------
//
// The scene is cropped to the window's shape (slice). For each band of aspect ratios this
// places, for the narrowest shape in it: the warrior in the gap between the app's sidebar
// (about the left 17%) and the conversation's text (from about 35%), the fleet in the
// top-right corner and the planet in the bottom-right corner. Phones have no sidebar.

const WARRIOR_SCALE = 0.75
const WARRIOR_HALF = 150 * WARRIOR_SCALE

function place(a: number, tallestA: number): string {
  const v = Math.min(W, 1000 * a)
  const left = (W - v) / 2
  const right = left + v
  const shown = Math.min(H, W / tallestA)
  const top = (H - shown) / 2
  const bottom = top + shown
  const s = Math.min(1, Math.max(0.55, 0.45 + (v / W) * 0.55))
  const feet = Math.min(898, bottom - 10)
  const warriorX = a >= 0.8 ? left + v * 0.19 + WARRIOR_HALF * s : left + v * 0.05 + WARRIOR_HALF * s
  const f = (n: number): string => n.toFixed(0)

  return [
    `.warrior { transform: translate(${f(warriorX)}px, ${f(feet)}px) scale(${(s * WARRIOR_SCALE).toFixed(3)}); }`,
    `.fleet { transform: translate(${f(right - v * 0.02)}px, ${f(top + 30)}px) scale(${s.toFixed(2)}); }`,
    `.planet { transform: translate(${f(right)}px, ${f(bottom)}px) scale(${s.toFixed(2)}); }`,
  ].join(' ')
}

const BANDS = [2.2, 2.0, 1.8, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
const LAYOUT = [
  `  ${place(BANDS[0] ?? 2.2, 2.6)}`,
  ...BANDS.map((high, i) => `  @media (max-aspect-ratio: ${Math.round(high * 100)}/100) { ${place(BANDS[i + 1] ?? 0.3, high)} }`),
].join('\n')

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#141c33"/>
    <stop offset="0.6" stop-color="#151d35"/>
    <stop offset="1" stop-color="#221828"/>
  </linearGradient>
  <radialGradient id="neb-red" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#a8202a" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#6a1018" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="neb-blue" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#33509a" stop-opacity="0.56"/>
    <stop offset="1" stop-color="#1c2c5c" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="engine-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#7fc8ff" stop-opacity="0.6"/>
    <stop offset="1" stop-color="#7fc8ff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="blade-halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff2a2a" stop-opacity="0.4"/>
    <stop offset="0.5" stop-color="#d41818" stop-opacity="0.14"/>
    <stop offset="1" stop-color="#c41414" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="floor-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff3030" stop-opacity="0.6"/>
    <stop offset="1" stop-color="#ff3030" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="flare" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff4a4a" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#ff7a7a" stop-opacity="0.8"/>
    <stop offset="1" stop-color="#ff4a4a" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="station" cx="38%" cy="22%" r="80%">
    <stop offset="0" stop-color="#373c4b"/>
    <stop offset="0.45" stop-color="#252a35"/>
    <stop offset="1" stop-color="#12151d"/>
  </radialGradient>
  <linearGradient id="station-rim" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff5a5a" stop-opacity="0.7"/>
    <stop offset="0.25" stop-color="#b9c8de"/>
    <stop offset="0.6" stop-color="#9fb4d6"/>
    <stop offset="1" stop-color="#6f86ab" stop-opacity="0.6"/>
  </linearGradient>
</defs>
<style>
${LAYOUT}

  /* Every animation steps: the scene redraws only when a frame changes. */
  .flicker { animation: flicker 2.4s steps(1) infinite; }
  @keyframes flicker { 0% { opacity: 1; } 30% { opacity: 0.88; } 45% { opacity: 1; } 80% { opacity: 0.94; } }
  .engines { animation: engines 3s steps(1) infinite; }
  @keyframes engines { 0% { opacity: 1; } 50% { opacity: 0.8; } }
  .fleet-drift { animation: drift 160s steps(160) infinite alternate; }
  @keyframes drift { from { transform: translate(0, 0); } to { transform: translate(-36px, 6px); } }
  .tw { animation: tw 5s steps(1) infinite; }
  .tw1 { animation-delay: -2.5s; }
  @keyframes tw { 0% { opacity: 1; } 50% { opacity: 0.45; } }

  @media (prefers-reduced-motion: reduce) {
    .flicker, .engines, .fleet-drift, .tw { animation: none; }
  }
</style>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<ellipse cx="360" cy="640" rx="560" ry="420" fill="url(#neb-red)"/>
<ellipse cx="1260" cy="260" rx="620" ry="380" fill="url(#neb-blue)"/>
${stars()}
<g class="planet">${PLANET}</g>
<g class="fleet">${FLEET}</g>
<g class="warrior">${WARRIOR}</g>
</svg>`

export const darkFleet: Look = {
  id: 'dark-fleet',
  label: 'Dark fleet',
  description: 'A dark warrior with a red blade, a wedge fleet and a battle station',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'dark-fleet', glass: { blur: 0, tint: '#05070a', opacity: 0.25 } },
  },
  scenes: {
    'dark-fleet': {
      source: SCENE,
      alt: 'A hooded warrior holding an upright red energy blade, a fleet of wedge-shaped warships with blue engines, and the plated dome of a moon-sized battle station among stars',
    },
  },
}
