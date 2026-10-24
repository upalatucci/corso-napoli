"use client";

export function ShareLink() {
  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = {
      title: "Josho Napoli · Contadaimoku",
      text: "Unisciti al percorso collettivo verso il corso territorio Napoli.",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copiato negli appunti.");
    } catch {
      prompt("Copia questo link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold"
    >
      Condividi il percorso
    </button>
  );
}
