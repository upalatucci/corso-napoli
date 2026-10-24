"use client";

import { CONVERSATION_TIPS } from "@/lib/contadaimoku/config";

export function ConversationGuide() {
  return (
    <details className="rounded-3xl border border-white/20 bg-white/10 p-5 open:bg-white/15">
      <summary className="cursor-pointer list-none font-semibold">
        <span className="flex items-center justify-between gap-3">
          <span>
            <small className="block text-xs uppercase tracking-widest text-white/70">Shakubuku</small>
            Parlarne, da persona a persona
          </span>
          <span aria-hidden className="text-xl">+</span>
        </span>
      </summary>
      <p className="mt-4 text-sm text-white/90">
        Lo shakubuku parte dal desiderio della felicità dell’altro. Non serve convincere né avere un discorso perfetto:
        ascolta, parla con sincerità e lascia spazio alla persona.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {CONVERSATION_TIPS.map((tip) => (
          <article key={tip.title} className="rounded-2xl bg-[#05324f]/50 p-4">
            <h3 className="font-semibold">{tip.title}</h3>
            <p className="mt-2 text-sm text-white/85">{tip.text}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm italic text-white/80">Un invito, non una pressione.</p>
    </details>
  );
}
