// Original placeholder pixel art, written as text. One character = one pixel,
// '.' = transparent. See drawSprite() in pixel.js for how these are drawn.
//
// Tip: sprite rows are easiest to edit in a monospace font with the rows
// lined up, exactly as below. Every row of a sprite should be the same length.

const OUTLINE = '#3b2d4a';

export const SPRITES = {
  lamp: {
    name: 'lamp',
    palette: {
      o: OUTLINE,
      h: '#fde7bf', // shade highlight
      S: '#f2c98d', // shade
      L: '#fff6dc', // glowing rim under the shade
      s: '#5b4a6e', // stem
      b: '#6f5d85', // base highlight
      B: '#4b3d5e', // base
    },
    rows: [
      '....oooooo....',
      '...ohSSSSSo...',
      '...ohSSSSSo...',
      '..ohSSSSSSSo..',
      '..ohSSSSSSSo..',
      '.ohSSSSSSSSSo.',
      '.ohSSSSSSSSSo.',
      'ohSSSSSSSSSSSo',
      'oLLLLLLLLLLLLo',
      '.oooooooooooo.',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '....oossoo....',
      '...obbbbbbo...',
      '..oBBBBBBBBo..',
    ],
  },

  snakePlant: {
    name: 'snakePlant',
    palette: {
      d: '#3f7d58', // leaf shadow
      g: '#62a877', // leaf
      l: '#9fd49a', // leaf highlight / stripe
      o: OUTLINE,
      r: '#eab08f', // pot rim
      p: '#d4876a', // pot
      P: '#a9624c', // pot shadow
    },
    rows: [
      '.........g......',
      '........dgl.....',
      '........dgl.....',
      '......g.dgl.....',
      '.....dgldgl.....',
      '.....dgldgl.g...',
      '.....dgldgldgl..',
      '.....dlldgldgl..',
      '.....dgldlldgl..',
      '...g.dgldgldll..',
      '..dgldgldgldgl..',
      '..dlldgldgldgl..',
      '..dgldlldgldgl..',
      '..dgldgldlldgl..',
      '..dgldgldgldll..',
      '..dlldgldgldgl..',
      '..dgldlldgldgl..',
      '..dgldgldlldgl..',
      '..dgldgldgldll..',
      '..dlldgldgldgl..',
      '..dgldgldgldgl..',
      '..dgldgldgldgl..',
      '.oooooooooooooo.',
      '.orrrrrrrrrrrro.',
      '.oppppppppppPPo.',
      '..oppppppppPPo..',
      '..oppppppppPPo..',
      '...opppppppPo...',
      '...opppppppPo...',
      '...opppppppPo...',
      '....oooooooo....',
    ],
  },

  cactus: {
    name: 'cactus',
    palette: {
      f: '#f3a9bf', // flower
      k: '#3f7d58',
      g: '#62a877',
      l: '#9fd49a',
      o: OUTLINE,
      p: '#d4876a',
    },
    rows: [
      '....f....',
      '...kgk...',
      '..kglgk..',
      '..kglgk..',
      '..kglgk..',
      '.ooooooo.',
      '.opppppo.',
      '..opppo..',
      '..ooooo..',
    ],
  },

  // ---- Pet icons, drawn above pets in the room ----

  // A thought bubble; one of the need icons below is drawn inside it.
  bubble: {
    name: 'bubble',
    palette: { o: OUTLINE, w: '#fbf7ff' },
    rows: [
      '.ooooooo.',
      'owwwwwwwo',
      'owwwwwwwo',
      'owwwwwwwo',
      'owwwwwwwo',
      '.ooooooo.',
      '..oo.....',
      '..o......',
    ],
  },

  needFood: {
    name: 'needFood',
    palette: { c: '#e6a85a', b: '#6f8fc4' },
    rows: ['.c.c.', 'bbbbb', '.bbb.', '.....'],
  },

  needLove: {
    name: 'needLove',
    palette: { p: '#e8708c' },
    rows: ['.p.p.', 'ppppp', '.ppp.', '..p..'],
  },

  needEnergy: {
    name: 'needEnergy',
    palette: { z: '#6f8fc4' },
    rows: ['zzzz.', '..z..', '.z...', 'zzzz.'],
  },

  // Floats up from a sleeping pet.
  sleepZ: {
    name: 'sleepZ',
    palette: { z: '#e9e1ff' },
    rows: ['zzz', '.z.', 'zzz'],
  },

  // Pops up after you feed or play with a pet.
  heart: {
    name: 'heart',
    palette: { p: '#ff8fb1', o: '#b84a6a' },
    rows: ['.p.p.', 'ppppp', 'ppppp', '.ppp.', '..p..'],
  },

  mug: {
    name: 'mug',
    palette: {
      o: OUTLINE,
      c: '#7a4e3a', // cocoa
      h: '#f9cfd9', // highlight
      m: '#e89fb4', // mug
    },
    rows: [
      'oooooo..',
      'occcco..',
      'ohmmmooo',
      'ohmmmo.o',
      'ohmmmo.o',
      'ohmmmooo',
      '.oooo...',
    ],
  },
};
