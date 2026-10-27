// 12×12 pixel icons for the dock, in the same text format as all the other
// sprites, so the whole interface shares one art style.

import { createSpriteThumbnail } from './pixel.js';

const O = '#2b2138';
const LIGHT = '#e9e1ff';

export const ICONS = {
  timer: {
    name: 'iconTimer',
    palette: { o: O, W: '#fbf7ff', h: '#e8708c' },
    rows: [
      '...oooooo...',
      '.ooWWWWWWoo.',
      '.oWWWWhWWWo.',
      'oWWWWWhWWWWo',
      'oWWWWWhWWWWo',
      'oWWWWWhhhWWo',
      'oWWWWWWWWWWo',
      'oWWWWWWWWWWo',
      '.oWWWWWWWWo.',
      '.ooWWWWWWoo.',
      '...oooooo...',
      '............',
    ],
  },
  room: {
    name: 'iconRoom',
    palette: { o: O, S: '#8d65a6', y: '#ffe4a3', g: '#62a877' },
    rows: [
      'oooooooooooo',
      'oSSSSSSSSSSo',
      'oSSSSSSSyySo',
      'oSSSSSSSyySo',
      'oSSSSSSSSSSo',
      'oSSSgSSSSSSo',
      'oSSgggSSgSSo',
      'oSgggggggggo',
      'oggggggggggo',
      'oggggggggggo',
      'oooooooooooo',
      '............',
    ],
  },
  shop: {
    name: 'iconShop',
    palette: { o: '#f2c7a5', B: '#e8708c', y: '#ffd36b' },
    rows: [
      '....oooo....',
      '...o....o...',
      '...o....o...',
      '.BBBBBBBBBB.',
      '.BBBBBBBBBB.',
      '.BBBBBBBBBB.',
      '.BBBByyBBBB.',
      '.BBBByyBBBB.',
      '.BBBBBBBBBB.',
      '.BBBBBBBBBB.',
      '.BBBBBBBBBB.',
      '............',
    ],
  },
  pets: {
    name: 'iconPets',
    palette: { p: '#f2b56b' },
    rows: [
      '............',
      '..pp....pp..',
      '..pp....pp..',
      'pp........pp',
      'pp..pppp..pp',
      '...pppppp...',
      '..pppppppp..',
      '..pppppppp..',
      '...pppppp...',
      '............',
      '............',
      '............',
    ],
  },
  settings: {
    name: 'iconSettings',
    palette: { o: O, G: '#c9bedb' },
    rows: [
      '....GGGG....',
      '.GG.GGGG.GG.',
      '.GGGGGGGGGG.',
      '..GGGooGGG..',
      'GGGGo..oGGGG',
      'GGGo....oGGG',
      'GGGo....oGGG',
      'GGGGo..oGGGG',
      '..GGGooGGG..',
      '.GGGGGGGGGG.',
      '.GG.GGGG.GG.',
      '....GGGG....',
    ],
  },
  fullscreen: {
    name: 'iconFullscreen',
    palette: { w: LIGHT },
    rows: [
      'wwww....wwww',
      'w..........w',
      'w..........w',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      'w..........w',
      'w..........w',
      'wwww....wwww',
    ],
  },
};

/** A canvas showing the icon at twice its size (24×24 CSS pixels). */
export function createIcon(name) {
  return createSpriteThumbnail(ICONS[name], 24, 24);
}
