# myPersonalTrainer

App personale per allenarsi in camera: **15-20 minuti al giorno, 6 giorni su 7**, a corpo libero con piccoli attrezzi (elastici, manubri, palla, ab wheel, cyclette). È una **PWA**: si installa sull'iPhone dalla schermata Home, funziona **offline** e salva tutto **sul telefono**.

## Cosa fa

- **Oggi**: allenamento del giorno (A spinta, B gambe, C tirata e core, riposo, test), durata stimata, serie e target, attrezzi da preparare con l'ancoraggio degli elastici, muscoli coinvolti. Con ◀ ▶, uno swipe o la striscia della settimana vedi anche i **giorni passati** (cosa hai fatto) e **futuri** (cosa preparare).
- **Allenamento guidato**: riscaldamento → esercizi e superserie → recuperi → defaticamento, tutto in automatico. Timer grande, beep a 3-2-1, **voce in italiano**, schermo sempre acceso. L'unico tocco è "✓ Fatto" per confermare le ripetizioni (già impostate sul target). Scheda di ogni esercizio con foto, muscoli e 3 consigli. Riepilogo finale col confronto rispetto alla volta precedente.
- **Allenamenti sempre diversi**: il primo esercizio di ogni giorno è fisso (su quello si misurano progressione e test); gli altri, il riscaldamento e gli allungamenti ruotano in automatico tra circa 40 esercizi, scegliendo solo quelli possibili con l'attrezzatura che hai. Gli esercizi mai fatti hanno il badge "Novità".
- **Progressione automatica** (con il motivo di ogni modifica): +1 a settimana se completi tutto, stesso target se lo manchi, −10% dopo 2 volte di fila, elastico successivo quando arrivi al limite, ricalcolo dopo i test, scarico nella settimana 8.
- **Test guidati**: i 5 test in sequenza con 3 minuti di recupero, poi ricalcolo dei target.
- **Progressi**: serie di giorni consecutivi, calendario, muscoli allenati nella settimana, grafici dei test, volume settimanale, peso corporeo, storico di carichi ed elastici.
- **Impostazioni**: attrezzatura ed elastici (nome, colore, durezza), voce e suoni, durata dei recuperi, promemoria nel Calendario (.ics), guida per Comandi Rapidi, backup JSON, ricomincia il programma.

## Sviluppo locale

Serve **Node.js 20** (c'è un file `.nvmrc`).

```bash
nvm use            # oppure installa Node 20
npm install
npm run dev        # http://localhost:5173 (e sull'indirizzo di rete locale)
npm test           # test Vitest (progressione, elastici, calendario, storage…)
npm run build      # build di produzione in dist/
npm run preview    # prova la build
```

**Provare un altro giorno** (solo in sviluppo): aggiungi `?oggi=AAAA-MM-GG` all'indirizzo, per esempio `http://localhost:5173/?oggi=2026-10-25` per il giorno di test. In produzione il parametro viene ignorato.

**Provare dal telefono in sviluppo**: con `npm run dev` apri sull'iPhone l'indirizzo "Network" mostrato nel terminale (stessa rete Wi-Fi). Via `http://` l'app funziona, ma **offline, installazione e schermo sempre acceso richiedono HTTPS** (vedi sotto).

## Modificare il programma

Tutto sta in tre file di configurazione. La logica li legge senza bisogno di altre modifiche.

| File | Contenuto |
|---|---|
| `src/data/program.ts` | esercizi e varianti (partenza, massimo, incremento, elastico o peso), muscoli principali e secondari, giorni A/B/C, riscaldamento, defaticamento, test, regole (settimane, scarico, −10%…), attrezzatura e impostazioni di default |
| `src/data/exercises-extra.ts` | esercizi alternativi della rotazione automatica, riscaldamenti e allungamenti extra |
| `src/data/media.ts` | foto di ogni esercizio con fonte e licenza |

Per aggiungere varietà: scrivi l'esercizio in `exercises-extra.ts` (con la sua foto in `media.ts`) e aggiungilo alle `alternatives` del blocco giusto in `DAYS` (`program.ts`). La rotazione lo inserirà da sola. L'app gli crea lo stato di partenza dall'ultimo test.

## Deploy

L'app è un **sito statico** (cartella `dist/`). Tre opzioni già pronte:

### 1. Server di casa con Docker

```bash
docker compose up -d --build
```

Costruisce l'immagine (esegue anche i test) e la serve con **nginx** sulla porta **8080**. La configurazione è in `deploy/nginx.conf` e prevede:
- `index.html`, `sw.js` e il manifest sempre ricontrollati, così gli aggiornamenti arrivano subito;
- asset con hash in cache per un anno;
- gzip;
- percorsi sconosciuti che tornano all'app;
- intestazioni di sicurezza.

Per servirla sotto una sottocartella: `docker build --build-arg BASE_PATH=/trainer/ .`

### 2. GitHub Pages

1. Crea un repository su GitHub e fai il push del progetto sul branch `main`.
2. Nel repository: **Settings → Pages → Source: GitHub Actions**.
3. A ogni push il workflow `.github/workflows/deploy-pages.yml` esegue test e build (con `BASE_PATH=/<nome-repo>/`) e pubblica su `https://<utente>.github.io/<nome-repo>/`.

### 3. Cloudflare Pages

In Cloudflare: **Workers & Pages → Create → Pages → collega il repository**, poi:
- Build command: `npm run build`
- Output directory: `dist`
- Variabile d'ambiente: `NODE_VERSION = 20`

Le intestazioni di cache sono in `public/_headers`. Il sito risponde su `https://<progetto>.pages.dev/`.

### HTTPS: necessario per l'iPhone

Service worker (offline), installazione come app e Screen Wake Lock funzionano **solo su HTTPS**. GitHub Pages e Cloudflare Pages lo danno già. Per il server di casa servono una di queste soluzioni:
- **Tailscale** (la più semplice, anche fuori casa): installalo sul server e sull'iPhone, poi `tailscale serve --bg 8080` e usa l'indirizzo `https://<server>.<tailnet>.ts.net`.
- **Cloudflare Tunnel**: `cloudflared tunnel` verso `http://localhost:8080`, con il tuo dominio.
- **Caddy** davanti al container, con un dominio che punta a casa: certificato automatico con `reverse_proxy localhost:8080`.

## Installazione su iPhone

1. Apri l'indirizzo HTTPS dell'app in **Safari**.
2. Tocca **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home** → **Aggiungi**.
3. Apri l'app dall'icona **Trainer**: parte a schermo intero, senza barra del browser.
4. Al primo avvio segui la configurazione: profilo, attrezzatura, livello (test guidati o risultati già noti) e data di inizio.
5. Per verificare l'offline: aprila una volta, attiva la modalità aereo e riaprila.

### Se la usa qualcun altro

Ogni persona usa l'app **sul proprio telefono** e ha i propri dati: nessuno vede allenamenti, test o peso degli altri, perché tutto resta in locale e non passa da un server. Al primo avvio c'è una configurazione a passi, **senza dati predefiniti**:
1. **Profilo**: sesso (uomo, donna o preferisco non dirlo: serve per le stime prima dei test e per la figura dei muscoli), altezza e peso.
2. **Attrezzatura**: cosa si ha, compresi i pesi dei manubri. Gli elastici partono da 3 livelli generici, modificabili in Impostazioni.
3. **Livello**: test guidati subito (consigliato) oppure inserimento dei risultati di un test recente.
4. **Data di inizio**.

Chi cambia telefono può usare **"Ho già un backup: ripristina"** nella prima schermata.

**Note su iOS**
- Beep e voce partono dopo il tocco su "Inizia" (è una regola di iOS). Se non senti i beep, controlla l'interruttore silenzioso.
- I dati restano nell'app installata. Se la rimuovi dalla schermata Home, iOS cancella anche i dati: prima fai **Impostazioni → Esporta backup**.
- Safari usato come browser e app installata hanno archivi separati: usa sempre l'app installata.

## Promemoria

Su iPhone le notifiche push di una web app richiedono un server. Le alternative sono due:
- **Impostazioni → Aggiungi al Calendario (.ics)**: crea un evento giornaliero all'orario scelto, con avviso. Dal foglio di condivisione scegli Calendario.
- **Comandi Rapidi**: automazione "Ora del giorno" che apre l'app (la guida passo passo è nelle Impostazioni).

## Struttura del progetto

```
src/
  data/          program.ts (programma), exercises-extra.ts (rotazione), media.ts (foto)
  domain/        logica pura e testata: date, calendario, progressione, sessione, statistiche
  storage/       interfaccia Repository + implementazione Dexie (IndexedDB)
  app/           casi d'uso (primo avvio, oggi, fine allenamento, test) e hook dei dati
  features/      schermate: onboarding, today, workout, tests, progress, settings
  components/    UI (pulsanti grandi, stepper, foto animate, mappa dei muscoli)
  lib/           audio, voce, wake lock, .ics, file, formattazione
tests/           Vitest
deploy/          nginx
public/          icone, foto degli esercizi, _headers
```

Il modello dati è serializzabile in JSON (vedi `BackupData` in `src/domain/types.ts`) e lo storage è separato dietro l'interfaccia `Repository`. La **fase 2** (bot Telegram e API con Fastify + SQLite) potrà aggiungere un'implementazione che sincronizza col server senza riscrivere l'app.

## Crediti

- Foto degli esercizi: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (pubblico dominio, Unlicense), più due immagini da Wikimedia Commons: "Downward-Facing-Dog" di Iveto (CC BY 3.0) e la sequenza del burpee di Taco fleur (CC BY-SA 4.0). I dettagli sono in `src/data/media.ts` e nell'app (Impostazioni → Crediti).
- Icona, mappa dei muscoli e codice: originali.
