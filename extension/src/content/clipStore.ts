import { useSyncExternalStore } from "react";

export type ClipOffset = 5 | 15 | 30;

export interface ClipState {
  offset: ClipOffset | null;
  lockedStart: number | null;
  lockedEnd: number | null;
}

const INITIAL: ClipState = {
  offset: null,
  lockedStart: null,
  lockedEnd: null,
};

let state: ClipState = INITIAL;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function getClipState(): ClipState {
  return state;
}

export function setClipState(patch: Partial<ClipState>) {
  state = { ...state, ...patch };
  notify();
}

export function subscribeClipState(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function resetClipState() {
  state = INITIAL;
  notify();
}

export function useClipState(): ClipState {
  return useSyncExternalStore(subscribeClipState, getClipState, getClipState);
}

export function clipSetOffset(o: ClipOffset | null) {
  setClipState({ offset: o });
}

export function clipMarkStart(time: number) {
  setClipState({ offset: null, lockedStart: time });
}

export function clipMarkEnd(time: number) {
  setClipState({ offset: null, lockedEnd: time });
}
