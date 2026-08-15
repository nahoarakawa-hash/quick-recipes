"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { loadCookSession, toggleRecipeInSession } from "@/lib/cook-session";
import {
  createTimer,
  extendTimer,
  findDurationsInText,
  formatRemaining,
  pauseTimer,
  resumeTimer,
  silenceTimer,
  tickTimer,
  timersNeedPaint,
  type TimerState,
} from "@/lib/timer";
import type { Recipe } from "@/lib/types";
import { GoldStars } from "@/components/GoldStars";

type Props = {
  recipesById: Record<string, Recipe>;
  initialRecipeId?: string;
};

function getAudioContext() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctx();
}

function playBeep(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.12;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  osc.stop(ctx.currentTime + 0.4);
}

function StepText({
  text,
  onStartTimer,
}: {
  text: string;
  onStartTimer: (label: string, durationSec: number) => void;
}) {
  const matches = findDurationsInText(text);
  if (matches.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, i) => {
    if (match.start > cursor) {
      parts.push(<Fragment key={`t-${i}`}>{text.slice(cursor, match.start)}</Fragment>);
    }
    parts.push(
      <button
        key={`m-${i}`}
        type="button"
        className="mx-0.5 inline-flex touch-manipulation rounded-md bg-cook-accent/20 px-1.5 py-0.5 font-semibold text-cook-accent underline decoration-cook-accent/40 underline-offset-2"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onStartTimer(match.label, match.durationSec);
        }}
      >
        {match.label}
      </button>,
    );
    cursor = match.end;
  });
  if (cursor < text.length) {
    parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }
  return <>{parts}</>;
}

function ExtendKeypad({
  label,
  onConfirm,
  onClose,
}: {
  label: string;
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState("");
  const minutes = Number(digits);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消す", "0", "決定"];

  function press(key: string) {
    if (key === "消す") {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "決定") {
      if (Number.isInteger(minutes) && minutes >= 1) onConfirm(minutes);
      return;
    }
    setDigits((prev) => {
      const next = `${prev}${key}`.replace(/^0+/, "") || (key === "0" ? "" : key);
      return next.slice(0, 3);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <p className="text-xs font-bold tracking-[0.14em] text-cook-ink/50">延長（分）</p>
        <p className="mt-1 text-sm text-cook-ink/60">{label}</p>
        <p className="my-3 font-mono text-5xl font-bold tracking-wide text-cook-ink">
          {digits || "0"}
          <span className="ml-1 text-xl font-semibold text-cook-ink/45">分</span>
        </p>
        <div className="cook-keypad">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              disabled={key === "決定" && !(Number.isInteger(minutes) && minutes >= 1)}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary mt-3 w-full" onClick={onClose}>
          やめる
        </button>
      </div>
    </div>
  );
}

function StepTimerChip({
  timer,
  onToggle,
  onExtend,
  onRemove,
}: {
  timer: TimerState;
  onToggle: () => void;
  onExtend: () => void;
  onRemove: () => void;
}) {
  const ended = timer.remainingSec <= 0;
  const timeClass = timer.alarming
    ? "cook-timer-time is-alarming"
    : ended
      ? "cook-timer-time is-ended"
      : timer.running
        ? "cook-timer-time"
        : "cook-timer-time is-paused";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="min-w-[4.8rem] rounded-lg px-1.5 py-1 text-right"
        onClick={onToggle}
        aria-label={
          timer.alarming
            ? `${timer.label}のアラームを止める`
            : timer.running
              ? `${timer.label}を一時停止`
              : ended
                ? `${timer.label}は終了`
                : `${timer.label}を再開`
        }
      >
        <span className={timeClass}>
          {timer.alarming ? "終了 " : ""}
          {formatRemaining(timer.remainingSec)}
        </span>
        {!timer.running && !ended && !timer.alarming ? (
          <span className="mt-0.5 block text-[0.65rem] font-bold text-cook-ink/45">停止</span>
        ) : null}
      </button>
      <button
        type="button"
        className="btn btn-secondary min-h-8 px-2 text-xs"
        onClick={onExtend}
      >
        延長
      </button>
      <button
        type="button"
        className="btn btn-secondary min-h-8 px-2 text-xs"
        onClick={onRemove}
        aria-label={`${timer.label}のタイマーを消す`}
      >
        ×
      </button>
    </div>
  );
}

export function CookMode({ recipesById, initialRecipeId }: Props) {
  const [ids, setIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialRecipeId ?? null);
  const [timers, setTimers] = useState<TimerState[]>([]);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});
  const [extendId, setExtendId] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timersRef = useRef<TimerState[]>([]);
  const lastBeepRef = useRef(0);
  timersRef.current = timers;

  function ensureAudio() {
    if (!audioRef.current) audioRef.current = getAudioContext();
    void audioRef.current.resume();
    return audioRef.current;
  }

  async function requestWakeLock() {
    try {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      /* unsupported or battery saver */
    }
  }

  useEffect(() => {
    const sync = () => {
      let sessionIds = loadCookSession().recipeIds.filter((id) => recipesById[id]);
      if (
        initialRecipeId &&
        recipesById[initialRecipeId] &&
        !sessionIds.includes(initialRecipeId)
      ) {
        sessionIds = toggleRecipeInSession(initialRecipeId).recipeIds.filter(
          (id) => recipesById[id],
        );
      }
      setIds(sessionIds);
      setActiveId((current) => {
        if (current && sessionIds.includes(current)) return current;
        if (initialRecipeId && sessionIds.includes(initialRecipeId)) return initialRecipeId;
        return sessionIds[0] ?? null;
      });
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cook-session-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cook-session-change", sync);
    };
  }, [recipesById, initialRecipeId]);

  const timersLive = timers.some((timer) => timer.running || timer.alarming);

  useEffect(() => {
    void requestWakeLock();
    const onVis = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void wakeLockRef.current?.release();
    };
  }, []);

  useEffect(() => {
    if (!timersLive) return;

    let cancelled = false;
    let timeoutId = 0;
    let worker: Worker | null = null;
    let workerUrl: string | null = null;

    const paint = (now = Date.now()) => {
      let alarming = false;
      setTimers((prev) => {
        const next = prev.map((timer) => tickTimer(timer, now));
        alarming = next.some((timer) => timer.alarming);
        return timersNeedPaint(prev, next) ? next : prev;
      });
      if (alarming && now - lastBeepRef.current > 800) {
        lastBeepRef.current = now;
        try {
          playBeep(ensureAudio());
        } catch {
          /* ignore */
        }
      }
    };

    const scheduleTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        paint();
        if (timersRef.current.some((timer) => timer.running || timer.alarming)) {
          scheduleTimeout();
        }
      }, 200);
    };

    try {
      workerUrl = URL.createObjectURL(
        new Blob(["setInterval(() => postMessage(Date.now()), 200)"], {
          type: "application/javascript",
        }),
      );
      worker = new Worker(workerUrl);
      worker.onmessage = (event: MessageEvent<number>) => {
        if (!cancelled) paint(event.data);
      };
    } catch {
      scheduleTimeout();
    }

    const catchUp = () => {
      if (document.visibilityState !== "visible") return;
      paint();
      void requestWakeLock();
      if (!worker) scheduleTimeout();
    };

    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("pageshow", catchUp);
    window.addEventListener("focus", catchUp);

    paint();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("pageshow", catchUp);
      window.removeEventListener("focus", catchUp);
      worker?.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
    };
  }, [timersLive]);

  const active = activeId ? recipesById[activeId] : null;
  const extending = timers.find((timer) => timer.id === extendId) ?? null;

  const ordered = useMemo(
    () => ids.map((id) => recipesById[id]).filter((r): r is Recipe => Boolean(r)),
    [ids, recipesById],
  );

  const alarmingRecipeIds = useMemo(
    () => new Set(timers.filter((timer) => timer.alarming).map((timer) => timer.recipeId)),
    [timers],
  );

  function startTimer(
    recipeId: string,
    stepOrder: number,
    label: string,
    durationSec: number,
  ) {
    ensureAudio();
    void requestWakeLock();
    setTimers((prev) =>
      [createTimer(label, durationSec, { recipeId, stepOrder }), ...prev].slice(0, 5),
    );
  }

  function updateTimer(id: string, fn: (timer: TimerState) => TimerState) {
    setTimers((prev) => prev.map((timer) => (timer.id === id ? fn(timer) : timer)));
  }

  function onTimeTap(timer: TimerState) {
    if (timer.alarming) {
      updateTimer(timer.id, silenceTimer);
      return;
    }
    if (timer.remainingSec <= 0) return;
    updateTimer(timer.id, timer.running ? pauseTimer : resumeTimer);
  }

  if (ordered.length === 0) {
    return (
      <div className="cook-dusk fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-4 text-center text-cook-ink">
        <GoldStars />
        <p>今日セットが空です。目次から「今日に追加」してください。</p>
        <Link href="/" className="btn btn-secondary">
          目次へ
        </Link>
      </div>
    );
  }

  return (
    <div className="cook-dusk fixed inset-0 z-50 overflow-y-auto text-cook-ink">
      <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-4 pb-8 pt-4">
        <header className="mb-4">
          <GoldStars />
          <div className="flex items-center justify-between gap-3">
            <Link href="/today" className="text-sm font-semibold text-accent">
              ← 今日セット
            </Link>
            <p className="text-xs tracking-[0.16em] text-cook-gold">COOK MODE</p>
          </div>
        </header>

        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {ordered.map((recipe) => {
            const selected = recipe.id === activeId;
            const alarming = alarmingRecipeIds.has(recipe.id);
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => setActiveId(recipe.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  alarming
                    ? "border-2 border-rose bg-rose-soft !text-rose"
                    : selected
                      ? "border-2 border-gold bg-surface !text-ink"
                      : "border border-line bg-surface/90 !text-ink"
                }`}
              >
                {recipe.title}
                {alarming ? " 終了" : ""}
              </button>
            );
          })}
        </div>

        {active && (
          <article className="space-y-6">
            <div>
              <h1 className="border-b border-cook-gold/70 pb-2 text-3xl font-bold leading-tight tracking-wide">
                {active.title}
              </h1>
              {active.role_tag && (
                <p className="mt-1 text-sm text-cook-ink/55">{active.role_tag}</p>
              )}
            </div>

            {active.ingredients.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-bold tracking-[0.14em] text-cook-ink/50">
                  材料
                </h2>
                <ul className="space-y-1.5 text-lg leading-snug">
                  {active.ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-3 border-b border-line py-1.5">
                      <span className="min-w-0 flex-1 font-medium">{ing.name}</span>
                      <span className="shrink-0 text-cook-ink/75">{ing.amount}</span>
                      {ing.prep ? (
                        <span className="shrink-0 text-cook-ink/50">{ing.prep}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="mb-2 text-xs font-bold tracking-[0.14em] text-cook-ink/50">
                手順（分数タップでタイマー）
              </h2>
              <ol className="space-y-3">
                {active.steps.map((step) => {
                  const key = `${active.id}:${step.order}`;
                  const done = doneSteps[key];
                  const stepTimers = timers.filter(
                    (timer) => timer.recipeId === active.id && timer.stepOrder === step.order,
                  );
                  const stepAlarming = stepTimers.some((timer) => timer.alarming);
                  return (
                    <li key={key}>
                      <div
                        className={`rounded-2xl border px-4 py-4 transition ${
                          stepAlarming
                            ? "border-rose bg-rose-soft/70"
                            : done
                              ? "border-line bg-bg-deep/80 opacity-55"
                              : "border-line bg-surface"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() =>
                                setDoneSteps((prev) => ({ ...prev, [key]: !prev[key] }))
                              }
                              className="mb-2 flex items-center gap-2 text-left"
                            >
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cook-accent/20 text-sm font-bold text-cook-accent">
                                {step.order}
                              </span>
                              <span className="text-xs text-cook-ink/45">
                                {done ? "済・タップで戻す" : "タップで済"}
                              </span>
                            </button>
                            <p className="text-xl leading-relaxed">
                              <StepText
                                text={step.text}
                                onStartTimer={(label, durationSec) =>
                                  startTimer(active.id, step.order, label, durationSec)
                                }
                              />
                            </p>
                          </div>
                          {stepTimers.length > 0 && (
                            <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                              {stepTimers.map((timer) => (
                                <StepTimerChip
                                  key={timer.id}
                                  timer={timer}
                                  onToggle={() => onTimeTap(timer)}
                                  onExtend={() => setExtendId(timer.id)}
                                  onRemove={() =>
                                    setTimers((prev) => prev.filter((item) => item.id !== timer.id))
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {active.notes && (
              <section className="rounded-2xl border border-dashed border-line bg-surface/80 px-4 py-3">
                <h2 className="mb-1 text-xs font-bold tracking-[0.14em] text-cook-ink/50">
                  メモ
                </h2>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-cook-ink/80">
                  {active.notes}
                </p>
              </section>
            )}
          </article>
        )}
      </div>

      {extending && (
        <ExtendKeypad
          label={extending.label}
          onClose={() => setExtendId(null)}
          onConfirm={(minutes) => {
            updateTimer(extending.id, (timer) => extendTimer(timer, minutes));
            setExtendId(null);
          }}
        />
      )}
    </div>
  );
}
