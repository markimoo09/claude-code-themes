// Shared by the T3 build, the switcher and the T3 scene adapters in t3/scenes/.
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const T3_DIR = dirname(fileURLToPath(import.meta.url))

// T3 caps a theme's CSS at 50,000 characters. The backdrop rules around the image take about
// 1,500, so a scene's data: URL must stay at or under this.
export const CSS_LIMIT = 50_000
export const SCENE_BUDGET = 47_000

// ---------- the T3 layout ----------
//
// T3 draws the chat in a centered column, var(--chat-content-max-width) wide (46rem by default,
// 72rem on Wide). A frosted panel sits behind that column so text reads over any scene: fully
// frosted over the column plus PANEL_PAD, then fading out over PANEL_FADE on each side along an
// eased curve, so it has no visible edge. The scene is a center/cover background of the chat
// area, so in the scene's own 1600×1000 units the full frost covers about 800 ± 408 at a
// 1460×1000 chat area, fading out by about 800 ± 520. Keep a scene's main subjects in the side
// margins: x 200–392 and 1208–1400 stay in view with the sidebar open, and x 90–392 and
// 1208–1510 at a full-width window.
export const PANEL_PAD = '3rem'
// Per-look panel tint where the default is too heavy, by request.
export const PANEL_TINT = { 'neon-tokyo': 0.14, 'marina-bay': 0.14 }
// Per-look panel blur in px where the default 6 is too much, by request: the scene's own veil
// already dims the middle enough.
export const PANEL_BLUR = { 'marina-bay': 1.5 }
export const PANEL_FADE = '7rem'

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const rgba = (h, a) => `rgba(${hexRgb(h).join(',')},${a})`

/**
 * The theme CSS for a look's backdrop: the scene behind the chat under the look's glass tint, as
 * the Claude apps frost it, and a frosted, feathered panel behind the chat column.
 */
export function backdropCss(look, scene, canvas) {
  const glass = look.theme.backdrop?.glass
  const tint = glass?.tint && glass.opacity !== undefined ? rgba(glass.tint, glass.opacity) : undefined
  const layers = [tint && `linear-gradient(${tint},${tint})`, `${svgToCssUrl(scene)} center/cover no-repeat`].filter(Boolean)
  // A light frost, close to the Claude apps' glass: the scene's own tint already covers the
  // whole area, so the panel only adds a little more and a soft blur. Light scenes sit under
  // dark text, so theirs is slightly denser.
  const panel = rgba(canvas, PANEL_TINT[look.id] ?? (look.theme.colors.inputs.dark ? 0.28 : 0.36))
  // An eased ramp (roughly smoothstep) at each side instead of a straight one.
  const ramp = [[0, 0], [0.25, 0.1], [0.5, 0.4], [0.75, 0.78], [1, 1]]
  const at = f => `calc(${PANEL_FADE} * ${f})`
  const left = ramp.map(([f, a]) => `rgba(0,0,0,${a}) ${at(f)}`)
  const right = ramp.map(([f, a]) => `rgba(0,0,0,${a}) calc(100% - ${at(f)})`).reverse()
  const fade = `linear-gradient(90deg,${[...left, ...right].join(',')})`
  return [
    `[data-workspace-area="conversation"]{background:${layers.join(',')} !important;isolation:isolate}`,
    `[data-workspace-area="conversation"]::before{content:"";position:absolute;inset:0 auto 0 50%;width:min(100%,calc(var(--chat-content-max-width,46rem) + ${PANEL_PAD} + 2 * ${PANEL_FADE}));transform:translateX(-50%);z-index:-1;pointer-events:none;background:${panel};backdrop-filter:blur(${PANEL_BLUR[look.id] ?? 6}px);-webkit-backdrop-filter:blur(${PANEL_BLUR[look.id] ?? 6}px);mask-image:${fade};-webkit-mask-image:${fade}}`,
    // The chat scroller paints the canvas over the area; let the scene show through it.
    `.messages-timeline-scroll{background:transparent !important}`,
  ].join('\n')
}

let hooked = false

/** The looks, as /custom-theme lists them. */
export async function loadLooks() {
  if (!hooked) {
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
    hooked = true
  }
  return import(pathToFileURL(join(T3_DIR, '../hooks/looks/index.ts')).href)
}

/** A look's backdrop scene: the SVG source the Claude apps draw. */
export function sceneOf(look) {
  const named = look.theme.backdrop?.scene
  const scene = (named && look.scenes[named]) ?? Object.values(look.scenes)[0]
  return scene?.source
}

/** Whitespace, comments and number precision trimmed; the drawing is unchanged to the eye. */
export function minifySvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/(\d+\.\d{2})\d+/g, '$1')
    .replace(/(^|[^\d.])0\.(\d)/g, '$1.$2')
    .replace(/"/g, "'")
    .trim()
}

/** An SVG as a CSS url() value: a data: URL, percent-encoding only what CSS and URLs need. */
export function svgToCssUrl(svg) {
  const encoded = svg
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/"/g, "'")
  return `url("data:image/svg+xml,${encoded}")`
}

/**
 * The scene T3 shows for a look: its T3 version from t3/scenes/<id>.mjs when there is one,
 * else the original. Minified either way. Returns the SVG and the length of its url().
 */
export async function t3SceneOf(look) {
  const source = sceneOf(look)
  if (source === undefined) return undefined
  const adapter = join(T3_DIR, 'scenes', `${look.id}.mjs`)
  const svg = existsSync(adapter) ? (await import(pathToFileURL(adapter).href)).default(source) : source
  const min = minifySvg(svg)
  return { svg: min, length: svgToCssUrl(min).length, adapted: existsSync(adapter) }
}
