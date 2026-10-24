"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CAMPAIGN, DAIMOKU_PER_MINUTE, TRACKS, type TrackKind } from "@/lib/contadaimoku/config";
import {
  fetchProgress,
  loadCachedProgress,
  loadLastCorrection,
  progressHeaders,
  randomSecret,
  requestProof,
  saveCachedProgress,
  saveLastCorrection,
  sha256Hex,
  type LastCorrection,
} from "@/lib/contadaimoku/client";
import {
  campaignProgress,
  formatCount,
  formatDaimoku,
  formatMillionsDaimoku,
  formatTimer,
  milestoneLabel,
  trackValue,
} from "@/lib/contadaimoku/format";
import { completedStages, stageInfo, totalContributions } from "@/lib/contadaimoku/metrics";
import { MILESTONES } from "@/lib/contadaimoku/milestones";
import type { DayEntry, Progress } from "@/lib/contadaimoku/types";
import { CoastJourney } from "./CoastJourney";
import { TrendChart } from "./TrendChart";

const QUICK_MINUTES = [5, 10, 15, 30, 60];

type TimerState = {
  id: string;
  secret: string;
  minutes: number;
  startedAt: number;
  completesAt: number;
  confirmed: boolean;
  pausedAt?: number;
  pausedRemainingMs?: number;
};

const emptyProgress: Progress = { minutes: 0, shakubuku: 0, super: 0, updatedAt: 0 };

export function ContadaimokuApp() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [days, setDays] = useState<DayEntry[]>([]);
  const [minutesChoice, setMinutesChoice] = useState(60);
  const [customMinutes, setCustomMinutes] = useState(false);
  const [track, setTrack] = useState<TrackKind>("daimoku");
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [chartMetric, setChartMetric] = useState<"daimoku" | "shakubuku" | "super" | "contributi">("daimoku");
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [correction, setCorrection] = useState<LastCorrection | null>(null);
  const [correctionMinutes, setCorrectionMinutes] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const applySnapshot = useCallback((p: Progress, d: DayEntry[]) => {
    setProgress(p);
    setDays(d);
    saveCachedProgress({ progress: p, days: d, savedAt: Date.now() });
  }, []);

  useEffect(() => {
    const cached = loadCachedProgress();
    if (cached) {
      setProgress(cached.progress);
      setDays(cached.days);
    }
    setCorrection(loadLastCorrection());
    fetchProgress()
      .then(({ progress: p, days: d }) => applySnapshot(p, d))
      .catch(() => setStatus("Impossibile aggiornare i dati. Riprova più tardi."));
  }, [applySnapshot]);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!timer?.confirmed) return 0;
    if (timer.pausedAt !== undefined) return timer.pausedRemainingMs ?? 0;
    return Math.max(0, timer.completesAt - now);
  }, [timer, now]);

  const daimokuTotal = progress.minutes * DAIMOKU_PER_MINUTE;
  const campaignPct = campaignProgress(progress.minutes);

  const trackCards = useMemo(
    () =>
      (Object.keys(TRACKS) as TrackKind[]).map((kind) => {
        const value = trackValue(progress, kind);
        const info = stageInfo(value, kind);
        return {
          kind,
          label: TRACKS[kind].label,
          value: kind === "daimoku" ? formatDaimoku(progress.minutes) : formatCount(value),
          info,
        };
      }),
    [progress],
  );

  const journeyFill = useMemo(() => {
    const values = (Object.keys(TRACKS) as TrackKind[]).map((k) => stageInfo(trackValue(progress, k), k).visualPct);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [progress]);

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
      setStatus("Timer avviato. Puoi bloccare lo schermo: il tempo è calcolato dagli orari.");
    } catch (error) {
      setTimer(null);
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
      if (!response.ok || !json.progress) throw new Error(json.error ?? "Completamento non registrato");
      applySnapshot(json.progress, json.days);
      saveLastCorrection({
        eventId: json.timer.id,
        kind: "minutes",
        amount: json.timer.countedMinutes,
        secret: timer.secret,
        expiresAt: json.timer.correctionUntil * 1000,
      });
      setCorrectionMinutes(json.timer.countedMinutes);
      setCorrection(loadLastCorrection());
      setTimer(null);
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
    setBusy(true);
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
      saveLastCorrection({
        eventId: json.timer.id,
        kind: "minutes",
        amount: minutes,
        secret,
        expiresAt: json.timer.correctionUntil * 1000,
      });
      setCorrectionMinutes(minutes);
      setStatus(`${formatCount(minutes)} minuti registrati · ${formatDaimoku(minutes)} aggiunti.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Minuti non registrati");
    } finally {
      setBusy(false);
    }
  }

  async function addPlus(kind: "shakubuku" | "super", amount = 1) {
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const secret = randomSecret();
      const proof = await requestProof("plus:add", amount);
      const verifierHash = await sha256Hex(secret);
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: progressHeaders(),
        body: JSON.stringify({
          action: "plus:add",
          kind,
          amount,
          requestId: id,
          verifierHash,
          proofToken: proof.token,
          proofSolution: proof.solution,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.progress) throw new Error(json.error ?? "Contributo non registrato");
      applySnapshot(json.progress, json.days);
      saveLastCorrection({
        eventId: json.event.id,
        kind,
        amount,
        secret,
        expiresAt: json.event.correctionUntil * 1000,
      });
      setCorrection(loadLastCorrection());
      setStatus(`+${amount} ${kind === "super" ? "invito" : "Shakubuku"} registrato.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Contributo non registrato");
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    if (!correction) return;
    setBusy(true);
    try {
      const method = correction.kind === "minutes" ? "PATCH" : "DELETE";
      const body =
        correction.kind === "minutes"
          ? {
              action: "timer:correct",
              sessionId: correction.eventId,
              secret: correction.secret,
              minutes: correctionMinutes,
            }
          : {
              action: "plus:undo",
              eventId: correction.eventId,
              kind: correction.kind,
              secret: correction.secret,
            };
      const response = await fetch("/api/progress", { method, headers: progressHeaders(), body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok || !json.progress) throw new Error(json.error ?? "Correzione non riuscita");
      applySnapshot(json.progress, json.days);
      saveLastCorrection(null);
      setCorrection(null);
      setStatus("Contributo aggiornato.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Correzione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (timer?.confirmed && remainingMs === 0 && !busy) {
      void completeTimer(false);
    }
  }, [timer, remainingMs, busy]);

  const selectedMilestone = MILESTONES[track][milestoneIndex];
  const reachedMilestone =
    trackValue(progress, track) >= (selectedMilestone?.value ?? Number.POSITIVE_INFINITY);

  return (
    <div className="min-h-screen bg-[#2bb9e3] text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-[#0a3d62]/90 px-4 py-3 backdrop-blur-md md:px-8">
        <a href="#inizio" className="font-display text-xl tracking-wide text-white">
          Josho Napoli
        </a>
        <button
          type="button"
          className="rounded-full border border-white/40 px-3 py-1 text-sm"
          onClick={() => setShowPrivacy(true)}
          aria-label="Privacy e funzionamento"
        >
          ?
        </button>
      </header>

      <section id="inizio" className="relative overflow-hidden">
        <div className="bg-gradient-to-b from-[#d9f3fb] to-[#2bb9e3] px-4 pb-10 pt-6 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="relative mx-auto max-w-md">
              <Image
                src="/wave-totem.jpg"
                alt="Grafica Josho Napoli con onda"
                width={640}
                height={900}
                className="mx-auto w-full max-w-sm rounded-3xl shadow-2xl"
                priority
              />
            </div>
            <div className="mt-8 text-center">
              <p className="font-display text-4xl leading-none md:text-5xl">JOSHO NAPOLI</p>
              <p className="mt-4 text-lg italic text-white/95">
                “Le onde aumentano di potenza e tenacia ogni volta che incontrano un ostacolo”
              </p>
              <p className="mt-2 font-semibold text-[#0a3d62]">Daisaku Ikeda</p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em]">Corso territorio Napoli</p>
              <p className="mt-2 text-2xl font-bold text-[#0a3d62]">{CAMPAIGN.courseDates}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 md:px-8">
          <article className="rounded-3xl border border-white/30 bg-[#0a3d62]/75 p-6 shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-white/70">Totale raggiunto</p>
            <p className="mt-2 font-display text-4xl">{formatDaimoku(progress.minutes)}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${campaignPct * 100}%` }}
                role="progressbar"
                aria-valuenow={Math.round(campaignPct * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-3 text-sm text-white/85">
              Obiettivo <em>{formatCount(CAMPAIGN.daimokuDisplayGoal)} Daimoku</em> e{" "}
              <strong>{formatCount(CAMPAIGN.shakubukuGoal)} Shakubuku</strong> entro il {CAMPAIGN.deadlineLabel}
            </p>
          </article>

          <article className="grid gap-6 rounded-3xl border border-white/25 bg-white/10 p-6 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-3xl">Comincia dal Daimoku</h2>
              <p className="mt-2 text-white/90">
                Una preghiera sincera trasforma la tua vita e può diventare speranza per un’altra persona.
              </p>
            </div>
            <div className="rounded-2xl bg-[#05324f] px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/70">Verso il corso</p>
              <p className="mt-1 text-lg font-semibold">Un traguardo comune</p>
            </div>
          </article>

          <article id="pratica" className="rounded-3xl border border-white/30 bg-[#05324f] p-6 shadow-inner">
            {!timer ? (
              <>
                <h3 className="text-xl font-semibold">Quanto vuoi recitare?</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        !customMinutes && minutesChoice === m ? "bg-white text-[#05324f]" : "bg-white/15"
                      }`}
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
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      customMinutes ? "bg-white text-[#05324f]" : "bg-white/15"
                    }`}
                    onClick={() => setCustomMinutes(true)}
                  >
                    Altro
                  </button>
                </div>
                {customMinutes && (
                  <label className="mt-4 block text-sm">
                    Minuti
                    <input
                      type="number"
                      min={1}
                      max={720}
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                      value={minutesChoice}
                      onChange={(e) => setMinutesChoice(Number(e.target.value) || 0)}
                    />
                  </label>
                )}
                <p className="mt-4 text-lg">
                  {formatCount(minutesChoice)} minuti · <strong>≈ {formatDaimoku(minutesChoice)}</strong>
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startTimer()}
                    className="flex-1 rounded-2xl bg-white px-4 py-3 font-semibold text-[#05324f] disabled:opacity-60"
                  >
                    Avvia il timer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void registerManual()}
                    className="flex-1 rounded-2xl border border-white/40 px-4 py-3 font-semibold disabled:opacity-60"
                  >
                    Registra minuti già svolti
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm uppercase tracking-widest text-white/70">Timer Daimoku</p>
                <p className="mt-4 font-display text-5xl">{formatTimer(remainingMs)}</p>
                <p className="mt-2 text-white/80">
                  {timer.minutes} minuti · {formatDaimoku(timer.minutes)}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {remainingMs > 0 && (
                    <button
                      type="button"
                      className="rounded-2xl border border-white/40 px-4 py-2"
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
                  )}
                  <button
                    type="button"
                    className="rounded-2xl bg-white px-4 py-2 font-semibold text-[#05324f]"
                    disabled={busy}
                    onClick={() => void completeTimer(remainingMs > 0 && remainingMs < 60_000)}
                  >
                    {remainingMs < 60_000 && remainingMs > 0 ? "Termina" : "Registra sessione"}
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-white/30 px-4 py-2"
                    onClick={() => setTimer(null)}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
            {status && (
              <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm" role="status">
                {status}
              </p>
            )}
          </article>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl bg-white/12 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl" aria-hidden>話</p>
                  <h3 className="text-xl font-semibold">Shakubuku</h3>
                  <p className="mt-2 text-sm text-white/85">
                    Hai parlato con qualcuno della pratica, partendo dalla tua esperienza?
                  </p>
                  <p className="mt-3 text-2xl font-bold">{formatCount(progress.shakubuku)}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-2xl bg-white px-4 py-3 text-lg font-bold text-[#05324f]"
                  onClick={() => void addPlus("shakubuku")}
                >
                  +1
                </button>
              </div>
            </article>
            <article className="rounded-3xl bg-white/12 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl" aria-hidden>会</p>
                  <h3 className="text-xl font-semibold">Inviti a un meeting</h3>
                  <p className="mt-2 text-sm text-white/85">La persona invitata ha partecipato al meeting?</p>
                  <p className="mt-3 text-2xl font-bold">{formatCount(progress.super)}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-2xl bg-white px-4 py-3 text-lg font-bold text-[#05324f]"
                  onClick={() => void addPlus("super")}
                >
                  +1
                </button>
              </div>
            </article>
          </section>

          {correction && (
            <article className="rounded-3xl border border-white/25 bg-[#0a3d62]/60 p-5">
              <h3 className="font-semibold">Ultimo contributo · modificabile</h3>
              {correction.kind === "minutes" ? (
                <label className="mt-3 block text-sm">
                  Minuti effettivi
                  <input
                    type="number"
                    min={0}
                    max={correction.amount}
                    value={correctionMinutes}
                    onChange={(e) => setCorrectionMinutes(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                  />
                </label>
              ) : (
                <p className="mt-2 text-sm">Puoi annullare l’ultimo +1 se è stato inserito per errore.</p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void undoLast()}
                className="mt-4 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold"
              >
                Salva correzione / annulla
              </button>
            </article>
          )}

          <section>
            <h2 className="font-display text-3xl">I numeri del percorso</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {trackCards.map((card) => (
                <article key={card.kind} className="rounded-3xl bg-[#05324f]/80 p-5">
                  <p className="text-xs uppercase tracking-widest text-white/70">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold">{card.value}</p>
                  <p className="mt-2 text-sm text-white/80">
                    Tappa {card.info.completed} di 12 · verso {card.info.next.title}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-white/15">
                    <div
                      className="h-2 rounded-full bg-[#5ed4f3]"
                      style={{ width: `${card.info.localPct * 100}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/85">
              <strong>{formatCount(totalContributions(progress, days))}</strong> contributi registrati · nessun nome,
              nessuna classifica.
            </p>
          </section>

          <CoastJourney fill={journeyFill} />

          <section className="rounded-3xl bg-[#05324f]/70 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">12 tappe · incoraggiamenti</h2>
                <p className="text-sm text-white/80">Percorso {TRACKS[track].label}</p>
              </div>
              <div className="flex gap-2">
                {(Object.keys(TRACKS) as TrackKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`rounded-full px-3 py-1 text-sm ${track === kind ? "bg-white text-[#05324f]" : "bg-white/15"}`}
                    onClick={() => {
                      setTrack(kind);
                      setMilestoneIndex(Math.max(0, completedStages(trackValue(progress, kind), kind) - 1));
                    }}
                  >
                    {TRACKS[kind].short}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {MILESTONES[track].map((m, index) => {
                const unlocked = trackValue(progress, track) >= m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setMilestoneIndex(index)}
                    className={`h-10 w-10 rounded-full text-sm font-bold ${
                      unlocked ? "bg-white text-[#05324f]" : "bg-white/10 text-white/40"
                    } ${milestoneIndex === index ? "ring-2 ring-[#5ed4f3]" : ""}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <article className={`mt-6 rounded-2xl p-5 ${reachedMilestone ? "bg-white/12" : "bg-white/5"}`}>
              {reachedMilestone ? (
                <>
                  <p className="text-xs uppercase tracking-widest text-white/70">
                    Tappa {milestoneIndex + 1} · {milestoneLabel(track, selectedMilestone.value)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{selectedMilestone.title}</h3>
                  <blockquote className="mt-3 italic text-white/90">«{selectedMilestone.quote}»</blockquote>
                  <cite className="mt-2 block text-sm text-white/70">{selectedMilestone.source}</cite>
                </>
              ) : (
                <p className="text-white/80">
                  Questa tappa si aprirà a {milestoneLabel(track, selectedMilestone.value)}.
                </p>
              )}
            </article>
          </section>

          <section>
            <h2 className="font-display text-2xl">La crescita, passo dopo passo</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["daimoku", "shakubuku", "super", "contributi"] as const).map((metric) => (
                <button
                  key={metric}
                  type="button"
                  className={`rounded-full px-3 py-1 text-sm capitalize ${
                    chartMetric === metric ? "bg-white text-[#05324f]" : "bg-white/15"
                  }`}
                  onClick={() => setChartMetric(metric)}
                >
                  {metric === "super" ? "Inviti" : metric}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <TrendChart days={days} metric={chartMetric} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {(Object.keys(TRACKS) as TrackKind[]).map((kind) => {
              const value = trackValue(progress, kind);
              const info = stageInfo(value, kind);
              return (
                <article key={kind} className="rounded-3xl border border-white/20 bg-white/10 p-5 text-center">
                  <p className="text-sm text-white/80">{TRACKS[kind].label}</p>
                  <p className="mt-3 text-3xl font-bold">{Math.round(info.localPct * 100)}%</p>
                  <p className="text-xs uppercase tracking-widest text-white/70">verso prossima tappa</p>
                  <p className="mt-2 text-sm">
                    {kind === "daimoku"
                      ? formatMillionsDaimoku(info.next.value)
                      : milestoneLabel(kind, info.next.value)}
                  </p>
                </article>
              );
            })}
          </section>
        </div>
      </section>

      <footer className="border-t border-white/20 bg-[#0a3d62] px-4 py-8 text-center text-sm text-white/85 md:px-8">
        <p>Ogni persona è preziosa. Ogni passo conta. Nessuno viene classificato.</p>
        <p className="mt-2">Nessun nome, nessuna classifica. Solo il cammino che costruiamo insieme.</p>
      </footer>

      {showPrivacy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[80vh] max-w-lg overflow-y-auto rounded-3xl bg-[#05324f] p-6 text-left text-sm text-white/90">
            <h2 className="font-display text-2xl text-white">Privacy e funzionamento</h2>
            <p className="mt-3">
              Il contatore è anonimo: non raccogliamo nomi né classifiche. Ogni dispositivo può correggere l’ultimo
              contributo entro 48 ore. I totali sono salvati in modo sicuro su Vercel KV.
            </p>
            <button
              type="button"
              className="mt-6 rounded-2xl bg-white px-4 py-2 font-semibold text-[#05324f]"
              onClick={() => setShowPrivacy(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
