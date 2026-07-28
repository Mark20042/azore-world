import { animate, createTimeline } from 'animejs';
function convertEase(easing: unknown): unknown {
  if (typeof easing !== 'string') return easing;
  return easing
    .replace(/^ease(?=[A-Z])/, '')
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
function convertParams(params: Record<string, any>): Record<string, any> {
  const { easing, begin, update, complete, ...rest } = params;
  const converted: Record<string, any> = { ...rest };
  if (easing !== undefined) converted.ease = convertEase(easing);
  if (begin) converted.onBegin = begin;
  if (update) converted.onUpdate = update;
  if (complete) converted.onComplete = complete;
  return converted;
}
interface LegacyAnimeParams {
  targets?: unknown;
  [key: string]: any;
}
interface LegacyAnimeInstance {
  play(): void;
  pause(): void;
  restart(): void;
  finished?: Promise<unknown>;
}
interface LegacyTimeline {
  add(params: LegacyAnimeParams, position?: number | string): LegacyTimeline;
  play(): LegacyTimeline;
  pause(): LegacyTimeline;
  restart(): LegacyTimeline;
}
interface LegacyAnime {
  (params: LegacyAnimeParams): LegacyAnimeInstance;
  timeline(params?: LegacyAnimeParams): LegacyTimeline;
}
const anime = ((params: LegacyAnimeParams): LegacyAnimeInstance => {
  const { targets, ...rest } = params;
  return animate(targets as any, convertParams(rest) as any) as any;
}) as LegacyAnime;
anime.timeline = (params: LegacyAnimeParams = {}) => {
  const tl = createTimeline(convertParams(params) as any);
  const api: LegacyTimeline = {
    add(animParams: LegacyAnimeParams, position?: number | string) {
      const { targets, ...rest } = animParams;
      tl.add(targets as any, convertParams(rest) as any, position as any);
      return api;
    },
    play() { tl.play(); return api; },
    pause() { tl.pause(); return api; },
    restart() { tl.restart(); return api; }
  };
  return api;
};
export default anime;
