"use client";

import { useState } from "react";
import { formatCount } from "@/lib/contadaimoku/format";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
};

export function BulkShakubukuDialog({ open, busy, onClose, onConfirm }: Props) {
  const [amount, setAmount] = useState(5);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-[#05324f] p-6 text-white shadow-2xl">
        <h2 className="font-display text-2xl">Aggiungi più Shakubuku</h2>
        <p className="mt-2 text-sm text-white/85">
          Registra un gruppo di conversazioni sincere in un solo passo (massimo 50).
        </p>
        <label className="mt-5 block text-sm">
          Quanti Shakubuku vuoi aggiungere?
          <input
            type="number"
            min={2}
            max={50}
            value={amount}
            onChange={(e) => setAmount(Math.min(50, Math.max(2, Number(e.target.value) || 2)))}
            className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-lg"
          />
        </label>
        <p className="mt-2 text-sm text-white/70">Stai per aggiungere {formatCount(amount)} Shakubuku al totale.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="flex-1 rounded-2xl border border-white/30 px-4 py-2"
            onClick={onClose}
            disabled={busy}
          >
            Annulla
          </button>
          <button
            type="button"
            className="flex-1 rounded-2xl bg-white px-4 py-2 font-semibold text-[#05324f] disabled:opacity-60"
            disabled={busy}
            onClick={() => onConfirm(amount)}
          >
            {busy ? "Registrazione…" : `Aggiungi ${formatCount(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
