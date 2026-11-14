import type { Look } from './types'

import { makeColors } from '../make-colors.js'

// Colors from the cosmos portfolio (portfolio-reinvent app/globals.css):
// void #020304, paper #f3eee7, signal #9de9e3, ember #ff7a42, solar #ffd08a,
// flare #e6be82, ice #9ccbf2, muted #91999d. The grays carry a faint cyan tint.
const { theme, problems } = makeColors({
  label: 'Cosmos',
  only: 'dark',
  roles: {
    accent: '#9de9e3',
    danger: '#ef5a4c',
    success: '#8fd694',
    warning: '#ffd08a',
    pro: '#c3a6ff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#05080a',
        'surface-1': '#0a0f12',
        'surface-2': '#0f1518',
        'surface-3': '#141b1f',
        'text-primary': '#f3eee7',
        'text-secondary': '#c8c6c0',
        'text-muted': '#949ca0',
      },
    },
  },
})

// ---------- backdrop scene ----------

const W = 1600
const H = 1000
// Star tints from the portfolio's ambient field: mostly bone, some ice, some flare.
const TINTS = ['#eee9e0', '#eee9e0', '#eee9e0', '#9ccbf2', '#e6be82']

// Seeded, so every load draws the same sky.
function starLayer(count: number, seed: number, rMin: number, rSpan: number): string {
  let s = seed
  const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647
  let out = ''

  for (let i = 0; i < count; i++) {
    const m = rand() ** 5 // few bright stars, many faint ones
    const x = (rand() * W).toFixed(0)
    const y = (rand() * H).toFixed(0)
    const fill = TINTS[Math.floor(rand() * TINTS.length)]
    const r = (rMin + m * rSpan).toFixed(2)
    const o = (0.4 + m * 0.6).toFixed(2)
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${o}"/>`
  }

  return out
}

const FAR = starLayer(340, 11, 0.7, 1.2)
const NEAR = starLayer(110, 29, 1.0, 2.2)

const f1 = (n: number): string => n.toFixed(1)

// A two-armed spiral galaxy, drawn face-on around (0, 0); CSS tilts it into an ellipse.
// Arms follow a logarithmic spiral, r = 20 e^(0.21 theta), warm near the core and blue outside,
// with a few pink star-forming knots.
function galaxy(): { arms: string; dots: string } {
  let s = 7
  const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647
  let arms = ''
  let dots = ''

  for (const k of [0, Math.PI]) {
    let d = ''

    for (let i = 0; i <= 48; i++) {
      const th = (i / 48) * 3 * Math.PI
      const r = 20 * Math.exp(0.21 * th)
      d += `${i === 0 ? 'M' : 'L'}${f1(Math.cos(th + k) * r)} ${f1(Math.sin(th + k) * r)}`
    }
    arms += `<path d="${d}" class="arm"/>`

    for (let i = 0; i < 150; i++) {
      const t = i / 150
      const th = t * 3 * Math.PI
      const r = 20 * Math.exp(0.21 * th)
      const spread = 5 + r * 0.16
      const x = Math.cos(th + k) * r + (rand() - 0.5) * spread
      const y = Math.sin(th + k) * r + (rand() - 0.5) * spread
      const pick = rand()
      const fill = t < 0.22 ? '#ffe2b0' : pick < 0.1 ? '#ff8fb1' : pick < 0.55 ? '#bcd8ff' : '#eef4ff'
      const rr = 0.6 + rand() ** 3 * 2.4
      const o = (0.35 + rand() * 0.6) * (1 - t * 0.35)
      dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr.toFixed(2)}" fill="${fill}" opacity="${o.toFixed(2)}"/>`
    }
  }

  for (let i = 0; i < 110; i++) {
    const a = rand() * Math.PI * 2
    const r = rand() ** 0.7 * 170
    dots += `<circle cx="${f1(Math.cos(a) * r)}" cy="${f1(Math.sin(a) * r)}" r="${(0.5 + rand() * 0.8).toFixed(2)}" fill="#dfe9ff" opacity="${(0.15 + rand() * 0.35).toFixed(2)}"/>`
  }

  return { arms, dots }
}

const GALAXY = galaxy()

// Lone bright stars with light spikes, placed away from the middle of the screen.
const GLINTS = (
  [
    [1060, 150, 0.85, 0],
    [1480, 330, 0.55, 4.5],
    [190, 700, 0.6, 3],
  ] as const
)
  .map(
    ([x, y, sc, delay]) =>
      `<g transform="translate(${x} ${y}) scale(${sc})"><use href="#glint" class="twinkle" style="animation-delay:-${delay}s"/></g>`,
  )
  .join('')

// The black hole is drawn around (0, 0) and placed by CSS, so a phone can move it.
// The left side of the disk is brighter: it moves toward the viewer (Doppler beaming).
const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#071a24"/>
    <stop offset="0.5" stop-color="#090b1c"/>
    <stop offset="1" stop-color="#1a0b12"/>
  </linearGradient>
  <radialGradient id="neb-cyan" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#9de9e3" stop-opacity="0.34"/>
    <stop offset="0.5" stop-color="#2f8f9a" stop-opacity="0.14"/>
    <stop offset="1" stop-color="#2f8f9a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="neb-violet" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#8b6cff" stop-opacity="0.3"/>
    <stop offset="0.55" stop-color="#4b2f9e" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#4b2f9e" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="neb-ember" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ff7a42" stop-opacity="0.3"/>
    <stop offset="0.5" stop-color="#b8321f" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#b8321f" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="neb-ice" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#9ccbf2" stop-opacity="0.24"/>
    <stop offset="1" stop-color="#9ccbf2" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ffb070" stop-opacity="0.6"/>
    <stop offset="0.4" stop-color="#ff7a42" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#ff7a42" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="disk" x1="-220" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffd08a" stop-opacity="0"/>
    <stop offset="0.12" stop-color="#fff1d6"/>
    <stop offset="0.38" stop-color="#ffd08a"/>
    <stop offset="0.7" stop-color="#ff7a42"/>
    <stop offset="1" stop-color="#ff7a42" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="lens" x1="-90" y1="0" x2="90" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff1d6"/>
    <stop offset="0.5" stop-color="#ffd08a"/>
    <stop offset="1" stop-color="#ff7a42"/>
  </linearGradient>
  <radialGradient id="core" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff8ec"/>
    <stop offset="0.25" stop-color="#ffe2b0" stop-opacity="0.85"/>
    <stop offset="0.6" stop-color="#ffd08a" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#ffd08a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="disc" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#bcd8ff" stop-opacity="0.22"/>
    <stop offset="0.6" stop-color="#8b6cff" stop-opacity="0.08"/>
    <stop offset="1" stop-color="#8b6cff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#ffffff"/>
    <stop offset="0.2" stop-color="#e6f2ff" stop-opacity="0.8"/>
    <stop offset="1" stop-color="#9ccbf2" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="spike-h" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#cfe6ff" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#ffffff"/>
    <stop offset="1" stop-color="#cfe6ff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="spike-v" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cfe6ff" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#ffffff"/>
    <stop offset="1" stop-color="#cfe6ff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="meteor" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="0.85" stop-color="#e6f2ff" stop-opacity="0.7"/>
    <stop offset="1" stop-color="#ffffff"/>
  </linearGradient>
  <g id="glint">
    <circle r="16" fill="url(#star-glow)" opacity="0.55"/>
    <rect x="-46" y="-0.7" width="92" height="1.4" fill="url(#spike-h)"/>
    <rect x="-0.7" y="-46" width="1.4" height="92" fill="url(#spike-v)"/>
    <rect x="-18" y="-0.5" width="36" height="1" fill="url(#spike-h)" transform="rotate(45)" opacity="0.6"/>
    <rect x="-18" y="-0.5" width="36" height="1" fill="url(#spike-h)" transform="rotate(-45)" opacity="0.6"/>
    <circle r="2.2" fill="#ffffff"/>
  </g>
  <g id="far">${FAR}</g>
  <g id="near">${NEAR}</g>
</defs>
<style>
  .drift-far { animation: drift 720s steps(1440) infinite; }
  .drift-near { animation: drift 360s steps(720) infinite; }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(-${W}px); } }

  /* Upper left, rolled 14 degrees like the portfolio hero (uRoll -0.24 rad).
     The slice crops the sides on narrow boxes, so the hole steps in and shrinks. */
  .hole { transform: translate(390px, 300px) rotate(-14deg) scale(1.25); }
  @media (max-aspect-ratio: 8/5) { .hole { transform: translate(520px, 300px) rotate(-14deg) scale(1.1); } }
  @media (max-aspect-ratio: 6/5) { .hole { transform: translate(660px, 280px) rotate(-14deg) scale(0.95); } }
  @media (max-aspect-ratio: 4/5) { .hole { transform: translate(720px, 250px) rotate(-14deg) scale(0.75); } }
  @media (max-aspect-ratio: 11/20) { .hole { transform: translate(760px, 230px) rotate(-14deg) scale(0.65); } }

  /* Galaxy: lower right, a diagonal counterweight to the black hole; tilted to an ellipse,
     turning once every six minutes. */
  .galaxy { transform: translate(1270px, 680px) rotate(-28deg) scale(1, 0.42); }
  .galaxy-turn { animation: turn 360s steps(720) infinite; }
  @keyframes turn { to { transform: rotate(-360deg); } }
  .arm { fill: none; stroke: #bcd8ff; stroke-linecap: round; }
  .arm-wide { stroke-width: 34; opacity: 0.06; }
  .arm-mid { stroke-width: 14; opacity: 0.09; }
  .arm-thin { stroke-width: 4; opacity: 0.12; }

  .twinkle { animation: twinkle 9s steps(18) infinite; }
  @keyframes twinkle { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

  /* One shooting star: a rare, quick streak across the upper sky. */
  .meteor { opacity: 0; animation: meteor 27s linear infinite; animation-delay: -12s; }
  @keyframes meteor {
    0% { transform: translateX(0); opacity: 0; animation-timing-function: steps(10); }
    1% { opacity: 1; animation-timing-function: steps(20); }
    5% { transform: translateX(620px); opacity: 0; animation-timing-function: step-end; }
    100% { transform: translateX(620px); opacity: 0; }
  }

  @media (max-aspect-ratio: 8/5) { .galaxy { transform: translate(1180px, 680px) rotate(-28deg) scale(0.92, 0.39); } }
  @media (max-aspect-ratio: 6/5) { .galaxy { transform: translate(1000px, 650px) rotate(-28deg) scale(0.78, 0.33); } }
  @media (max-aspect-ratio: 4/5) { .galaxy { transform: translate(890px, 600px) rotate(-28deg) scale(0.6, 0.25); } }
  @media (max-aspect-ratio: 11/20) { .galaxy { transform: translate(860px, 580px) rotate(-28deg) scale(0.52, 0.22); } }

  .nebula { animation: glow 40s steps(20) infinite; }
  @keyframes glow { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }

  .breathe { animation: breathe 14s steps(28) infinite; }
  @keyframes breathe { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }

  @media (prefers-reduced-motion: reduce) {
    .drift-far, .drift-near, .breathe, .nebula, .galaxy-turn, .twinkle { animation: none; }
    .meteor { display: none; }
  }
</style>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g class="nebula">
  <ellipse cx="1280" cy="280" rx="700" ry="420" fill="url(#neb-cyan)" transform="rotate(18 1280 280)"/>
  <ellipse cx="560" cy="760" rx="760" ry="360" fill="url(#neb-violet)" transform="rotate(12 560 760)"/>
  <ellipse cx="420" cy="300" rx="620" ry="460" fill="url(#neb-ember)"/>
  <ellipse cx="1450" cy="820" rx="480" ry="300" fill="url(#neb-ice)"/>
</g>

<g class="drift-far"><use href="#far"/><use href="#far" x="${W}"/></g>
<g class="drift-near"><use href="#near"/><use href="#near" x="${W}"/></g>

<!-- Shooting star -->
<g transform="translate(820 40) rotate(26)"><rect class="meteor" x="-160" y="-0.8" width="160" height="1.6" fill="url(#meteor)"/></g>

<!-- Spiral galaxy -->
<g class="galaxy">
  <g class="galaxy-turn">
    <ellipse rx="230" ry="230" fill="url(#disc)"/>
    <g class="arm-wide">${GALAXY.arms}</g>
    <g class="arm-mid">${GALAXY.arms}</g>
    <g class="arm-thin">${GALAXY.arms}</g>
    ${GALAXY.dots}
    <circle r="60" fill="url(#core)"/>
  </g>
</g>

${GLINTS}

<!-- Dawn rim along the foot, the portfolio's closing earthrise, kept faint under the message box. -->
<ellipse cx="800" cy="${H + 1180}" rx="1700" ry="1240" fill="#030305"/>
<ellipse cx="800" cy="${H + 1180}" rx="1700" ry="1240" fill="none" stroke="#e6be82" stroke-opacity="0.35" stroke-width="1.2"/>
<ellipse cx="800" cy="${H + 1180}" rx="1700" ry="1240" fill="none" stroke="#e6be82" stroke-opacity="0.07" stroke-width="16"/>
<ellipse cx="800" cy="${H + 1180}" rx="1700" ry="1240" fill="none" stroke="#e6be82" stroke-opacity="0.12" stroke-width="6"/>

<g class="hole">
  <g class="breathe">
    <circle r="340" fill="url(#halo)"/>
    <circle r="86" fill="none" stroke="url(#lens)" stroke-width="32" opacity="0.1"/>
    <circle r="86" fill="none" stroke="url(#lens)" stroke-width="20" opacity="0.16"/>
    <circle r="86" fill="none" stroke="url(#lens)" stroke-width="10" opacity="0.22"/>
  </g>
  <!-- far side of the disk, bent over and under the shadow -->
  <path d="M -80 0 A 80 80 0 0 1 80 0" fill="none" stroke="url(#lens)" stroke-width="9" opacity="0.9"/>
  <path d="M -76 0 A 76 76 0 0 0 76 0" fill="none" stroke="url(#lens)" stroke-width="3" opacity="0.7"/>
  <!-- back half of the thin disk -->
  <path d="M -220 0 A 220 26 0 0 1 220 0" fill="none" stroke="url(#disk)" stroke-width="7" opacity="0.7"/>
  <!-- shadow and photon ring -->
  <circle r="66" fill="#000"/>
  <circle r="68" fill="none" stroke="#fff1d6" stroke-width="1.3" opacity="0.9"/>
  <!-- front half of the disk -->
  <path d="M -220 0 A 220 26 0 0 0 220 0" fill="none" stroke="url(#disk)" stroke-width="24" opacity="0.18"/>
  <path d="M -220 0 A 220 26 0 0 0 220 0" fill="none" stroke="url(#disk)" stroke-width="13" opacity="0.35"/>
  <path d="M -220 0 A 220 26 0 0 0 220 0" fill="none" stroke="url(#disk)" stroke-width="6"/>
</g>
</svg>`

// Deep space from the cosmos portfolio: a tilted black hole in the upper left and a turning
// spiral galaxy in the lower right, over cyan, violet and ember nebulae.
export const cosmos: Look = {
  id: 'cosmos',
  label: 'Cosmos',
  description: 'Black hole, spiral galaxy and nebulae from the portfolio',
  problems,
  theme: {
    colors: theme,
    backdrop: { scene: 'cosmos', glass: { blur: 3, tint: '#05080a', opacity: 0.3 } },
  },
  scenes: {
    cosmos: {
      source: SCENE,
      alt: 'A tilted black hole and a turning spiral galaxy among drifting stars',
    },
  },
}
