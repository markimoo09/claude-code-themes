// Turns every look in hooks/looks into a T3 Code theme file in t3/themes/<id>.json.
// T3 themes are colors only: the moving backdrop scenes stay in the Claude apps.
//
//   node t3/build.mjs
//
// Reads the same LOOKS list /custom-theme uses, so a new look only needs to be added there.
import { registerHooks } from 'node:module'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The looks import each other without extensions; let Node find the .ts files.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.endsWith('.ts')) {
      try {
        return next(`${specifier}.ts`, context)
      } catch {
        // Not a .ts file: resolve it as written.
      }
    }
    return next(specifier, context)
  },
})

const here = dirname(fileURLToPath(import.meta.url))
const { LOOKS, DEFAULT_LOOK } = await import(pathToFileURL(join(here, '../hooks/looks/index.ts')).href)

// ---------- color helpers ----------

const hex = h => {
  const s = h.replace('#', '')
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16))
}
const toHex = rgb => `#${rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`
/** `a` moved `t` of the way toward `b`. */
const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)]
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

// ---------- one look → one T3 theme ----------

function toT3(look) {
  const inputs = look.theme.colors.inputs
  const appearance = inputs.dark ? 'dark' : 'light'
  const p = inputs[appearance]
  const dark = appearance === 'dark'
  /** The first of these palette keys that the look defines. */
  const k = (...keys) => {
    for (const key of keys) if (p[key]) return p[key]
    throw new Error(`${look.id}: none of ${keys.join(', ')} in its palette`)
  }
  const g = n => k(`gray-${n}`)

  // The gray ramp runs light → dark in both modes; surfaces sit at the dark end in dark mode.
  const canvas = dark ? g(900) : g(10)
  const surface = dark ? g(850) : mix(g(10), g(50), 0.35)
  const raised = dark ? g(830) : g(0)
  const overlay = dark ? g(840) : g(0)
  const sidebar = dark ? g(870) : mix(g(10), g(50), 0.6)
  const text = dark ? g(50) : g(900)
  const text2 = dark ? g(200) : mix(g(900), g(400), 0.5)
  const muted = g(400)
  const border = dark ? g(750) : g(100)
  const borderStrong = dark ? g(650) : g(200)
  const input = dark ? g(700) : g(150)
  const secondary = dark ? g(800) : mix(g(10), g(100), 0.45)
  const hover = dark ? g(750) : g(100)

  const accent = k('role-accent-fill')
  const accentOn = k('role-accent-on')
  const accentHover = k('role-accent-fill-hover', 'role-accent-400')
  const accentText = dark ? k('role-accent-250', 'role-accent-100') : k('role-accent-600')
  const accentSurface = dark ? k('role-accent-850', 'role-accent-800') : k('role-accent-100')
  const focus = dark ? k('role-accent-250', 'role-accent-300') : k('role-accent-400', 'role-accent-fill')

  const colors = {
    canvas,
    chrome: canvas,
    toolbar: canvas,
    toolbarForeground: text,
    toolbarBorder: border,
    toolbarControl: secondary,
    toolbarControlForeground: text2,
    toolbarControlHover: hover,
    surface,
    surfaceRaised: raised,
    surfaceOverlay: overlay,
    text,
    textMuted: muted,
    border,
    input,
    focus,
    accent,
    accentForeground: accentOn,
    secondary,
    secondaryForeground: text2,
    muted: dark ? g(750) : g(50),
    mutedForeground: text2,
    placeholder: muted,
    secondaryLabel: muted,
    iconMuted: muted,
    error: k('role-danger-fill'),
    errorForeground: dark ? k('role-danger-250', 'role-danger-100') : k('role-danger-600'),
    errorSurface: dark ? k('role-danger-800', 'role-danger-700') : k('role-danger-100'),
    warning: k('role-warning-fill'),
    warningForeground: dark ? k('role-warning-200', 'role-warning-100') : k('role-warning-600'),
    warningSurface: dark ? k('role-warning-800', 'role-warning-700') : k('role-warning-100'),
    update: accent,
    updateForeground: accentText,
    updateSurface: accentSurface,
    accentSurface,
    accentSurfaceForeground: text,
    messageSurface: dark ? mix(g(850), accentSurface, 0.5) : mix(canvas, k('role-accent-100'), 0.6),
    messageForeground: text,
    messageAction: accent,
    messageActionForeground: accentOn,
    messageActionHover: accentHover,
    codeBackground: dark ? g(840) : mix(g(10), g(50), 0.5),
    codeForeground: dark ? k('role-accent-100', 'role-accent-50') : accentText,
    searchMatchBackground: dark ? k('role-warning-700', 'role-warning-600') : k('role-warning-100'),
    searchMatchForeground: text,
    searchMatchActiveBackground: k('role-warning-fill'),
    searchMatchActiveForeground: k('role-warning-on'),
    sidebar,
    sidebarForeground: text,
    sidebarMutedForeground: muted,
    sidebarControlSurface: raised,
    sidebarRowHover: mix(sidebar, text, 0.05),
    sidebarRowActive: mix(sidebar, text, 0.09),
    sidebarRowSelected: mix(sidebar, accentSurface, 0.7),
    sidebarBorder: border,
    terminalBackground: canvas,
    terminalForeground: text,
    terminalCursor: focus,
    terminalSelection: dark ? k('role-accent-700', 'role-accent-600') : k('role-accent-100'),
    terminalScrollbar: borderStrong,
    terminalScrollbarHover: muted,
  }

  return { version: 1, id: look.id, name: look.label, appearance, colors }
}

const out = join(here, 'themes')
mkdirSync(out, { recursive: true })
// Drop files for looks that no longer exist, so the switcher's list matches LOOKS.
for (const file of readdirSync(out)) if (file.endsWith('.json')) rmSync(join(out, file))

const order = []
for (const look of LOOKS) {
  writeFileSync(join(out, `${look.id}.json`), `${JSON.stringify(toT3(look), null, 2)}\n`)
  order.push({ id: look.id, label: look.label, description: look.description })
}
// The switcher reads this for list order, numbering and the default.
writeFileSync(join(out, 'index.json'), `${JSON.stringify({ default: DEFAULT_LOOK, looks: order }, null, 2)}\n`)
console.log(`Wrote ${order.length} T3 themes to ${out}: ${order.map(l => l.id).join(', ')}`)
