// The T3 version of the dark-fleet scene: the same drawing, written more compactly so its
// data: URL fits T3's theme CSS budget. It transforms the original source rather than redrawing
// it, so later edits to hooks/looks/dark-fleet.ts flow through.
//
// - The four warships are one shared drawing in <defs>, placed with <use>.
// - Runs of small plain dots (the stars, the station's windows) become a few paths of
//   zero-length round-capped strokes, one per colour, size and brightness.
// - The station's structure blocks become a few filled paths, one per shade and brightness.
// - Long gradient ids get short names.
//
// It also moves the subjects into the side margins. T3 paints the scene as a center/cover
// background of the chat area (so the scene always sees its own 1600×1000 shape, and the
// original's per-aspect-ratio placements never vary) with a frosted chat column over about
// x 392–1208. The warrior goes left of the column, the fleet and the station right of it,
// each scaled down a little to fit, and nothing big sits in the bottom centre (the composer).
const LAYOUT = [
  // Well left, by request. Feet at (205, 900); cloak about x 112–298, blade near x 250, top y 560.
  '.warrior { transform: translate(205px, 900px) scale(0.62); }',
  // Lower and further right, by request. The hulls span about x 1299–1483 (engine glow to 1495,
  // drifting 23 left over 160s), y 150–370; the sidebar view trims their right end.
  '.fleet { transform: translate(1495px, 150px) scale(0.64); }',
  // Further right, by request. Radius 99: about x 1296–1494, y 551–749, below the fleet.
  '.station { transform: translate(1395px, 650px) scale(0.66); }',
].join(' ')

// [original, T3] pairs, applied to the source before anything else renames it.
const BRIGHTER_BLADE = [
  ['fill="#ff2626" opacity="0.14"', 'fill="#ff2626" opacity="0.26"'],
  ['fill="#ff2a2a" opacity="0.28"', 'fill="#ff2a2a" opacity="0.46"'],
  ['fill="#ff3838" opacity="0.55"', 'fill="#ff4040" opacity="0.85"'],
  ['rx="6.5" fill="#ff4a4a"', 'rx="6.5" fill="#ff6a6a"'],
  ['stop-color="#ff2a2a" stop-opacity="0.4"', 'stop-color="#ff2a2a" stop-opacity="0.62"'],
  ['stop-color="#d41818" stop-opacity="0.14"', 'stop-color="#d41818" stop-opacity="0.24"'],
]

const num = '-?[\\d.]+'

function need(found, what) {
  if (!found) throw new Error(`dark-fleet T3 scene: expected ${what} in the source scene`)
}

// Round to a step and print without trailing zeros or a leading 0.
function q(n, step) {
  const v = Math.round(n / step) * step
  return String(+v.toFixed(3)).replace(/^(-?)0\./, '$1.')
}

const short = n => String(+(+n).toFixed(1))

// Path data for points, skipping the space before a negative number.
function join(parts) {
  return parts.join('').replace(/ -/g, '-')
}

/** A run of plain circles as grouped round dots. */
function dots(run) {
  const re = new RegExp(`<circle(?: class="([^"]*)")? cx="(${num})" cy="(${num})" r="(${num})" fill="(#[0-9a-f]{6})" opacity="(${num})"/>`, 'g')
  const groups = new Map()
  let m
  while ((m = re.exec(run))) {
    const [, cls, cx, cy, r, fill, op] = m
    // A twinkling dot's opacity comes from its animation, not its attribute.
    const key = cls ? `class="${cls}" stroke="${fill}" stroke-width="${q(2 * r, 0.4)}"` : `stroke="${fill}" stroke-width="${q(2 * r, 0.4)}" stroke-opacity="${q(+op, 0.1)}"`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(`M${short(cx)} ${short(cy)}h0`)
  }
  return `<g fill="none" stroke-linecap="round">${[...groups].map(([k, d]) => `<path ${k} d="${join(d)}"/>`).join('')}</g>`
}

/** A run of plain rects as grouped filled paths. */
function blocks(run) {
  const re = new RegExp(`<rect x="(${num})" y="(${num})" width="(${num})" height="(${num})" fill="(#[0-9a-f]{6})" opacity="(${num})"/>`, 'g')
  const groups = new Map()
  let m
  while ((m = re.exec(run))) {
    const [, x, y, w, h, fill, op] = m
    const key = `fill="${fill}" opacity="${q(+op, 0.15)}"`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(`M${short(x)} ${short(y)}h${short(w)}v${short(h)}h${short(-w)}`)
  }
  return [...groups].map(([k, d]) => `<path ${k} d="${join(d)}"/>`).join('')
}

export default function darkFleetT3(source) {
  let svg = source

  // 0. The subjects' placement: one fixed layout in place of the per-aspect-ratio rules.
  const placeRule = /\.(warrior|fleet|station) \{ transform: [^}]*\}/g
  const placed = new Set([...svg.matchAll(placeRule)].map(m => m[1]))
  need(placed.size === 3, 'transform rules for .warrior, .fleet and .station')
  svg = svg.replace(placeRule, '').replace(/[ \t]*@media \(max-aspect-ratio: [\d/]+\) \{\s*\}\n?/g, '')
  need(!/max-aspect-ratio/.test(svg), 'only placement rules inside the aspect-ratio media queries')
  svg = svg.replace('<style>', `<style>\n  ${LAYOUT}`)

  // 0b. A brighter blade, by request: denser glow layers, a hotter core and a stronger halo.
  for (const [from, to] of BRIGHTER_BLADE) {
    need(svg.split(from).length === 2, `exactly one ${from}`)
    svg = svg.replace(from, to)
  }

  // 1. The fleet: four copies of one ship drawing.
  const shipRe = /<g transform="([^"]+)">([\s\S]*?<\/g>\s*)<\/g>/g
  const ships = [...svg.matchAll(shipRe)]
  need(ships.length >= 2, 'the fleet\'s ship groups (<g transform="…">SHIP</g>)')
  const ship = ships[0][2]
  need(ships.every(s => s[2] === ship), 'identical drawings for every ship')
  need(ship.includes('class="engines"'), 'the ships\' engine group')
  need(svg.includes('<g class="fleet-drift">'), 'the fleet-drift group')
  svg = svg.replace(shipRe, (_, t) => `<use href="#S" transform="${t.replace(/ rotate/, 'rotate')}"/>`)
  svg = svg.replace('<g class="fleet-drift">', `<defs><g id="S">${ship}</g></defs><g class="fleet-drift">`)

  // 2. Runs of plain dots: the stars, and the station's equator belt and windows.
  const dotRun = new RegExp(`(?:<circle(?: class="[^"]*")? cx="${num}" cy="${num}" r="${num}" fill="#[0-9a-f]{6}" opacity="${num}"/>\\s*){40,}`, 'g')
  const dotRuns = svg.match(dotRun) ?? []
  need(dotRuns.length === 2, 'two long runs of plain circles (stars, station windows)')
  svg = svg.replace(dotRun, dots)

  // 3. The station's structure blocks.
  const rectRun = new RegExp(`(?:<rect x="${num}" y="${num}" width="${num}" height="${num}" fill="#[0-9a-f]{6}" opacity="${num}"/>\\s*){40,}`, 'g')
  need((svg.match(rectRun) ?? []).length === 1, 'one long run of plain rects (station blocks)')
  svg = svg.replace(rectRun, blocks)

  // 4. Short gradient ids.
  const ids = [...svg.matchAll(/ id="([\w-]{3,})"/g)].map(m => m[1])
  need(ids.length >= 5, 'gradient ids')
  ids.forEach((id, i) => {
    const to = `g${i.toString(36)}`
    svg = svg.replaceAll(`id="${id}"`, `id="${to}"`).replaceAll(`url(#${id})`, `url(#${to})`)
  })

  return svg
}
