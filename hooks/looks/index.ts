import type { Look } from './types'

import { cosmos } from './cosmos'
import { darkFleet } from './dark-fleet'
import { kyotoSunset } from './kyoto-sunset'
import { marinaBay } from './marina-bay'
import { neonTokyo } from './neon-tokyo'
import { pixelCats } from './pixel-cats'

// A short hash of a scene's drawing (32-bit FNV-1a, base 36).
function fingerprint(text: string): string {
  let h = 0x811c9dc5

  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0
  }

  return h.toString(36)
}

// Gives each scene a name that ends in a hash of its drawing, such as `neon-tokyo-1x2y3z`.
// The app redraws the backdrop only when the scene's name changes, so without this a look whose
// drawing was edited keeps showing the old picture after /reload-plugins.
function versioned(look: Look): Look {
  const names = new Map(Object.entries(look.scenes).map(([name, scene]) => [name, `${name}-${fingerprint(scene.source)}`]))
  const backdrop = look.theme.backdrop
  const renamed = backdrop !== undefined && 'scene' in backdrop && typeof backdrop.scene === 'string' ? names.get(backdrop.scene) : undefined

  return {
    ...look,
    theme: renamed === undefined || backdrop === undefined ? look.theme : { ...look.theme, backdrop: { ...backdrop, scene: renamed } as typeof backdrop },
    scenes: Object.fromEntries(Object.entries(look.scenes).map(([name, scene]) => [names.get(name) ?? name, scene])),
  }
}

// Every look `/custom-theme` can switch to, in the order it lists and `next` cycles them.
// To add one: write hooks/looks/<id>.ts exporting a Look, then list it here.
export const LOOKS: readonly Look[] = [cosmos, pixelCats, darkFleet, neonTokyo, marinaBay, kyotoSunset].map(versioned)

// Used until a look is picked with /custom-theme; after that the last pick is used.
export const DEFAULT_LOOK = 'pixel-cats'
