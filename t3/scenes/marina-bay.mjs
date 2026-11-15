// The Marina Bay scene, made light enough for a T3 Code theme (its CSS is capped at 50,000
// characters, and the original is about 93,000 as a url()). It transforms the original's SVG
// source rather than redrawing it, so later edits to hooks/looks/marina-bay.ts flow through:
//
// - The per-aspect layout CSS is resolved to the one shape T3 shows. T3 paints the scene as a
//   center/cover background, so the SVG's viewport always has the scene's own 16:10 shape; the
//   rules that apply there are written onto the groups and the @media bands dropped. Then the
//   landmarks and effects move out from behind T3's centred chat column (see T3_SPOTS).
// - Every pixel-art path (rectangles written "Mx yhWvHh-Wz") is re-encoded with relative moves:
//   one-row runs become 1-unit strokes along the row, rows of evenly spaced single pixels
//   (checkerboards, lamp strings) become dashed strokes, taller runs stay filled rectangles.
// - The art-pixel scale(5) wrapped round every sprite is folded into its placed group, the laser
//   beams become paths, and ids, classes and keyframe names are shortened.
//
// So every sprite is drawn pixel for pixel as in the original, with all of its animation and its
// prefers-reduced-motion rule; only the encoding is lighter and the landmarks sit in the margins. If the source no longer has the
// shapes this relies on, it throws, naming what is missing.

const ASPECT = 1.6
const PX = 5

const need = (ok, what) => {
  if (!ok) throw new Error(`marina-bay T3 scene: expected ${what} in the source scene`)
  return ok
}

// ---------- a minimal SVG tree ----------

function parse(svg) {
  const root = { tag: '#root', attrs: [], kids: [] }
  const stack = [root]
  for (const [tok] of svg.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g)) {
    const top = stack[stack.length - 1]
    if (tok.startsWith('<!--')) continue
    if (tok.startsWith('</')) {
      need(top.tag === tok.slice(2, -1).trim(), `well-formed markup (stray ${tok})`)
      stack.pop()
    } else if (tok.startsWith('<')) {
      const [, tag, rest] = /^<([a-zA-Z]+)([\s\S]*?)\/?>$/.exec(tok)
      const node = { tag, attrs: [...rest.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]), kids: [] }
      top.kids.push(node)
      if (!tok.endsWith('/>')) stack.push(node)
    } else {
      top.kids.push(tok)
    }
  }
  need(stack.length === 1, 'well-formed markup (unclosed elements)')
  return root
}

const serialize = node =>
  typeof node === 'string'
    ? node
    : node.tag === '#root'
      ? node.kids.map(serialize).join('')
      : `<${node.tag}${node.attrs.map(([k, v]) => ` ${k}="${v}"`).join('')}${
          node.kids.length ? `>${node.kids.map(serialize).join('')}</${node.tag}>` : '/>'
        }`

const attr = (n, k) => n.attrs.find(a => a[0] === k)?.[1]
const setAttr = (n, k, v) => {
  const a = n.attrs.find(x => x[0] === k)
  if (v === undefined) n.attrs = n.attrs.filter(x => x[0] !== k)
  else if (a) a[1] = v
  else n.attrs.push([k, v])
}
const walk = (n, fn) => {
  if (typeof n === 'string') return
  fn(n)
  n.kids.forEach(k => walk(k, fn))
}
const elements = n => n.kids.filter(k => typeof k !== 'string' || k.trim() !== '')

// ---------- layout: resolve the per-aspect CSS to 16:10, then clear T3's chat column ----------

// T3 centres the chat in a frosted column over about x 392–1208 of the scene, with the composer
// at the bottom. The landmarks and effects people look for move into the margins either side
// (x 200–392 and 1208–1400 stay in view with the sidebar open; 90–392 and 1208–1510 at full
// width), scaled down to fit; the sky, the far city and the water still span the whole width.
// [x, y, scale] in scene units, per placed group. Their reflections follow, sharing the class.
const T3_SPOTS = {
  // Zoomed in, by request, to match how full the Claude apps draw it: the landmarks at about 1.3×
  // the art's size (the original's 16:10 band uses 0.93), cropped at the window's edges and
  // reaching in under the panel's faded sides. The sidebar view trims their outer parts.
  // Left: the Downtown Core with the Flyer behind it, the Merlion and the Esplanade at its foot,
  // two of the fireworks above.
  downtown: [-90, 760, 1.25],
  flyer: [300, 760, 1.15],
  merlion: [200, 760, 1.3],
  esplanade: [330, 760, 1],
  fw1: [250, 130, 1.3],
  fw3: [1200, 250, 1],
  // Right: Marina Bay Sands and its lasers, the Supertrees behind, the lotus under the SkyPark's
  // cantilever, the bumboat below and the third burst above.
  mbs: [1390, 760, 1.3],
  gardens: [1660, 760, 1.2],
  artscience: [1150, 760, 0.9],
  boat: [1380, 900, 1.25],
  fw2: [1440, 130, 1.3],
}

// The veil darkening the middle: lighter than the original's .66, by request, since T3's frosted
// panel already sits over the chat column.
const SCRIM_DARKEST = '.38'

// Calmer effects for T3, by request: [original, T3] edits to the scene's own CSS. The lasers dim
// and switch half as fast, the fireworks come half as often (each burst pops just as fast), and
// the beacon, spire lights, Supertree swap, water shimmer and Merlion jet slow down.
const CALMER = [
  ['.beacon { animation: beacon 2.4s', '.beacon { animation: beacon 4.8s'],
  ['.cap { animation: cap 1.8s', '.cap { animation: cap 5.4s'],
  ['.cap1 { animation-delay: -1.2s; }', '.cap1 { animation-delay: -3.6s; }'],
  ['.cap2 { animation-delay: -0.6s; }', '.cap2 { animation-delay: -1.8s; }'],
  ['.laser { animation: laser 12s', '.laser { animation: laser 24s'],
  ['.laser1 { animation-delay: -11s; }', '.laser1 { animation-delay: -22s; }'],
  ['.laser2 { animation-delay: -10s; }', '.laser2 { animation-delay: -20s; }'],
  ['@keyframes laser { 0% { opacity: 1; } 8.33% { opacity: 0; } 25% { opacity: 1; } 33.33% { opacity: 0; } }',
    '@keyframes laser { 0% { opacity: .55; } 8.33% { opacity: 0; } 25% { opacity: .55; } 33.33% { opacity: 0; } }'],
  ['.st-a { animation: st 8s', '.st-a { animation: st 16s'],
  ['animation: st 8s step-end infinite; animation-delay: -4s;', 'animation: st 16s step-end infinite; animation-delay: -8s;'],
  ['.sh-a, .sh-b { animation: tw 1.6s', '.sh-a, .sh-b { animation: tw 4s'],
  ['.sh-b { animation-delay: -0.8s; }', '.sh-b { animation-delay: -2s; }'],
  ['.jet-a, .jet-b { animation: jet 0.5s', '.jet-a, .jet-b { animation: jet 1.6s'],
  ['.jet-b { animation-delay: -0.25s; }', '.jet-b { animation-delay: -0.8s; }'],
  ['.fw { animation: 11s', '.fw { animation: 22s'],
  ['@keyframes fw0 { 0% { opacity: 1; } 3% { opacity: 0; } }', '@keyframes fw0 { 0% { opacity: 1; } 1.5% { opacity: 0; } }'],
  ['@keyframes fw1 { 0% { opacity: 0; } 3% { opacity: 1; } 7% { opacity: 0; } }', '@keyframes fw1 { 0% { opacity: 0; } 1.5% { opacity: 1; } 3.5% { opacity: 0; } }'],
  ['@keyframes fw2 { 0% { opacity: 0; } 7% { opacity: 1; } 10% { opacity: 0.5; } 13% { opacity: 0; } }',
    '@keyframes fw2 { 0% { opacity: 0; } 3.5% { opacity: 1; } 5% { opacity: 0.5; } 6.5% { opacity: 0; } }'],
  ['.at-fw2 .fw { animation-delay: -4s; }', '.at-fw2 .fw { animation-delay: -8s; }'],
  ['.at-fw3 .fw { animation-delay: -7.5s; }', '.at-fw3 .fw { animation-delay: -15s; }'],
]

function placeForT3(svg) {
  for (const [name, [x, y, s]] of Object.entries(T3_SPOTS)) {
    let found = 0
    walk(svg, n => {
      if (n.tag !== 'g' || !(attr(n, 'class') ?? '').split(' ').includes(`at-${name}`)) return
      found++
      setAttr(n, 'transform', `translate(${x} ${y}) scale(${s})`)
    })
    need(found, `a <g class="at-${name}"> group to move out of the chat column`)
  }
}

function resolveLayout(style, svg) {
  const css = style.kids[0]
  need(typeof css === 'string', 'CSS in the <style> element')
  let i = 0
  const rule = /\s*\.at-([\w-]+) \{([^}]*)\}/y
  const media = /\s*@media \(max-aspect-ratio: (\d+)\/(\d+)\) \{/y
  const close = /\s*\}/y
  // The rules for every shape first, then one band per @media, each narrower than the last.
  const rulesAt = rules => {
    for (let m; (rule.lastIndex = i), (m = rule.exec(css)); i = rule.lastIndex) rules.set(m[1], m[2])
    return rules
  }
  const blocks = [[Infinity, rulesAt(new Map())]]
  for (let m; (media.lastIndex = i), (m = media.exec(css)); ) {
    i = media.lastIndex
    blocks.push([Number(m[1]) / Number(m[2]), rulesAt(new Map())])
    close.lastIndex = i
    need(close.exec(css), 'a closing brace after each layout @media band')
    i = close.lastIndex
  }
  need(blocks[0][1].size > 0 && blocks.length > 1, 'the layout CSS (.at-* rules, then @media (max-aspect-ratio) bands)')
  style.kids[0] = css.slice(i)

  const final = new Map()
  for (const [ratio, rules] of blocks) if (ASPECT <= ratio) for (const [k, v] of rules) final.set(k, v)

  for (const [name, decl] of final) {
    const t = need(/transform:\s*translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([^)]*)\)/.exec(decl), `a transform in the .at-${name} rule`)
    const o = /opacity:\s*([\d.]+)/.exec(decl)
    let found = 0
    walk(svg, n => {
      if (n.tag !== 'g' || !(attr(n, 'class') ?? '').split(' ').includes(`at-${name}`)) return
      found++
      setAttr(n, 'transform', `translate(${t[1]} ${t[2]}) scale(${t[3].replace(/\s/g, '')})`)
      if (o && Number(o[1]) !== 1) setAttr(n, 'opacity', o[1])
    })
    need(found, `a <g class="at-${name}"> group`)
  }
}

// ---------- pixel paths: shorter encoding, same pixels ----------

const RECT = /M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\d+z/g
const RECTS = /^(?:M-?\d+ -?\d+h\d+v\d+h-\d+z)+$/
const pair = (a, b) => `${a}${b < 0 ? '' : ' '}${b}`

// Horizontal strokes, one per [x, y, length], each a move relative to where the last ended.
function strokes(list) {
  let d = ''
  let cx = 0
  let cy = 0
  for (const [x, y, len] of list) {
    d += d === '' ? `M${pair(x, y + 0.5)}h${len}` : `m${pair(x - cx, y + 0.5 - cy)}h${len}`
    cx = x + len
    cy = y + 0.5
  }
  return d
}

// A color's rectangles as paths: filled boxes for the tall ones, strokes for one-row runs,
// and a dashed stroke per spacing for rows of evenly spaced single pixels.
function encode(color, rects) {
  const rows = new Map()
  for (const r of rects.filter(r => r.h === 1)) rows.set(r.y, [...(rows.get(r.y) ?? []), r])
  const plain = []
  const dashed = new Map() // spacing → [x, y, length, count]
  for (const [y, row] of [...rows].sort((a, b) => a[0] - b[0])) {
    row.sort((a, b) => a.x - b.x)
    for (let i = 0; i < row.length; ) {
      const s = row[i + 1] ? row[i + 1].x - row[i].x : 0
      let j = i + 1
      if (row[i].w === 1) while (j < row.length && row[j].w === 1 && row[j].x - row[j - 1].x === s) j++
      if (j - i >= 3) {
        dashed.set(s, [...(dashed.get(s) ?? []), [row[i].x, y, (j - i - 1) * s + 1, j - i]])
        i = j
      } else {
        plain.push([row[i].x, y, row[i].w])
        i++
      }
    }
  }
  let out = ''
  for (const [s, list] of dashed) {
    // A dashed path of its own pays off only if it replaces enough single pixels.
    if (list.reduce((sum, c) => sum + (c[3] - 1) * 6, 0) < 50) {
      for (const [x, y, , k] of list) for (let n = 0; n < k; n++) plain.push([x + n * s, y, 1])
      dashed.delete(s)
    }
  }
  plain.sort((a, b) => a[1] - b[1] || a[0] - b[0])

  let box = ''
  let cx = 0
  let cy = 0
  for (const { x, y, w, h } of rects.filter(r => r.h > 1)) {
    // Left open: filling closes each, and the pen ends at the bottom left.
    box += `${box === '' ? `M${pair(x, y)}` : `m${pair(x - cx, y - cy)}`}h${w}v${h}h-${w}`
    cx = x
    cy = y + h
  }
  if (box) out += `<path fill="${color}" d="${box}"/>`
  if (plain.length) out += `<path stroke="${color}" d="${strokes(plain)}"/>`
  for (const [s, list] of dashed) out += `<path stroke="${color}" stroke-dasharray="1 ${s - 1}" d="${strokes(list)}"/>`
  return out
}

function repath(svg) {
  let count = 0
  walk(svg, n => {
    n.kids = n.kids.flatMap(k => {
      if (typeof k === 'string' || k.tag !== 'path') return [k]
      const fill = attr(k, 'fill')
      const d = attr(k, 'd')
      if (k.attrs.length !== 2 || fill === undefined || !RECTS.test(d)) return [k]
      count++
      const rects = [...d.matchAll(RECT)].map(m => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }))
      return parse(encode(fill, rects)).kids
    })
  })
  need(count > 50, 'pixel-art paths (M x y h w v h h-w z rectangles)')
}

// The laser beams: each <line> pair (a wide faint one, a thin bright one) becomes part of one
// path per color, width and opacity.
function lines(svg) {
  let count = 0
  walk(svg, n => {
    if (!n.kids.some(k => k.tag === 'line')) return
    const groups = new Map()
    const kids = []
    for (const k of n.kids) {
      if (k.tag !== 'line') {
        kids.push(k)
        continue
      }
      count++
      const rest = k.attrs.filter(([a]) => !/^[xy][12]$/.test(a))
      const key = JSON.stringify(rest)
      if (!groups.has(key)) {
        const path = { tag: 'path', attrs: [...rest, ['d', '']], kids: [] }
        groups.set(key, path)
        kids.push(path)
      }
      const p = groups.get(key)
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(a => need(attr(k, a), `${a} on each <line>`))
      // The line-to is implicit after a move.
      setAttr(p, 'd', `${attr(p, 'd')}M${pair(x1, y1)}${x2 < 0 ? '' : ' '}${pair(x2, y2)}`)
    }
    n.kids = kids
  })
  need(count > 0, 'the laser beams (<line> elements)')
}

// ---------- fold the art-pixel scale ----------

const isPx = k => typeof k !== 'string' && k.tag === 'g' && attr(k, 'transform') === `scale(${PX})`
const unscale = k => {
  setAttr(k, 'transform', undefined)
  return k.attrs.length ? [k] : k.kids
}

function foldScale(svg) {
  const top = need(svg.kids.find(k => k.tag === 'svg'), 'an <svg> element')
  let folded = 0
  // A placed sprite: every part of it is drawn in art pixels, so its own scale takes the 5.
  walk(top, n => {
    const t = /^(translate\([^)]*\)) scale\(([\d.]+)\)$/.exec(attr(n, 'transform') ?? '')
    const kids = elements(n)
    if (!t || kids.length === 0 || !kids.every(isPx)) return
    setAttr(n, 'transform', `${t[1]} scale(${+(Number(t[2]) * PX).toFixed(3)})`)
    n.kids = kids.flatMap(unscale)
    folded++
  })
  // The unplaced layers (sky, stars, the far city, the water): each run of them shares one scale.
  const kids = []
  for (const k of top.kids) {
    if (!isPx(k)) {
      if (typeof k !== 'string' || k.trim() !== '') kids.push(k)
      continue
    }
    const last = kids[kids.length - 1]
    if (!(last && last.shared)) kids.push({ tag: 'g', attrs: [['transform', `scale(${PX})`]], kids: [], shared: true })
    kids[kids.length - 1].kids.push(...unscale(k))
  }
  top.kids = kids
  need(folded > 5, 'placed sprites drawn in scale(5) art pixels')
}

// ---------- names ----------

const short = n => {
  const abc = 'abcdefghijklmnopqrstuvwxyz'
  return n < 26 ? abc[n] : abc[Math.floor(n / 26) - 1] + abc[n % 26]
}

function rename(svg, style) {
  const ids = new Map()
  const classes = new Map()
  walk(svg, n => {
    const id = attr(n, 'id')
    if (id !== undefined) ids.set(id, `i${short(ids.size)}`)
    for (const c of (attr(n, 'class') ?? '').split(/\s+/).filter(Boolean)) if (!classes.has(c)) classes.set(c, short(classes.size))
  })
  need(ids.size > 0 && classes.size > 0, 'ids and classes')
  walk(svg, n => {
    for (const a of n.attrs) {
      if (a[0] === 'id') a[1] = ids.get(a[1])
      else if (a[0] === 'class') a[1] = a[1].split(/\s+/).map(c => classes.get(c)).join(' ')
      else a[1] = a[1].replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m))
    }
  })
  let css = style.kids[0]
  const frames = new Map([...css.matchAll(/@keyframes ([\w-]+)/g)].map((m, n) => [m[1], `k${short(n)}`]))
  need(frames.size > 0, '@keyframes')
  css = css
    .replace(/@keyframes ([\w-]+)/g, (_, f) => `@keyframes ${frames.get(f)}`)
    .replace(/(animation(?:-name)?\s*:)([^;}]*)/g, (_, p, v) => p + v.replace(/[a-zA-Z][\w-]*/g, w => frames.get(w) ?? w))
    .replace(/\.([a-zA-Z][\w-]*)/g, (m, c) => `.${need(classes.get(c), `an element with class "${c}"`)}`)
  style.kids[0] = css
}

const tidyCss = style => {
  style.kids[0] = style.kids[0]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
}

export default function marinaBayT3(source) {
  need(/<svg[^>]*viewBox="0 0 1600 1000"/.test(source), 'a 1600×1000 <svg>')
  const veil = /(<linearGradient id="g-scrim"[^>]*>(?:<stop [^>]*\/>){6})/.exec(source)
  need(veil, 'the g-scrim veil gradient')
  source = source.replace(veil[1], veil[1].replace(/stop-opacity="0?\.66"/g, `stop-opacity="${SCRIM_DARKEST}"`))
  for (const [from, to] of CALMER) {
    need(source.split(from).length === 2, `exactly one "${from}" in the scene's CSS`)
    source = source.replace(from, to)
  }
  const svg = parse(source)
  let style
  walk(svg, n => {
    if (n.tag === 'style') style = n
  })
  need(style && style.kids.length === 1, 'a <style> element')
  need(/prefers-reduced-motion/.test(style.kids[0]), 'the prefers-reduced-motion rule')
  resolveLayout(style, svg)
  placeForT3(svg)
  repath(svg)
  lines(svg)
  foldScale(svg)
  rename(svg, style)
  tidyCss(style)
  return serialize(svg)
}
