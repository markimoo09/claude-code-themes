import type { Look } from './types'

import { makeColors } from '../make-colors.js'

// A cinematic space-opera scene, original designs throughout: a hooded dark warrior holding
// an upright red energy blade in the lower left, a fleet of wedge-shaped warships with blue
// engines in the upper right, and the red-rimmed curve of a dark planet in the lower right.
// The blade's red is the theme's accent.
const { theme, problems } = makeColors({
  label: 'Dark fleet',
  only: 'dark',
  roles: {
    accent: '#e5383b',
    danger: '#ff6a3d',
    success: '#3fbf8f',
    warning: '#f0b429',
    pro: '#8aa4ff',
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

  for (let i = 0; i < 300; i++) {
    const m = rand() ** 6 // few bright stars, many faint ones
    const fill = rand() < 0.2 ? '#bcd4ff' : '#eef2f8'
    const twinkle = m > 0.35 && i % 3 === 0 ? ` class="tw tw${i % 2}"` : ''

    out += `<circle${twinkle} cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H).toFixed(0)}" r="${(0.5 + m * 1.6).toFixed(2)}" fill="${fill}" opacity="${(0.3 + m * 0.7).toFixed(2)}"/>`
  }

  return out
}

// ---------- the fleet ----------

// One wedge warship seen from slightly above, bow at (0, 0) pointing left, 360 long and 140
// wide at the stern: a lit upper facet and a shaded lower one meeting on a centre ridge, panel
// lines, a stepped command block near the stern, running lights and three blue engines.
const SHIP = `
<polygon points="0,0 360,-85 360,0" fill="#2f394b"/>
<polygon points="0,0 360,0 360,55" fill="#151b27"/>
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
<ellipse cx="40" cy="0" rx="210" ry="26" fill="url(#floor-glow)" class="flicker"/>
<ellipse cx="72" cy="-390" rx="130" ry="230" fill="url(#blade-halo)" class="flicker"/>
<path d="M0,-420 C28,-420 46,-398 50,-370 C54,-350 50,-336 46,-326 C70,-322 92,-308 100,-284 C108,-240 112,-180 118,-120 C124,-60 136,-20 150,0 L-150,0 C-136,-20 -124,-60 -118,-120 C-112,-180 -108,-240 -100,-284 C-92,-308 -70,-322 -46,-326 C-50,-336 -54,-350 -50,-370 C-46,-398 -28,-420 0,-420 Z" fill="#090a0f"/>
<path d="M-30,-300 C-10,-250 -18,-150 -40,-10 L-60,-10 C-40,-140 -34,-240 -46,-296 Z" fill="#0f1118"/>
<path d="M30,-300 C14,-250 22,-150 46,-10 L62,-10 C42,-140 40,-240 48,-296 Z" fill="#0f1118"/>
<ellipse cx="0" cy="-368" rx="23" ry="31" fill="#000000"/>
<path d="M-10,-372 L-4,-369 M10,-372 L4,-369" stroke="#ff4040" stroke-width="2" opacity="0.55"/>
<path d="M46,-326 C70,-322 92,-308 100,-284 C108,-240 112,-180 118,-120 C124,-60 136,-20 150,0" fill="none" stroke="#d63434" stroke-width="3" opacity="0.6" class="flicker"/>
<path d="M50,-370 C54,-350 50,-336 46,-326" fill="none" stroke="#d63434" stroke-width="2.5" opacity="0.5" class="flicker"/>
<path d="M-46,-326 C-70,-322 -92,-308 -100,-284 C-108,-240 -112,-180 -118,-120" fill="none" stroke="#4a6a9a" stroke-width="2" opacity="0.35"/>
<path d="M92,-300 C112,-270 102,-232 80,-208 L60,-220 C76,-244 80,-268 70,-292 Z" fill="#14161e"/>
<g class="flicker">
  <rect x="49" y="-540" width="46" height="304" rx="23" fill="#ff2626" opacity="0.1"/>
  <rect x="60" y="-540" width="24" height="304" rx="12" fill="#ff2a2a" opacity="0.24"/>
  <rect x="-90" y="-471" width="324" height="2" fill="url(#flare)"/>
</g>
<rect x="66.5" y="-540" width="11" height="302" rx="5.5" fill="#ff3434"/>
<rect x="69.75" y="-538" width="4.5" height="298" rx="2.25" fill="#fff1f1"/>
<rect x="64" y="-240" width="16" height="44" rx="2" fill="#9aa1ad"/>
${[-232, -222, -212].map(y => `<rect x="64" y="${y}" width="16" height="3" fill="#3a3f48"/>`).join('')}
<rect x="62" y="-242" width="20" height="5" rx="1.5" fill="#c7ccd5"/>
<path d="M72,-214 C66,-210 60,-206 58,-200 L76,-196 Z" fill="#14161e"/>`

// ---------- the planet ----------

// A dark planet seen from orbit, its rim lit red-orange, drawn from the group's origin at the
// bottom-right corner of the view.
const PLANET = `
<circle cx="-200" cy="560" r="712" fill="none" stroke="url(#rim)" stroke-width="26" opacity="0.14"/>
<circle cx="-200" cy="560" r="705" fill="none" stroke="url(#rim)" stroke-width="10" opacity="0.32"/>
<circle cx="-200" cy="560" r="700" fill="url(#planet)"/>
<circle cx="-200" cy="560" r="700" fill="none" stroke="url(#rim)" stroke-width="2.5"/>`

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
  const feet = Math.min(862, bottom - 22)
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
    <stop offset="0" stop-color="#05070c"/>
    <stop offset="0.6" stop-color="#070910"/>
    <stop offset="1" stop-color="#0b0a10"/>
  </linearGradient>
  <radialGradient id="neb-red" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#6a1018" stop-opacity="0.32"/>
    <stop offset="1" stop-color="#6a1018" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="neb-blue" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#1c2c5c" stop-opacity="0.45"/>
    <stop offset="1" stop-color="#1c2c5c" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="engine-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#7fc8ff" stop-opacity="0.6"/>
    <stop offset="1" stop-color="#7fc8ff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="blade-halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff2a2a" stop-opacity="0.26"/>
    <stop offset="0.5" stop-color="#c41414" stop-opacity="0.08"/>
    <stop offset="1" stop-color="#c41414" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="floor-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff3030" stop-opacity="0.4"/>
    <stop offset="1" stop-color="#ff3030" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="flare" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff4a4a" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#ff6a6a" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#ff4a4a" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="planet" cx="35%" cy="30%" r="75%">
    <stop offset="0" stop-color="#1a1c26"/>
    <stop offset="0.5" stop-color="#0d0f16"/>
    <stop offset="1" stop-color="#06070b"/>
  </radialGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffb07a"/>
    <stop offset="0.3" stop-color="#ff5a36" stop-opacity="0.85"/>
    <stop offset="0.55" stop-color="#ff5a36" stop-opacity="0"/>
  </linearGradient>
</defs>
<style>
${LAYOUT}

  /* Every animation steps: the scene redraws only when a frame changes. */
  .flicker { animation: flicker 2.4s steps(1) infinite; }
  @keyframes flicker { 0% { opacity: 1; } 30% { opacity: 0.82; } 45% { opacity: 1; } 80% { opacity: 0.9; } }
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
  description: 'A dark warrior with a red blade, a wedge fleet and a red-rimmed planet',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'dark-fleet', glass: { blur: 0, tint: '#05070a', opacity: 0.35 } },
  },
  scenes: {
    'dark-fleet': {
      source: SCENE,
      alt: 'A hooded warrior holding an upright red energy blade, a fleet of wedge-shaped warships with blue engines, and the red-rimmed edge of a dark planet among stars',
    },
  },
}
