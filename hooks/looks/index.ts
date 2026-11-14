import type { Look } from './types'

import { cosmos } from './cosmos'
import { pixelCats } from './pixel-cats'

// Every look `/custom-theme` can switch to, in the order it lists and `next` cycles them.
// To add one: write hooks/looks/<id>.ts exporting a Look, then list it here.
export const LOOKS: readonly Look[] = [cosmos, pixelCats]

// Used until a look is picked with /custom-theme; after that the last pick is used.
export const DEFAULT_LOOK = 'pixel-cats'
