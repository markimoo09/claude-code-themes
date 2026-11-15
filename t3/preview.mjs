// Size check and stills of a look's scene: the original, its T3 version, and the T3 version laid
// out the way T3 shows it, behind a mock chat column under the frosted panel.
//
//   node t3/preview.mjs <id> [seconds]
//
// Writes to a temp folder it prints, after [seconds] of animation (default 2):
//   original.png, t3.png      the whole scene, 1600×1000
//   layout-full.png           a 1460×1000 chat area: a full-width window
//   layout-sidebar.png        a 1200×1000 chat area: the sidebar open
// Exits 1 when the T3 scene or its CSS is over budget.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CSS_LIMIT, SCENE_BUDGET, backdropCss, loadLooks, minifySvg, sceneOf, svgToCssUrl, t3SceneOf } from './lib.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [id, seconds = '2'] = process.argv.slice(2)
const { LOOKS } = await loadLooks()
const look = LOOKS.find(l => l.id === id)
if (!look) {
  console.error(`No look "${id}". Looks: ${LOOKS.map(l => l.id).join(', ')}`)
  process.exit(2)
}

const original = minifySvg(sceneOf(look))
const t3 = await t3SceneOf(look)
const dark = Boolean(look.theme.colors.inputs.dark)
const canvas = dark ? look.theme.colors.inputs.dark['gray-900'] : look.theme.colors.inputs.light['gray-10']
const css = backdropCss(look, t3.svg, canvas)
const out = join(tmpdir(), 't3-looks-preview', id)
mkdirSync(out, { recursive: true })

function shoot(name, html, [w, h]) {
  const file = join(out, `${name}.html`)
  writeFileSync(file, html)
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`,
    `--virtual-time-budget=${Number(seconds) * 1000}`, `--screenshot=${join(out, `${name}.png`)}`, `file://${file}`,
  ], { stdio: 'ignore' })
}

const whole = svg => `<!doctype html><style>body{margin:0;height:100vh;background:${svgToCssUrl(svg)} center/cover no-repeat}</style><body></body>`
shoot('original', whole(original), [1600, 1000])
shoot('t3', whole(t3.svg), [1600, 1000])

// A stand-in for T3's chat area: a 46rem column of text lines and a composer card.
const ink = dark ? '#f3eee7' : '#2b2118'
const lines = Array.from({ length: 26 }, (_, i) => `<p style="width:${[96, 88, 100, 72, 93, 60][i % 6]}%">${'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor. '.repeat(2)}</p>`).join('')
const layout = `<!doctype html><style>
:root{--chat-content-max-width:46rem}
body{margin:0;font:15px/1.6 -apple-system,system-ui,sans-serif;color:${ink}}
[data-workspace-area="conversation"]{position:relative;display:flex;flex-direction:column;height:100vh;overflow:hidden}
.messages-timeline-scroll{flex:1;overflow:hidden;padding:24px 3rem}
.lane{max-width:var(--chat-content-max-width);margin:0 auto}
.lane p{margin:0 0 10px;white-space:nowrap;overflow:hidden}
.composer{max-width:var(--chat-content-max-width);margin:0 auto 20px;width:100%;height:110px;border-radius:16px;background:${canvas};border:1px solid rgba(128,128,128,.3)}
${css}
</style><div data-workspace-area="conversation"><div class="messages-timeline-scroll"><div class="lane">${lines}</div></div><div class="composer"></div></div>`
shoot('layout-full', layout, [1460, 1000])
shoot('layout-sidebar', layout, [1200, 1000])

const over = t3.length > SCENE_BUDGET || css.length > CSS_LIMIT
console.log(`${id}: original ${svgToCssUrl(original).length}, T3 scene ${t3.length} of ${SCENE_BUDGET}, CSS ${css.length} of ${CSS_LIMIT}${t3.adapted ? '' : ' (no t3/scenes adapter yet)'}${over ? '  OVER BUDGET' : ''}`)
console.log(`Stills in ${out}: original.png, t3.png, layout-full.png, layout-sidebar.png`)
process.exit(over ? 1 : 0)
