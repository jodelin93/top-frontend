import { describe, expect, it } from 'vitest';
import { panelPlacement } from './notification-bell';

describe('panelPlacement', () => {
  it('opens under the bell, to its right in the sidebar', () => {
    expect(panelPlacement({ left: 180, right: 212, bottom: 52 }, { width: 1280, height: 800 }, 'left')).toEqual({
      top: 60,
      left: 180,
      width: 320,
      maxHeight: 732,
    });
  });

  it('stays on a phone screen, narrower than the panel', () => {
    const place = panelPlacement({ left: 250, right: 290, bottom: 48 }, { width: 300, height: 700 }, 'right');
    expect(place.width).toBe(284);
    expect(place.left).toBe(8);
    expect(place.left + place.width).toBe(292);
  });

  it('never runs past the right edge', () => {
    const place = panelPlacement({ left: 1200, right: 1232, bottom: 40 }, { width: 1280, height: 800 }, 'left');
    expect(place.left + place.width).toBe(1272);
  });
});
