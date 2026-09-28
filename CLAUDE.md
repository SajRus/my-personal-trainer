# myPersonalTrainer — regole del progetto

PWA (Vite + React + TypeScript + Dexie) per allenamenti in camera. Interfaccia e commenti in **italiano**. Usa Node 20 (`nvm use`).

## Regola n. 1: chi usa già l'app non deve mai perdere la sua storia

I dati vivono solo in IndexedDB sul telefono di ogni utente. Ogni modifica deve essere compatibile con quelli esistenti:

- **Schema Dexie** (`src/storage/dexieRepository.ts`): solo nuove `version(n)` additive. Mai rimuovere tabelle, indici o campi, e mai rinominare id di esercizi o attrezzi già pubblicati.
- **Campi nuovi** nei tipi salvati (`src/domain/types.ts`): opzionali o con default in `src/storage/migrate.ts` (`normalizeState`, `normalizeProfile`, `migrateBackup`).
- **Formato del backup**: se cambia, aumenta `BACKUP_VERSION`, scrivi la conversione in `migrateBackup` e aggiungi un esempio in `tests/compat/`. I file già presenti in `tests/compat/` non si modificano.
- **Esercizi rimossi**: il codice deve tollerare sessioni e stati che li citano (usa `EXERCISES[id]?.`).
- **Operazioni distruttive** (import, cancellazione, ricomincia): prima si salva una copia di sicurezza (`repo.saveSnapshot`). All'avvio `autoSnapshot()` salva una copia dopo ogni aggiornamento.
- `npm test` deve restare verde, in particolare `tests/compat.test.ts`.

## Dove stanno le cose

- `src/data/program.ts`: programma, giorni, regole, test, attrezzi.
- `src/data/exercises-extra.ts`: esercizi della rotazione automatica.
- `src/data/media.ts`: foto, solo con licenza libera (free-exercise-db o Wikimedia con attribuzione).
- `src/domain/`: logica pura e testata.
- `src/storage/`: repository e migrazioni.
- `src/features/`: schermate.

## Verifiche

- `npm test` e `npm run build`.
- Per provare un giorno qualsiasi in sviluppo: `npm run dev`, poi `?oggi=AAAA-MM-GG`.
- Il deploy parte con un push su `main` (GitHub Pages). Commit e push solo quando l'utente lo chiede.
