// The T3 Code version of the Neon Tokyo backdrop: the original scene's SVG, rewritten to fit
// T3's 50,000-character theme CSS and T3's chat layout. Every pixel stays; it is written more
// tightly, and the landmarks are placed for T3:
//
// - Every pixel-art path is re-encoded. The original writes each run of pixels as a closed
//   rectangle in absolute coordinates (M12 34h5v1h-5z). Here a path is filled and stroked one
//   pixel wide in its color, offset half a pixel, so a one-row run is a short square-capped line
//   and every move is relative (m3 2h4). Big areas are drawn whole, under the details painted
//   after them, instead of around them, and evenly spaced stripes and poles as dashed lines.
// - The per-aspect layout CSS gives way to one placement for T3 (see PLACES).
// - Ids, class and animation names are shortened, the glow gradients and CSS squeezed.
//
// It transforms the source as strings, so later edits to the original flow through. When an
// expected pattern is missing it throws, naming it, instead of returning a broken scene.

// Where T3 shows each landmark: [x, y, scale] in scene units (1600 by 1000).
//
// T3 paints the scene behind its chat area at the scene's own 16:10 shape, center/cover, so
// the original's per-aspect bands never change anything there; one placement serves. T3 also
// draws a frosted panel behind the centered chat column, over about x 392 to 1208. The
// landmarks move out from under it into the sides that stay visible even with the sidebar
// open (x 200 to 392 and 1208 to 1400), a little smaller: on the left the Skytree with the
// moon now just left of it (the antenna still crossing it), the ラーメン block and the cherry
// tree; on the right Tokyo Tower, the カラオケ and トウキョウ signs, the vending machine with
// the cat, and the tail of the train. The skyline, the street, Mt Fuji's dusky slope and the
// sky still span the width under the frost.
// Both sides sit about 90 further out than the sidebar-safe zones, by request: wider apart at
// full width, with the outer edges trimmed when the sidebar is open.
const PLACES = {
  moon: [202, 278, 0.8],
  skytree: [240, 750, 0.8],
  left: [125, 750, 0.8],
  sakura: [65, 1000, 0.55],
  tower: [1390, 750, 0.8],
  right: [1505, 728, 0.65], // raised so the small カラオケ sign clears the overhead wire
  train: [1480, 0, 1],
  vend: [1420, 900, 0.8],
}
// The shooting star starts here, right of the panel, and falls toward it.
const METEOR = 'translate(1470 60)'
// The veil darkening the middle, fitted to the panel: clear outside it, its darkest inside.
const SCRIM_STOPS = ['0', '.245', '.3', '.7', '.755', '1']
// Lighter than the original's .66, by request: T3's frosted panel already sits over the middle.
const SCRIM_DARKEST = '.38'

const fail = what => {
  throw new Error(`neon-tokyo T3 scene: ${what} not found in the source scene`)
}

// Replace, checking that the pattern matched at least once.
function must(svg, pattern, replace, what) {
  let hits = 0
  const out = svg.replace(pattern, (...m) => {
    hits++
    return replace(...m)
  })
  if (hits === 0) fail(what)
  return out
}

// ---------- pixel paths ----------

const RECT = /M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\d+z/g

function rectsOf(d) {
  const rects = []
  const rest = d.replace(RECT, (_, x, y, w, h) => {
    rects.push([+x, +y, +w, +h])
    return ''
  })
  if (rest !== '') throw new Error(`neon-tokyo T3 scene: a path that is not pixel runs: ${d.slice(0, 60)}`)
  return rects
}

const K = 1 << 12 // cell keys: (y + K) * 2K + (x + K)
const key = (x, y) => (y + K) * 2 * K + x + K
const xy = k => [(k % (2 * K)) - K, Math.floor(k / (2 * K)) - K]

function cellsOf(rects) {
  const cells = new Set()
  for (const [x, y, w, h] of rects) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cells.add(key(x + i, y + j))
  }
  return cells
}

// Rectangles covering `own`, free to spill onto `under` (cells that later paths paint over):
// runs along each row, trimmed to their own cells, merged down the rows where they line up.
function rectsFor(own, under = new Set()) {
  const rows = new Map()
  for (const k of own) {
    const [x, y] = xy(k)
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y).push(x)
  }
  const runs = []
  let open = new Map()
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(y).sort((a, b) => a - b)
    const next = new Map()
    let i = 0
    while (i < xs.length) {
      let j = i
      // Extend while the next own cell is reachable over cells painted later.
      while (j + 1 < xs.length) {
        let x = xs[j] + 1
        while (x < xs[j + 1] && under.has(key(x, y))) x++
        if (x < xs[j + 1]) break
        j++
      }
      const id = `${xs[i]},${xs[j]}`
      const above = open.get(id)
      if (above && above[1] + above[3] === y) {
        above[3]++
        next.set(id, above)
      } else {
        const run = [xs[i], y, xs[j] - xs[i] + 1, 1]
        runs.push(run)
        next.set(id, run)
      }
      i = j + 1
    }
    open = next
  }
  return runs
}

const num = (out, n) => (n < 0 || /[a-z]$/.test(out) ? `${out}${n}` : `${out} ${n}`)

// Rectangles as one path for a fill and a one-pixel stroke, half a pixel in from each edge.
function encode(rects) {
  let out = ''
  let cx = 0
  let cy = 0
  for (const [x, y, w, h] of rects) {
    out = out === '' ? `M${x + 0.5} ${y + 0.5}` : num(`${out}m${x - cx}`, y - cy)
    cx = x
    cy = y
    if (h === 1) {
      out += `h${w - 1}`
      cx += w - 1
    } else if (w === 1) {
      out += `v${h - 1}`
      cy += h - 1
    } else {
      out += `h${w - 1}v${h - 1}h-${w - 1}z`
    }
  }
  return out
}

const paint = fill => (fill.startsWith('url(') ? `style="fill:${fill};stroke:${fill}"` : `color="${fill}"`)

// Evenly spaced equal rectangles in a row or a column (crosswalk stripes, poles), each set
// drawn as one dashed line.
function dashes(rects, fill) {
  const extra = []
  let rest = rects
  for (const across of [true, false]) {
    const groups = new Map()
    for (const r of rest) {
      const [x, y, w, h] = r
      const k = across ? `${y},${w},${h}` : `${x},${w},${h}`
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(r)
    }
    const used = new Set()
    for (const group of groups.values()) {
      group.sort((a, b) => (across ? a[0] - b[0] : a[1] - b[1]))
      let i = 0
      while (i < group.length - 1) {
        const at = r => (across ? r[0] : r[1])
        const size = across ? group[i][2] : group[i][3]
        const step = at(group[i + 1]) - at(group[i])
        let j = i + 1
        while (j + 1 < group.length && at(group[j + 1]) - at(group[j]) === step) j++
        const n = j - i + 1
        if (n >= 5 && step > size) {
          const [x, y, w, h] = group[i]
          const width = across ? h : w
          const len = (n - 1) * step + size
          const d = across ? `M${x} ${y + h / 2}h${len}` : `M${x + w / 2} ${y}v${len}`
          const style = `${width === 1 ? '' : `stroke-width:${width};`}stroke-dasharray:${size} ${step - size};stroke-linecap:butt`
          const p = paint(fill)
          extra.push(p.startsWith('style') ? `<path ${p.slice(0, -1)};${style}" d="${d}"/>` : `<path ${p} style="${style}" d="${d}"/>`)
          for (let k = i; k <= j; k++) used.add(group[k])
          i = j + 1
        } else {
          i++
        }
      }
    }
    rest = rest.filter(r => !used.has(r))
  }
  return [rest, extra.join('')]
}

// One path's rectangles as elements: the path, and any dashed lines split from it.
function element(fill, rects) {
  const plain = rects.length > 0 ? `<path ${paint(fill)} d="${encode(rects)}"/>` : ''
  const [rest, extra] = dashes(rects, fill)
  const split = (rest.length > 0 ? `<path ${paint(fill)} d="${encode(rest)}"/>` : '') + extra
  return split.length < plain.length ? split : plain
}

// Paths in this order, each spilling under the paths after it where that is shorter.
function write(paths) {
  const under = new Set()
  const out = []
  for (let i = paths.length - 1; i >= 0; i--) {
    const { fill, rects, cells } = paths[i]
    let el = element(fill, rects)
    if (under.size > 0) {
      const spilled = element(fill, rectsFor(cells, under))
      if (spilled.length < el.length) el = spilled
    }
    cells.forEach(c => under.add(c))
    out.unshift(el)
  }
  return out.join('')
}

const overlap = (a, b) => {
  const [small, big] = a.size < b.size ? [a, b] : [b, a]
  for (const c of small) if (big.has(c)) return true
  return false
}

// The same paths, biggest first wherever that keeps every overlapping pair in its order, so
// the big areas can spill under the details.
function biggestFirst(paths) {
  const placed = []
  const left = [...paths]
  while (left.length > 0) {
    let pick = -1
    left.forEach((p, i) => {
      const free = left.slice(0, i).every(q => !overlap(p.cells, q.cells))
      if (free && (pick < 0 || p.cells.size > left[pick].cells.size)) pick = i
    })
    placed.push(...left.splice(pick, 1))
  }
  return placed
}

function repaths(svg) {
  return must(
    svg,
    /(?:<path fill="[^"]+" d="[^"]+"\/>)+/g,
    siblings => {
      const paths = [...siblings.matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)].map(([, fill, d]) => {
        const rects = rectsOf(d)
        return { fill, rects, cells: cellsOf(rects) }
      })
      // In their own order or biggest first, whichever is shorter.
      const own = write(paths)
      const big = write(biggestFirst(paths))
      return big.length < own.length ? big : own
    },
    'pixel paths',
  )
}

// Neighboring plain pixel groups, one after another, become one group, so their paths can
// spill under each other's.
function mergeGroups(svg) {
  const pair = /(<g transform="scale\(5\)">(?:<path [^>]*>)*)<\/g>\s*<g transform="scale\(5\)">/g
  let prev
  do {
    prev = svg
    svg = svg.replace(pair, '$1')
  } while (svg !== prev)
  return svg
}

// Every pixel group scales by a class instead of a transform.
function scaleClass(svg) {
  svg = must(svg, /<g transform="scale\(5\)">/g, () => '<g class="px">', 'pixel groups')
  svg = svg.replace(/<g class="([^"]+)" transform="scale\(5\)">/g, (_, c) => `<g class="${c} px">`)
  return must(svg, /<style>/, () => '<style>.px{transform:scale(5)}', 'the <style> block')
}

// The falling petals as one-pixel paths.
function petals(svg) {
  return must(
    svg,
    /<rect (class="[^"]+" style="[^"]+") x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="1" fill="([^"]+)"\/>/g,
    (_, attrs, x, y, w, fill) => `<path ${attrs} color="${fill}" d="M${+x + 0.5} ${+y + 0.5}h${w - 1}"/>`,
    'the falling petals',
  )
}

// ---------- names ----------

function shortIds(svg) {
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1])
  if (ids.length === 0) fail('ids')
  ids.forEach((id, i) => {
    const short = `i${i.toString(36)}`
    svg = svg.split(`id="${id}"`).join(`id="${short}"`).split(`url(#${id})`).join(`url(#${short})`)
  })
  return svg
}

const inStyle = (svg, edit) => must(svg, /<style>[\s\S]*?<\/style>/, edit, 'the <style> block')

const letters = i => (i < 26 ? '' : letters(Math.floor(i / 26) - 1)) + String.fromCharCode(97 + (i % 26))

function shortClasses(svg) {
  const names = new Set()
  for (const m of svg.matchAll(/ class="([^"]+)"/g)) m[1].split(' ').forEach(n => names.add(n))
  if (names.size === 0) fail('classes')
  const map = new Map([...names].map((n, i) => [n, letters(i)]))
  svg = svg.replace(/ class="([^"]+)"/g, (_, c) => ` class="${c.split(' ').map(n => map.get(n)).join(' ')}"`)
  return inStyle(svg, css => css.replace(/\.([a-zA-Z][\w-]*)(?![\w-])/g, (m, n) => (map.has(n) ? `.${map.get(n)}` : m)))
}

function shortKeyframes(svg) {
  return inStyle(svg, css => {
    const names = [...css.matchAll(/@keyframes ([\w-]+)/g)].map(m => m[1])
    if (names.length === 0) fail('@keyframes')
    names.forEach((n, i) => {
      css = css.replace(new RegExp(`(?<![\\w.-])${n}(?![\\w-])`, 'g'), `k${i.toString(36)}`)
    })
    return css
  })
}

// ---------- layout CSS ----------

const short = n => (Number.isNaN(+n) ? n : String(+n).replace(/^(-?)0\./, '$1.'))

// The original's per-aspect layout CSS gives way to the T3 places.
function t3Layout(svg) {
  const placed = new Set([...svg.matchAll(/ class="at-([\w-]+)"/g)].map(m => m[1]))
  for (const name of Object.keys(PLACES)) if (!placed.has(name)) fail(`the placed sprite at-${name}`)
  for (const name of placed) if (name !== 'scrim' && !PLACES[name]) throw new Error(`neon-tokyo T3 scene: no T3 place for at-${name}`)

  svg = must(svg, /^ *(?:@media \(max-aspect-ratio: [\d/]+\) \{ )?(?:\.at-[\w-]+ \{ [^}]* \} ?)+\}? *\n/gm, () => '', 'layout CSS')
  const rules = Object.entries(PLACES)
    .map(([name, [x, y, s]]) => `.at-${name}{translate:${x}px ${y}px${s === 1 ? '' : `;scale:${short(s)}`}}`)
    .join('')
  svg = inStyle(svg, css => css.replace('<style>', `<style>${rules}`))

  svg = must(svg, /<g transform="translate\(1180 70\)">/, () => `<g transform="${METEOR}">`, 'the shooting star')

  return must(
    svg,
    /(<linearGradient id="g-scrim"[^>]*>)((?:<stop [^>]*\/>){6})/,
    (_, open, stops) => {
      let i = 0
      return open + stops
        .replace(/offset="[^"]*"/g, () => `offset="${SCRIM_STOPS[i++]}"`)
        .replace(/stop-opacity="0?\.66"/g, `stop-opacity="${SCRIM_DARKEST}"`)
    },
    'the veil gradient',
  )
}

// Each glow's gradient names its color once, for both stops.
function glowGradients(svg) {
  svg = must(
    svg,
    /<radialGradient id="([^"]+)"><stop offset="0" stop-color="([^"]+)" stop-opacity="([^"]+)"\/><stop offset="1" stop-color="\2" stop-opacity="0"\/><\/radialGradient>/g,
    (_, id, color, opacity) => `<radialGradient id="${id}" color="${color}"><stop stop-opacity="${opacity}"/><stop offset="1"/></radialGradient>`,
    'the glow gradients',
  )
  return inStyle(svg, css => css.replace('</style>', 'radialGradient>*{stop-color:currentColor}radialGradient>[offset]{stop-opacity:0}</style>'))
}

function squeezeCss(svg) {
  return inStyle(
    svg,
    css =>
      `${css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/\b0\.(\d)/g, '.$1')
        .replace('</style>', 'path{fill:currentColor;stroke:currentColor;stroke-linecap:square}</style>')}`,
  )
}

// ---------- the scene ----------

export default function neonTokyoT3(source) {
  let svg = source

  // The placed sprites carry their 16:10 place for renderers that read no CSS; T3 reads it.
  svg = must(svg, /(<g class="at-[\w-]+") transform="[^"]*"/g, (_, g) => g, 'placed sprites')

  svg = mergeGroups(svg)
  svg = repaths(svg)
  svg = petals(svg)
  svg = scaleClass(svg)
  svg = t3Layout(svg)
  svg = glowGradients(svg)
  svg = shortIds(svg)
  svg = shortClasses(svg)
  svg = shortKeyframes(svg)
  svg = squeezeCss(svg)
  return svg
}
