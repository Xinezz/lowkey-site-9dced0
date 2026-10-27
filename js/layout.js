// Room geometry, in art pixels. The room is 640×360: twice the width and
// height of the first version, so there's room for much finer detail. It
// scales to a 1080p screen at exactly 3× and to 1440p at 4×. Both the
// renderer and the item catalogue use these numbers. The file uses no
// browser APIs, so the unit tests can import it too.

export const ROOM_W = 640;
export const ROOM_H = 360;

// Collectibles were drawn for the smaller room, so they're shown twice as big.
export const ITEM_SCALE = 2;

export const CEILING_Y = 26; // the bottom of the ceiling beam
export const FLOOR_Y = 292; // where the back wall meets the floor

// The big window, three panes across and two down.
export const GLASS = Object.freeze({ x: 176, y: 64, w: 264, h: 144 });
export const MULLION_XS = Object.freeze([261, 350]); // left edges of the two upright bars (4 px wide)
export const MULLION_Y = 132; // the cross bar (4 px tall)
export const PANES = Object.freeze([
  { x: 176, y: 64, w: 85, h: 68 },
  { x: 265, y: 64, w: 85, h: 68 },
  { x: 354, y: 64, w: 86, h: 68 },
  { x: 176, y: 136, w: 85, h: 72 },
  { x: 265, y: 136, w: 85, h: 72 },
  { x: 354, y: 136, w: 86, h: 72 },
]);
export const BLINDS_BOTTOM = 84; // the rolled-up blinds cover the top of the glass down to here
export const SILL_Y = 216; // the windowsill's top
export const ROD_Y = 46; // the curtain rod

// The desk stands under the window.
export const DESK = Object.freeze({ x: 186, top: 236, w: 268, legBottom: 302 });
export const DESK_SURFACE_Y = 240; // where objects on the desk stand
export const DESK_LAMP = Object.freeze({ base: [208, 240], elbow: [196, 196], head: [232, 182] });
export const MONITOR = Object.freeze({ x: 330, y: 170, w: 84, h: 52 }); // the screen
export const PENDANTS = Object.freeze([{ x: 152, y: 92 }, { x: 612, y: 92 }]); // hanging lamps (the glass globe's centre)
export const BOOKSHELF = Object.freeze({ x: 16, y: 72, w: 108, shelves: [112, 154, 196, 238, 280] });
export const BED = Object.freeze({ x: 478, top: 268, front: 298, bottom: 334 });
export const WALL_SHELF = Object.freeze({ x: 470, y: 146, w: 160 }); // a floating shelf above the bed

// The desk chair, seen from behind. Its back is low enough that a buddy
// sitting on it shows their head and shoulders above it.
export const CHAIR = Object.freeze({ cx: 282, backTop: 252, seatY: 284, floorY: 336 });

/**
 * Where the study buddy walks to. `x` is the left edge of the buddy and
 * `y` is where their feet touch the floor (which also decides who is drawn
 * in front of whom).
 */
export const BUDDY_SPOTS = Object.freeze({
  door: { x: -50, y: 332 }, // just past the left edge of the room
  desk: { x: 262, y: 332 }, // beside the chair, ready to sit down
  relax: { x: 150, y: 322 }, // by the window
});

/**
 * Places where a decoration can go. Every item has a `slot` type (see
 * items.js) and can stand in any spot of that type, one item per spot.
 *
 *   type    which items fit here
 *   x, w    the spot's left edge and width; items are centred inside it
 *   y       the surface an item rests on (its bottom row lands there), or,
 *           for spots with anchor: 'top', the point it hangs from
 *   layer   when it is drawn: a cat on the bed must be drawn after the bed
 *           so it appears in front of it
 *   label   how the spot is described to the player
 *
 * The ids are the same as in the first, smaller room, so old saves keep
 * every decoration where it was.
 */
export const SPOTS = Object.freeze({
  wallLeft: { type: 'wallTall', x: 478, y: 112, w: 36, layer: 'wall', label: 'Wall above the bed' },
  wallDesk: { type: 'wallWide', x: 530, y: 112, w: 64, layer: 'wall', label: 'Wall above the bed, right' },
  wallHigh: { type: 'banner', x: 12, y: 68, w: 116, layer: 'wall', label: 'Above the bookshelf' },
  windowPane: { type: 'window', x: 284, y: BLINDS_BOTTOM + 2, w: 48, anchor: 'top', layer: 'window', label: 'On the window' },
  rodLeft: { type: 'hanging', x: 188, y: ROD_Y + 4, w: 26, anchor: 'top', layer: 'window', label: 'Curtain rod, left' },
  rodRight: { type: 'hanging', x: 450, y: ROD_Y + 4, w: 26, anchor: 'top', layer: 'window', label: 'Curtain rod, right' },
  rodPerch: { type: 'perch', x: 476, y: ROD_Y, w: 16, layer: 'window', label: 'On the curtain rod' },
  sillLeft: { type: 'sill', x: 186, y: SILL_Y, w: 36, layer: 'window', label: 'Windowsill, left' },
  sillMiddle: { type: 'sill', x: 228, y: SILL_Y, w: 36, layer: 'window', label: 'Windowsill, middle' },
  sillRight: { type: 'sill', x: 404, y: SILL_Y, w: 36, layer: 'window', label: 'Windowsill, right' },
  shelfGap: { type: 'shelf', x: 596, y: WALL_SHELF.y, w: 32, layer: 'shelf', label: 'Shelf above the bed' },
  shelfTop: { type: 'shelf', x: 34, y: BOOKSHELF.y, w: 36, layer: 'shelf', label: 'Top of the bookshelf' },
  deskLeft: { type: 'desk', x: 238, y: DESK_SURFACE_Y, w: 28, layer: 'desk', label: 'Desk, by the lamp' },
  deskRight: { type: 'desk', x: 300, y: DESK_SURFACE_Y, w: 26, layer: 'desk', label: 'Desk, by the monitor' },
  deskBooks: { type: 'desk', x: 418, y: DESK_SURFACE_Y - 16, w: 30, layer: 'desk', label: 'Desk, on the books' },
  floorLeft: { type: 'floor', x: 150, y: 322, w: 44, layer: 'floor', label: 'Floor, by the bookshelf' },
  floorMiddle: { type: 'floor', x: 432, y: 326, w: 44, layer: 'floor', label: 'Floor, by the bed' },
  floorFront: { type: 'floor', x: 46, y: 356, w: 44, layer: 'floor', label: 'Floor, front corner' },
  floorCorner: { type: 'floorTall', x: 128, y: 300, w: 22, layer: 'floor', label: 'Floor, beside the window' },
  rugLeft: { type: 'rug', x: 500, y: 280, w: 40, layer: 'bed', label: 'On the bed' },
  rugRight: { type: 'rug', x: 196, y: 346, w: 40, layer: 'floor', label: 'On the rug' },
});

/** Where each spot type is, in a word or two, for the shop ("Goes on: Desk"). */
export const SLOT_NAMES = Object.freeze({
  wallTall: 'Wall',
  wallWide: 'Wall',
  banner: 'High on the wall',
  window: 'Window',
  hanging: 'Curtain rod',
  perch: 'Curtain rod',
  sill: 'Windowsill',
  shelf: 'Shelf',
  desk: 'Desk',
  floor: 'Floor',
  floorTall: 'Floor corner',
  rug: 'Bed or rug',
});
