import type { AIConnectionEvent } from '../types';
import { mergeEvents } from './data';
export interface FeedState {
  paused: boolean;
  visible: AIConnectionEvent[];
  pending: number;
}
export function updateFeed(state: FeedState, events: AIConnectionEvent[], org: string): FeedState {
  const current = mergeEvents([], events, org);
  if (!state.paused) return { paused: false, visible: current, pending: 0 };
  const ids = new Set(state.visible.map((e) => e.id));
  return { ...state, pending: current.filter((e) => !ids.has(e.id)).length };
}
export function pauseFeed(events: AIConnectionEvent[], org: string): FeedState {
  return { paused: true, visible: mergeEvents([], events, org), pending: 0 };
}
export function resumeFeed(events: AIConnectionEvent[], org: string): FeedState {
  return { paused: false, visible: mergeEvents([], events, org), pending: 0 };
}
