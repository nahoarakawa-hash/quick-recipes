/**
 * 簡易タイマー基盤。
 * 第一版は「分数タップ → カウントダウン」。
 * 後で複数同時タイマー・プリセット・通知強化に差し替えやすいよう Engine を分離。
 */

export type TimerState = {
  id: string;
  label: string;
  durationSec: number;
  remainingSec: number;
  running: boolean;
  endsAt: number | null;
  alarming: boolean;
  recipeId: string;
  stepOrder: number;
};

export type DurationMatch = {
  label: string;
  durationSec: number;
  start: number;
  end: number;
};

/** 「5分」「30秒」「1時間」などを検出 */
export function findDurationsInText(text: string): DurationMatch[] {
  const matches: DurationMatch[] = [];
  const re =
    /(\d+(?:\.\d+)?)\s*(時間|時|分|秒)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = Number(m[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const unit = m[2];
    let durationSec = 0;
    if (unit === "時間" || unit === "時") durationSec = Math.round(value * 3600);
    else if (unit === "分") durationSec = Math.round(value * 60);
    else durationSec = Math.round(value);
    matches.push({
      label: m[0],
      durationSec,
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return matches;
}

export function formatRemaining(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function createTimerId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTimer(
  label: string,
  durationSec: number,
  meta: { recipeId: string; stepOrder: number },
): TimerState {
  const now = Date.now();
  return {
    id: createTimerId(),
    label,
    durationSec,
    remainingSec: durationSec,
    running: true,
    endsAt: now + durationSec * 1000,
    alarming: false,
    recipeId: meta.recipeId,
    stepOrder: meta.stepOrder,
  };
}

export function tickTimer(timer: TimerState, now = Date.now()): TimerState {
  if (!timer.running || timer.endsAt == null) return timer;
  const remaining = Math.max(0, (timer.endsAt - now) / 1000);
  if (remaining <= 0) {
    return {
      ...timer,
      remainingSec: 0,
      running: false,
      endsAt: null,
      alarming: true,
    };
  }
  return { ...timer, remainingSec: remaining };
}

export function timersNeedPaint(prev: TimerState[], next: TimerState[]): boolean {
  if (prev.length !== next.length) return true;
  return next.some((timer, index) => {
    const before = prev[index];
    return (
      timer.running !== before.running ||
      timer.alarming !== before.alarming ||
      Math.ceil(timer.remainingSec) !== Math.ceil(before.remainingSec)
    );
  });
}

export function silenceTimer(timer: TimerState): TimerState {
  return { ...timer, alarming: false, running: false, endsAt: null };
}

export function extendTimer(timer: TimerState, minutes: number): TimerState {
  const addSec = Math.round(minutes) * 60;
  if (addSec <= 0) return timer;
  const current = timer.running ? tickTimer(timer) : timer;
  const remaining = Math.max(0, current.remainingSec) + addSec;
  const now = Date.now();
  return {
    ...current,
    durationSec: remaining,
    remainingSec: remaining,
    running: true,
    endsAt: now + remaining * 1000,
    alarming: false,
  };
}

export function pauseTimer(timer: TimerState): TimerState {
  const ticked = tickTimer(timer);
  return {
    ...ticked,
    durationSec: ticked.remainingSec,
    remainingSec: ticked.remainingSec,
    running: false,
    endsAt: null,
  };
}

export function resumeTimer(timer: TimerState): TimerState {
  if (timer.remainingSec <= 0) return timer;
  const now = Date.now();
  return {
    ...timer,
    durationSec: timer.remainingSec,
    remainingSec: timer.remainingSec,
    running: true,
    endsAt: now + timer.remainingSec * 1000,
    alarming: false,
  };
}
