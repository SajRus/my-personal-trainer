# Prompt per Claude Code — App "Calisthenics in camera"

Copia tutto il testo sotto la linea e incollalo in Claude Code, dentro una cartella vuota.

---

Voglio costruire una **Progressive Web App (PWA)** personale per gestire un programma di allenamento a corpo libero con piccoli attrezzi, da fare in camera: 15 minuti al giorno, 6 giorni su 7, con obiettivo forza e massa muscolare. La userò **dal mio iPhone**, installata sulla schermata Home ("Aggiungi a Home" da Safari). Deve funzionare **offline**. L'interfaccia va in **italiano**.

Prima di scrivere codice, **proponimi un piano di implementazione** (struttura del progetto, modello dati, schermate) e aspetta la mia conferma. Poi procedi per fasi, facendo verificare ogni fase prima di passare alla successiva.

## Stack tecnico
- Vite + React + TypeScript
- Tailwind CSS, design mobile-first con tema scuro e tasti grandi, perché lo uso sudato e in movimento
- `vite-plugin-pwa` per manifest, service worker e funzionamento offline, con icone per iOS (apple-touch-icon)
- Dexie.js (IndexedDB) per salvare i dati in locale sul dispositivo
- Recharts per i grafici
- Nessun backend nella fase 1
- Deploy come sito statico. Preparami sia la configurazione per GitHub Pages o Cloudflare Pages sia un `Dockerfile` con nginx, per ospitarla sul mio server di casa

## Profilo utente (dati iniziali)
- 179 cm, 87,5 kg
- Test iniziali: piegamenti 11 in una serie; squat 20 (con margine); plank 45 s; burpees 10 in 1 minuto; crunch 15 in 1 minuto
- Registra anche il peso corporeo nel tempo

## Attrezzatura disponibile
- Elastici tubolari con maniglie e ancoraggi per la porta (alto, medio, basso), di diverse resistenze
- Elastici piatti (fasce e mini band) di diverse durezze
- Manubri: 2 × 2 kg e 2 × 1 kg
- Palla grande da pilates
- Tappetino
- Ruota per addominali con impugnature (ab wheel)
- Cyclette con resistenza regolabile
- Una sedia stabile

L'utente deve poter **registrare e modificare la propria attrezzatura** nelle impostazioni, inclusi gli elastici con nome/colore e resistenza (es. "Rosso – medio"). Ogni esercizio con elastico o manubri salva l'attrezzo e il livello usato in ogni serie.

## Programma di allenamento (8 settimane)

### Struttura di ogni sessione (15 min)
1. **Riscaldamento, 2 min**: 90 s di cyclette a resistenza bassa, poi 30 s di band pull-apart con elastico piatto leggero
2. **Parte principale, circa 11 min**: vedi i giorni qui sotto. "Superserie" significa due esercizi uno dopo l'altro, poi il recupero
3. **Defaticamento, 2 min**: allungamento di petto, dorsali, quadricipiti e femorali (30 s ciascuno)

### Rotazione settimanale
Lun A, Mar B, Mer C, Gio A, Ven B, Sab C, Dom riposo attivo (15-20 min di cyclette leggera, facoltativa).

### Giorno A — Spinta (petto, spalle, tricipiti)
| Esercizio | Partenza | Recupero | Progressione |
|---|---|---|---|
| Piegamenti | 4 × 6 | 60 s | +1 rip/serie a settimana. Raggiunto 4×12 → piegamenti con elastico sulla schiena, ripartendo da 4×6 |
| Pike push-up (spalle) | 3 × 5 | 45 s | +1 rip/settimana |
| Superserie: dip alla sedia + alzate laterali con manubri da 2 kg | 3 × 8 + 3 × 12 | 45 s | Dip: +1 rip/settimana, raggiunto 3×15 → gambe tese. Alzate: fino a 3×20, poi pausa di 2 s in alto |

### Giorno B — Gambe e glutei
| Esercizio | Partenza | Recupero | Progressione |
|---|---|---|---|
| Squat | 4 × 15 a corpo libero | 60 s | Dalla settimana 3: elastico sotto i piedi con le maniglie alle spalle, 4 × 12. Raggiunto 4×20 → elastico più duro, ripartendo da 4×12 |
| Affondi indietro alternati | 3 × 8 per gamba | 45 s | +1 rip/settimana. Raggiunto 3×12 → con manubri da 2 kg |
| Superserie: leg curl sulla palla pilates + ponte glutei con mini band sulle ginocchia | 3 × 8 + 3 × 15 | 45 s | Leg curl: +1 rip/settimana, raggiunto 3×15 → a una gamba. Ponte: raggiunto 3×20 → mini band più dura |

### Giorno C — Tirata (schiena, bicipiti) e core
| Esercizio | Partenza | Recupero | Progressione |
|---|---|---|---|
| Rematore con elastico (ancoraggio medio) | 4 × 10 | 60 s | +1 rip/settimana fino a 4×15, poi elastico più duro o un passo più lontano dalla porta, ripartendo da 4×10 |
| Superserie: lat pulldown con elastico (ancoraggio alto) + face pull (ancoraggio alto) | 3 × 10 + 3 × 12 | 45 s | Stessa logica: fino a 15, poi più resistenza |
| Superserie: ab wheel in ginocchio (escursione parziale) + plank | 3 × 5 + 3 × 30 s | 45 s | Ab wheel: +1 rip/settimana e poi escursione più ampia. Plank: +5 s/settimana |

### Test e scarico
- **Fine settimana 4 (domenica)**: ripetere i 5 test. Ricalcolare le serie di partenza al 55-60% del nuovo massimo
- **Settimana 8**: scarico, con volume ridotto del 40% da lunedì a venerdì. Test finale sabato
- La schermata test deve guidare i 5 test in sequenza con 3 minuti di recupero tra l'uno e l'altro e salvare i risultati

### Regole di progressione automatica
- Se in una sessione completo tutte le ripetizioni previste con buona forma → alla sessione successiva dello stesso tipo applica la progressione
- Se manco il target → ripeti lo stesso carico
- Se lo manco per 2 sessioni di fila → riduci del 10%
- Per gli esercizi con elastico: quando raggiungo il limite di ripetizioni della tabella, proponimi l'elastico successivo in ordine di durezza tra quelli che ho registrato, e riparti dalle ripetizioni di partenza
- Dopo un test, ricalcola tutto dai nuovi massimi
- Mostrami sempre il motivo di una modifica (es. "+1 perché hai completato tutto la volta scorsa", "passa all'elastico Blu")

Tutti gli esercizi, le varianti, gli attrezzi e le regole devono stare in un **file di configurazione modificabile** (es. `src/data/program.ts`), non sparsi nel codice.

## Funzionalità

### 1. Oggi
- Mostra l'allenamento del giorno (A/B/C/riposo/test), la durata stimata, le serie previste e gli attrezzi da preparare
- Un grande pulsante "Inizia"

### 2. Allenamento guidato (la parte più importante)
- Scorre in automatico: riscaldamento → esercizi → recuperi → defaticamento
- Gestisce le superserie: esercizio 1 → esercizio 2 → recupero
- Timer grande per ogni fase, con conto alla rovescia nei recuperi e negli esercizi a tempo (plank, cyclette)
- Segnale sonoro a 3-2-1 e a fine fase, più **guida vocale in italiano** (Web Speech API): nome dell'esercizio, attrezzo, "ultima serie", "recupero 60 secondi"
- **Screen Wake Lock** per tenere lo schermo acceso
- Dopo ogni serie, inserimento rapido delle ripetizioni fatte con i pulsanti −/+, precompilato col target, e dell'elastico o peso usato
- Pulsanti Pausa, Salta, Indietro
- Per ogni esercizio, una scheda con descrizione, posizione dell'ancoraggio (se serve) e 3 consigli di esecuzione in italiano, più un disegno semplice o un'animazione SVG creata da te (niente immagini protette da copyright)
- A fine sessione: riepilogo, tempo totale, volume e confronto con la sessione precedente dello stesso tipo

### 3. Progressi
- Grafico dei test nel tempo (5 esercizi)
- Grafico del volume settimanale per gruppo muscolare
- Storico degli elastici o carichi per esercizio
- Grafico del peso corporeo
- Calendario con i giorni completati e il conteggio della serie di giorni consecutivi (streak)

### 4. Promemoria
Su iOS le notifiche push delle PWA richiedono un server. Nella fase 1 quindi:
- Genera un file `.ics` scaricabile con un evento ricorrente giornaliero all'orario che scelgo, così finisce nel Calendario di iPhone con un avviso
- Aggiungi una guida per creare un'automazione in Comandi Rapidi che apre l'app a un orario fisso

### 5. Impostazioni e dati
- Gestione attrezzatura ed elastici
- Orario preferito, voce on/off, suoni on/off, durata dei recuperi modificabile
- **Esporta/Importa** tutti i dati in JSON (backup)
- Reset del programma con nuovi test

## Fase 2 (facoltativa, da fare dopo)
Un **bot Telegram** in Node.js, da far girare in Docker sul mio server di casa:
- Ogni mattina all'orario scelto mi manda l'allenamento del giorno con un link che apre la PWA
- Comandi `/oggi`, `/peso 87.5`, `/fatto`
- Sincronizzazione con la PWA tramite una piccola API (es. Fastify + SQLite) sullo stesso server

Progettalo in modo che la fase 1 non vada riscritta: tieni il modello dati serializzabile e separa lo strato di storage.

## Criteri di accettazione
- Si installa su iPhone da Safari e si apre a schermo intero senza barra del browser
- Funziona in modalità aereo dopo il primo caricamento
- Un allenamento completo si fa senza toccare lo schermo, tranne che per inserire le ripetizioni
- I dati restano dopo aver chiuso e riaperto l'app
- Il programma e la progressione rispettano le tabelle sopra; aggiungi test unitari (Vitest) per la logica di progressione, inclusa quella degli elastici
- Scrivi un README con istruzioni per sviluppo locale, deploy e installazione su iPhone
