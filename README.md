# Corso Napoli · Contadaimoku

Sito collettivo per il **Corso Territorio Napoli** (Josho Napoli · 6–8 novembre 2026): contatore anonimo di Daimoku, Shakubuku e inviti, con 12 tappe di incoraggiamento e grafici di avanzamento.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (organizzazione **SGI**)

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # variabili KV da Vercel
npm run dev
```

## Deploy

Il progetto è collegato al team Vercel **SGI** (`sgi-a4378c66`). Dopo il link dello store KV:

```bash
vercel --prod --scope sgi-a4378c66
```
