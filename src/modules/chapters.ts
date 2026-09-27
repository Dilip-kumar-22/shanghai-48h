import { byId } from '../lib/dom';

export interface ChapterUi {
  /** `index` is the chapter in view, or -1 before the first chapter. */
  setActive(index: number): void;
}

/** Film HUD text and journey-trail state (`is-active`, `is-done`, `aria-current`). */
export function initChapterUi(
  chapters: readonly HTMLElement[],
  links: readonly HTMLAnchorElement[],
): ChapterUi {
  const hud = { no: byId('hud-no'), place: byId('hud-place'), time: byId('hud-time') };
  const intro = {
    no: hud.no?.textContent ?? '',
    place: hud.place?.textContent ?? '',
    time: hud.time?.textContent ?? '',
  };
  let active: number | undefined;

  return {
    setActive(index) {
      if (index === active) return;
      active = index;
      const data = chapters[index]?.dataset;
      const text = data ? { no: data.no ?? '', place: data.place ?? '', time: data.time ?? '' } : intro;
      if (hud.no) hud.no.textContent = text.no;
      if (hud.place) hud.place.textContent = text.place;
      if (hud.time) hud.time.textContent = text.time;
      links.forEach((link, k) => {
        link.classList.toggle('is-active', k === index);
        link.classList.toggle('is-done', k < index);
        if (k === index) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    },
  };
}
