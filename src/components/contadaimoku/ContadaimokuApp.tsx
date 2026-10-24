"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CachedTimerState,
  clearCachedTimer,
  fetchProgress,
  loadCachedProgress,
  loadCachedTimer,
  progressHeaders,
  randomSecret,
  requestProof,
  saveCachedProgress,
  saveCachedTimer,
  sha256Hex,
  timerRemainingMs,
} from "@/lib/contadaimoku/client";
import { formatCount, formatDaimoku, formatTimer } from "@/lib/contadaimoku/format";
import type { DayEntry, Progress } from "@/lib/contadaimoku/types";
import { courseNapoli2026 } from "@/lib/course";
import { CourseCountdown } from "@/components/totem/CourseCountdown";
import { KamakuraKyotoJourney } from "@/components/totem/KamakuraKyotoJourney";
import { TotemHero } from "@/components/totem/TotemHero";

const QUICK_MINUTES = [5, 10, 15, 30, 60];

type TimerState = CachedTimerState;

const emptyProgress: Progress = { minutes: 0, shakubuku: 0, super: 0, updatedAt: 0 };

export function ContadaimokuApp() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [minutesChoice, setMinutesChoice] = useState(60);
  const [customMinutes, setCustomMinutes] = useState(false);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);

  const applySnapshot = useCallback((p: Progress, d: DayEntry[]) => {
    setProgress(p);
    saveCachedProgress({ progress: p, days: d, savedAt: Date.now() });
  }, []);

  useEffect(() => {
    const cached = loadCachedProgress();
    if (cached) setProgress(cached.progress);
    const cachedTimer = loadCachedTimer();
    if (cachedTimer) {
      setTimer(cachedTimer);
      if (timerRemainingMs(cachedTimer) > 0) {
        setStatus("Sessione ripristinata.");
      }
    }
    fetchProgress()
      .then(({ progress: p, days: d }) => applySnapshot(p, d))
      .catch(() => setStatus("Impossibile aggiornare i dati. Riprova più tardi."));
  }, [applySnapshot]);

  useEffect(() => {
    saveCachedTimer(timer);
  }, [timer]);

  useEffect(() => {
    const refresh = () => {
      fetchProgress()
        .then(({ progress: p, days: d }) => applySnapshot(p, d))
        .catch(() => {});
    };
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [applySnapshot]);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timerStarting = Boolean(timer && !timer.confirmed);

  const remainingMs = useMemo(() => {
    if (!timer) return 0;
    if (timer.pausedAt !== undefined) return timer.pausedRemainingMs ?? 0;
    if (!now) return timer.minutes * 60_000;
    return Math.max(0, timer.completesAt - now);
  }, [timer, now]);

  const mailtoHref = `mailto:${courseNapoli2026.secretariatEmail}?subject=${encodeURIComponent(courseNapoli2026.mailtoSubject)}`;

  async function cancelTimer() {
    if (!timer?.confirmed) {
      setTimer(null);
      clearCachedTimer();
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: progressHeaders(),
        body: JSON.stringify({
          action: "timer:cancel",
          sessionId: timer.id,
          secret: timer.secret,
        }),
      });
      setTimer(null);
      clearCachedTimer();
      setStatus("Timer annullato. Nessun contributo è stato salvato.");
    } catch {
      setStatus("Annullamento non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function startTimer() {
    const minutes = Math.max(1, Math.min(720, Math.round(minutesChoice)));
    setBusy(true);
    setStatus("");
    const session: TimerState = {
      id: crypto.randomUUID(),
      secret: randomSecret(),
      minutes,
      startedAt: Date.now(),
      completesAt: Date.now() + minutes * 60_000,
      confirmed: false,
    };
    setTimer(session);
    try {
      const proof = await requestProof("timer:start", minutes);
      const secretHash = await sha256Hex(session.secret);
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: progressHeaders(),
        body: JSON.stringify({
          action: "timer:start",
          sessionId: session.id,
          durationMinutes: minutes,
          secretHash,
          proofToken: proof.token,
          proofSolution: proof.solution,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.timer?.startedAt) {
        throw new Error(json.error ?? "Avvio non confermato");
      }
      setTimer({
        ...session,
        confirmed: true,
        startedAt: json.timer.startedAt * 1000,
        completesAt: json.timer.endsAt * 1000,
      });
      setStatus("Sessione attiva. Puoi bloccare lo schermo.");
    } catch (error) {
      setTimer(null);
      clearCachedTimer();
      setStatus(error instanceof Error ? error.message : "Avvio non confermato");
    } finally {
      setBusy(false);
    }
  }

  async function completeTimer(early = false) {
    if (!timer) return;
    setBusy(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: progressHeaders(),
        body: JSON.stringify({
          action: "timer:complete",
          sessionId: timer.id,
          secret: timer.secret,
          stopEarly: early,
          ...(early
            ? {
                countedMinutes: Math.max(
                  1,
                  Math.min(timer.minutes, timer.minutes - Math.ceil(remainingMs / 60_000)),
                ),
              }
            : {}),
        }),
      });
      const json = await response.json();
      if (response.status === 409) {
        clearCachedTimer();
        setTimer(null);
        const refreshed = await fetchProgress().catch(() => null);
        if (refreshed) applySnapshot(refreshed.progress, refreshed.days);
        setStatus("Sessione già registrata.");
        return;
      }
      if (!response.ok || !json.progress) throw new Error(json.error ?? "Completamento non registrato");
      applySnapshot(json.progress, json.days);
      setTimer(null);
      clearCachedTimer();
      setStatus(
        `${formatCount(json.timer.countedMinutes)} minuti completati · ${formatDaimoku(json.timer.countedMinutes)} aggiunti al totale.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Completamento non registrato");
    } finally {
      setBusy(false);
    }
  }

  async function registerManual() {
    const minutes = Math.max(1, Math.min(720, Math.round(minutesChoice)));
    setRegistering(true);
    setBusy(true);
    setStatus("");
    try {
      const id = crypto.randomUUID();
      const secret = randomSecret();
      const proof = await requestProof("timer:start", minutes);
      const secretHash = await sha256Hex(secret);
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: progressHeaders(),
        body: JSON.stringify({
          action: "timer:manual",
          sessionId: id,
          minutes,
          secretHash,
          proofToken: proof.token,
          proofSolution: proof.solution,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.progress) throw new Error(json.error ?? "Minuti non registrati");
      applySnapshot(json.progress, json.days);
      setStatus(`${formatCount(minutes)} minuti registrati · ${formatDaimoku(minutes)} aggiunti.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Minuti non registrati");
    } finally {
      setBusy(false);
      setRegistering(false);
    }
  }

  useEffect(() => {
    if (timer?.confirmed && remainingMs === 0 && now > 0 && !busy) {
      void completeTimer(false);
    }
  }, [timer, remainingMs, busy, now]);

  return (
    <div className="wave-page">
      <button
        type="button"
        className="wave-info-btn wave-info-btn--floating"
        onClick={() => setShowPrivacy(true)}
        aria-label="Privacy e funzionamento"
      >
        !
      </button>

      <TotemHero />

      <main className="wave-main">
        <CourseCountdown />
        <KamakuraKyotoJourney />

        <article className="wave-panel text-center">
          <p className="wave-eyebrow">Totale collettivo</p>
          <p className="wave-stat">{formatDaimoku(progress.minutes)}</p>
        </article>

        <article className="wave-panel wave-panel--duo">
          <p className="wave-eyebrow">Segreteria corso</p>
          <h2 className="wave-title">Hai bisogno di informazioni?</h2>
          <p className="mt-2 text-sm leading-relaxed wave-muted">
            Per domande su iscrizioni, logistica e programma, scrivi alla segreteria del corso.
          </p>
          <a className="wave-contact" href={mailtoHref}>
            {courseNapoli2026.secretariatEmail}
          </a>
        </article>

        <article className="wave-panel wave-panel--duo">
          <p className="wave-eyebrow">Il primo passo</p>
          <h2 className="wave-title">Comincia dal Daimoku</h2>
          <p className="mt-2 text-sm leading-relaxed wave-muted">
            Una preghiera sincera trasforma la tua vita e può diventare speranza per un’altra persona.
          </p>
          <blockquote className="wave-blockquote">
            «La chiave è un daimoku costante.»
            <cite>
              La nuova rivoluzione umana · vol. 23 · cap. “Lotta intrepida” · p. 300
            </cite>
          </blockquote>
        </article>

        <article id="pratica" className="wave-panel wave-panel--flat">
          {!timer ? (
            <>
              <h3 className="wave-title text-xl">Quanto vuoi recitare?</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`wave-chip ${!customMinutes && minutesChoice === m ? "wave-chip--active" : ""}`}
                    onClick={() => {
                      setMinutesChoice(m);
                      setCustomMinutes(false);
                    }}
                  >
                    {m} min
                  </button>
                ))}
                <button
                  type="button"
                  className={`wave-chip ${customMinutes ? "wave-chip--active" : ""}`}
                  onClick={() => setCustomMinutes(true)}
                >
                  Altro
                </button>
              </div>
              {customMinutes && (
                <label className="mt-4 block text-sm font-semibold">
                  Minuti
                  <input
                    type="number"
                    min={1}
                    max={720}
                    className="wave-input"
                    value={minutesChoice}
                    onChange={(e) => setMinutesChoice(Number(e.target.value) || 0)}
                  />
                </label>
              )}
              <p className="mt-4 font-semibold">
                {formatCount(minutesChoice)} minuti · <strong>≈ {formatDaimoku(minutesChoice)}</strong>
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startTimer()}
                  className="wave-btn wave-btn--primary"
                  aria-busy={busy}
                >
                  {busy && !registering ? "Avvio in corso…" : "Avvia il timer"}
                </button>
                <button
                  type="button"
                  disabled={busy || minutesChoice < 1}
                  onClick={() => void registerManual()}
                  className="wave-btn wave-btn--secondary"
                  aria-busy={busy}
                >
                  {registering ? "Registrazione…" : "Registra minuti già svolti"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="wave-eyebrow">Timer Daimoku</p>
              <p className={`wave-stat mt-2${timerStarting ? " wave-stat--syncing" : ""}`} aria-live="polite">
                {formatTimer(remainingMs)}
              </p>
              {timerStarting && (
                <p className="wave-timer-preparing mt-2" role="status">
                  <span className="wave-spinner" aria-hidden />
                  Sincronizzazione con il server…
                </p>
              )}
              <p className="mt-2 text-sm wave-muted">
                {timer.minutes} minuti · {formatDaimoku(timer.minutes)}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {timer.confirmed && remainingMs > 0 && (
                  <>
                    <button
                      type="button"
                      className="wave-btn wave-btn--secondary"
                      onClick={() => {
                        if (timer.pausedAt) {
                          const resumeAt = Date.now();
                          setTimer({
                            ...timer,
                            pausedAt: undefined,
                            pausedRemainingMs: undefined,
                            completesAt: resumeAt + (timer.pausedRemainingMs ?? 0),
                          });
                        } else {
                          setTimer({
                            ...timer,
                            pausedAt: Date.now(),
                            pausedRemainingMs: remainingMs,
                          });
                        }
                      }}
                    >
                      {timer.pausedAt ? "Riprendi" : "Pausa"}
                    </button>
                    {remainingMs < 60_000 && (
                      <button
                        type="button"
                        className="wave-btn wave-btn--primary"
                        disabled={busy}
                        onClick={() => void completeTimer(true)}
                      >
                        Termina
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  className="wave-btn wave-btn--ghost"
                  disabled={busy && timer.confirmed}
                  onClick={() => void cancelTimer()}
                >
                  {timerStarting ? "Interrompi" : "Annulla"}
                </button>
              </div>
            </div>
          )}
          {status && (
            <p className="wave-status" role="status">
              {status}
            </p>
          )}
        </article>
      </main>

      <footer className="wave-footer">
        <div className="wave-footer__waves" aria-hidden>
          <svg viewBox="0 0 400 16" preserveAspectRatio="none">
            <path
              fill="var(--wave-ink)"
              d="M0 10 C 50 0, 100 14, 150 6 S 250 0, 300 8 S 370 14, 400 6 L 400 16 L 0 16 Z"
            />
          </svg>
        </div>
        <p>{courseNapoli2026.venue} · Salerno</p>
        <p className="mt-2">Ogni persona è preziosa. Ogni passo conta.</p>
        <p className="mt-2">
          <a className="wave-contact" href={mailtoHref}>Segreteria</a>
        </p>
      </footer>

      {showPrivacy && (
        <div className="wave-modal-backdrop" role="dialog" aria-modal="true">
          <div className="wave-panel wave-modal">
            <h2 className="wave-title">Privacy e funzionamento</h2>
            <p className="mt-3 text-sm wave-muted">
              Il contatore è anonimo: non raccogliamo nomi né classifiche. Ogni contributo Daimoku si somma al totale
              collettivo in modo permanente.
            </p>
            <button type="button" className="wave-btn wave-btn--primary mt-6 w-full" onClick={() => setShowPrivacy(false)}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
