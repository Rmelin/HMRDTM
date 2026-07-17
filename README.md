# HMRDTM – Hvor mange er der til mad

[Åbn deployment-guiden til DXP2800, Docker og Cloudflare Tunnel](./deployment-guide.html)

Mobil-først webapp til små events. Admin opretter events, måltider og invitationer; gæster svarer via et unikt link. SQLite kører i WAL-mode, og ændringer efter måltidets "Svar senest" logges pr. måltid.

## MVP-funktioner

- Admin-login med setup-flow, rate-limit og brugeradministration
- Flere eventejere med fælles adgang til event og gæsteliste
- Almindelige brugere ser kun events, de ejer; administratoren ser alle
- Events, måltider, gæster, komme/gå, kost og chat
- Lange, uforudsigelige invitationslinks
- Eksplicit `Ja / Måske / Nej / Ikke angivet` pr. måltid
- Forventet antal ud fra tids-overlap, eventstatus og eksplicit fravalg
- Måltidsdetalje med gæsteliste, kost-tags og log over ændringer efter "Svar senest"
- Kalenderbaseret oprettelse og redigering af måltider med klik/træk og låsning til eventets tidsrum
- Programkalender med samme klik/træk-redigering, synlighedsvalg og tidsbegrænsning
- ICS-kalenderfil og CSV-eksport
- Dark/light mode samt rød admin- og grøn gæsteaccent
- SQLite WAL, migrationer, konsistent backup og healthcheck

## Lokal udvikling

Krav: Node.js 24 (se `.nvmrc`).

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Åbn `http://localhost:3000`.

Demo-login efter en tom seed:

- Email: `admin@hmrdtm.local`
- Password: `hmrdtm1234`
- Gæstelink: `/guest/demo_anna_9Gu0pF4rJ6nY2wK8sD3mT7xQ5vB1cH`

I produktion bruges setup-fanen på `/admin/login` til første admin. Kør ikke demo-seed på produktionsdata.

Demo-seed bruger sine sikre udviklingsstandarder. Hvis du vil overskrive dem
lokalt, sættes `ADMIN_EMAIL` og `ADMIN_PASSWORD` kun på selve kommandoen — ikke
i produktionens `.env`:

```bash
ADMIN_EMAIL=lokal@example.dk ADMIN_PASSWORD='et-langt-lokalt-password' npm run db:seed
```

## Kontrol

```bash
npm test
npm run build
```

## Produktion på UGREEN NASync DXP2800

DXP2800 kan køre Docker Compose direkte i UGOS Pro. Denne opsætning bruger Cloudflare Tunnel, så port 3000 ikke publiceres på NAS'en eller routeren.

1. Installér Docker i UGOS Pro.
2. Opret en delt mappe til projektet, eksempelvis `docker/hmrdtm`.
3. Kopiér kun produktionsfilerne til mappen: `src/`, `public/`, `drizzle/`,
   Docker-filerne, package-filerne samt Next.js- og TypeScript-konfigurationen.
   Kopiér ikke `node_modules/`, `.next/`, lokale databaser eller backups. Den
   præcise filliste og en kommando til at lave en minimal overførselspakke findes
   i [deployment-guidens trin 2](./deployment-guide.html#trin-2).

   Opret derefter de vedvarende mapper og den private miljøfil på NAS'en:

```bash
mkdir -p data backups
cp .env.example .env
chmod 600 .env
```

4. Opret en navngivet Tunnel i Cloudflare og indsæt kun tokenværdien som
   `CLOUDFLARE_TUNNEL_TOKEN` i `.env`.
5. I Tunnelens public hostname sættes fx `mad.ditdomæne.dk` til service-URL `http://hmrdtm:3000`.
6. Start projektet i UGOS Pro eller via terminal:

```bash
docker compose --env-file .env -f compose.production.yml config --quiet
docker compose --env-file .env -f compose.production.yml up -d --build
```

7. Åbn `https://mad.ditdomæne.dk/admin/login`, vælg **Første admin**, og opret administratoren.

Hvis siden svarer **"Admin findes allerede"**, er databasen allerede initialiseret. Vælg **Log ind** og brug den eksisterende administrator. Den selvstændige [deployment-guide](./deployment-guide.html) har en sikker nødprocedure med backup først, hvis adgangskoden er mistet.

Cloudflare Access må ikke beskytte hele hostnavnet, fordi gæsterne skal kunne åbne deres token-links. Appens admin-login beskytter `/admin`. Et separat admin-hostname med Access kan tilføjes senere.

## Backup

En konsistent SQLite-backup bruger SQLite backup-API'et og fungerer, mens WAL er aktiv:

```bash
docker compose --env-file .env -f compose.production.yml exec -T hmrdtm npm run db:backup
```

Planlæg kommandoen dagligt i UGOS Pro. Behold fx 7 daglige og 4 ugentlige kopier, og kopiér mindst én krypteret backup væk fra NAS'en. RAID 1 giver tilgængelighed ved ét diskudfald, men erstatter ikke backup.

## Opdatering og rollback

```bash
docker compose --env-file .env -f compose.production.yml exec -T hmrdtm npm run db:backup
docker compose --env-file .env -f compose.production.yml up -d --build
docker compose --env-file .env -f compose.production.yml ps
```

Kontrollér `/api/health` efter opdatering. Behold forrige image/tag og seneste databasebackup, før migrationer køres.

## Miljø og hemmeligheder

Produktionens `.env` skal kun indeholde:

- `CLOUDFLARE_TUNNEL_TOKEN`: hemmeligt token til `cloudflared` og påkrævet ved deploy

Følgende er bevidst låst i `compose.production.yml`, fordi de ikke er
hemmeligheder og skal passe til de monterede datamapper:

- `DATABASE_PATH=/app/data/app.db`
- `BACKUP_DIR=/app/backups`
- `NODE_ENV=production`

`ADMIN_EMAIL` og `ADMIN_PASSWORD` er kun valgfrie overrides til lokal
demo-seed. Produktions-admin og øvrige brugere oprettes gennem appens UI.
