// /custom-theme for T3 Code: lists the looks as T3 themes and switches between them.
//
//   node t3/look.mjs                 numbered list, ● marks the theme in use
//   node t3/look.mjs list            the same
//   node t3/look.mjs <name|number>   switch to a look
//   node t3/look.mjs next            the next look in the list, then off, then round again
//   node t3/look.mjs off             back to T3's own theme (T3 Chat), in OFF_APPEARANCE mode
//
// After a switch it prints a last line `t3-appearance: light|dark`. The t3 CLI cannot set T3's
// light/dark mode, so the /t3-theme skill passes that line to T3's t3_theme_set tool.
//
// The pick is T3's environment theme (`t3 theme set`), so every connected T3 window switches
// to it and new windows start with it. Each switch rebuilds the theme files first, so color
// edits in hooks/looks show up on the next switch.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OFF = 'off'
// What `off` sets: T3's own default theme. `t3 theme clear` would leave windows as they are.
const T3_OWN_THEME = 't3-chat'
// The mode `off` returns T3 to: 'light', 'dark' or 'system'.
const OFF_APPEARANCE = 'dark'

const here = dirname(fileURLToPath(import.meta.url))
const themesDir = join(here, 'themes')

function t3Bin() {
  const local = join(homedir(), '.t3', 'bin', 't3')
  return existsSync(local) ? local : 't3'
}

function build() {
  execFileSync(process.execPath, [join(here, 'build.mjs')], { stdio: 'ignore' })
}

function index() {
  return JSON.parse(readFileSync(join(themesDir, 'index.json'), 'utf8'))
}

/** The environment theme T3 has set, or undefined. */
function environmentTheme() {
  const base = process.env.T3CODE_HOME?.trim() || join(homedir(), '.t3')
  try {
    const settings = JSON.parse(readFileSync(join(base, 'userdata', 'settings.json'), 'utf8'))
    return typeof settings.defaultTheme === 'string' && settings.defaultTheme !== '' ? settings.defaultTheme : undefined
  } catch {
    return undefined
  }
}

function current(looks, fallback) {
  const set = environmentTheme()
  if (set === undefined) return fallback
  return looks.some(l => l.id === set) ? set : OFF
}

function list(looks, now) {
  const rows = [...looks.map(l => [l.id, l.description]), [OFF, 'T3’s own theme']].map(([id, what], i) => {
    return `${id === now ? '●' : '○'} ${i + 1}. ${id}: ${what}`
  })
  return [
    'Themes (● is in use in every T3 window, and new windows start with it):',
    ...rows,
    '',
    'Switch with /t3-theme <name or number>, or /t3-theme next.',
  ].join('\n')
}

function apply(looks, id) {
  const t3 = t3Bin()
  try {
    if (id === OFF) {
      execFileSync(t3, ['theme', 'set', T3_OWN_THEME], { stdio: 'pipe' })
      // A look made only for light or dark switches T3's mode with it; put the mode back too.
      return `Theme off: T3’s own theme is back.\nt3-appearance: ${OFF_APPEARANCE}`
    }
    const look = looks.find(l => l.id === id)
    execFileSync(t3, ['theme', 'set', '--id', id, join(themesDir, `${id}.json`)], { stdio: 'pipe' })
    return `Theme: ${look.label}${look.backdrop ? '' : ' (colors only for now: its scene is too big for a T3 theme)'}.\nt3-appearance: ${look.appearance}`
  } catch (error) {
    const said = error.stderr?.toString().trim() || error.message
    return `${id} was not applied: ${said}`
  }
}

build()
const { looks, default: fallback } = index()
const asked = process.argv.slice(2).join(' ').trim().toLowerCase()
const now = current(looks, fallback)

if (asked === '' || asked === 'list') {
  console.log(list(looks, now))
} else {
  const ids = [...looks.map(l => l.id), OFF]
  const byNumber = /^\d+$/.test(asked) ? ids[Number(asked) - 1] : undefined
  const target = asked === 'next' ? (ids[(ids.indexOf(now) + 1) % ids.length] ?? fallback) : (byNumber ?? asked)

  if (target !== OFF && !looks.some(l => l.id === target)) {
    console.log(`No theme named "${asked}".\n\n${list(looks, now)}`)
  } else {
    console.log(apply(looks, target))
  }
}
