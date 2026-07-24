# HMRDTM2 – Hvor mange er der til mad

Den offentlige forside forklarer, at HMRDTM er skabt af Rasmus Melin Graasbøll som et privat alternativ til invitationer via store sociale medieplatforme. Den beskriver personlige links via SMS/e-mail/andre beskedtjenester, gæstesvar uden login, kalenderintegration og arrangørens samlede overblik.
- Formål: enkel webapp til små begivenheder med måltider, gæster, tidslinje og overblik over mad

## Roller
- Admin: opretter og administrerer events, måltider, gæster, aktiviteter, eksport
- Gæst: åbner via unik link, svarer på event/måltider, angiver tider og kost, deltager i chat

## Adgang og login
- Admin login + setup-flow til første admin
- Admin kan oprette og slette almindelige brugere med navn og mail
- Alle brugere kan ændre deres eget password og oprette events
- Et event kan have flere ejere; ejerne kan redigere eventet, invitere gæster og se samme gæsteliste
- Almindelige brugere kan kun åbne events, de er tilknyttet; admin kan åbne alle events
- Gæsteadgang via unikt token-link pr. gæst
- Admin og gæst har separate views og flows

## Event (Admin)
- Opret/ret/slet event med titel, sted, start/slut og beskrivelse
- Start/slut vises som dato + tid felter
- Standard længe af event er 3 timer, hvis ikke udfyldt
- Standard "Deadline for tilmelding" auto-sættes til 5 dage før kl. 16:00, hvis ikke udfyldt
- Dashboard-link til gæstevisning

## Program/aktiviteter (Admin)
- Opret Programpunkter under event (fx Søvn, Arbejde, Fest, Rundvisning)
- Felter: navn, start, slut, beskrivelse
- Synlighed pr. Programpunktet: kan skjules for gæster fx.
- Redigér og slet aktiviteter

## Tidslinje
- Tidslinje viser: Begivenheder (øverst), Måltider, og gæsternes komme/gå-perioder
- Gæster ser kun aktiviteter der er markeret som synlige
- Overlap beregnes mod gæsternes comes_at/leaves_at

## Måltider (Admin)
- Opret/ret/slet måltider med navn, dato, start/slut, "Svar senest" og beskrivelse
- Admin har én samlet kalender, som viser både måltider og programpunkter med hver sin farve
- Admin kan klikke eller trække i den samlede kalender og vælger derefter måltid eller programpunkt
- Måltider og programpunkter skal ligge inden for eventets start og slut
- Slut auto-sættes til +1 time, hvis ikke udfyldt
- Bulk-opret standardmåltider pr. dag (morgenmad/frokost/aftensmad)
- Måltidsoverblik viser deltager, måske og forventet baseret på overlap

## Måltider (Gæst)
- Gæst kan svare pr. måltid: ja/nej/måske
- Svar kan ændres løbende, også efter "Deadline for tilmelding"
- En Gæst hvis en Gæst er tilstede deltager de i Måltider, med minder de har valgt det fra

## "Deadline for tilmelding" og ændringslog
- "Deadline for tilmelding" er standard et tidspunkt
- måltid "Deadline for tilmelding" følger eventet "Deadline for tilmelding" men kan ændres 
- Ændringer efter "Deadline for tilmelding" markeres med badge og logges i ChangeLog
- Måltidsdetalje viser tabel med før/efter
- Badge på event-side linker direkte til "Deadline for tilmelding""

## Gæster og personer (Admin)
- Opret gæst og kopier invite-link
- Gæstefamilie/gruppe understøtter flere personer (companions)
- Eventejeren vælger én fælles eventregel for, om gæster må tilføje én partner, børn eller begge dele
- Eventreglen gælder automatisk for alle invitationer, er som standard slået fra og vises tydeligt i både admin- og gæstevisningen
- Gæsten kan navngive og fjerne sin tilføjede partner og sine børn
- Auto-gem for ændring af person-type (Voksen/Barn)
- Event-status kan opdateres for hele gruppen

## Kommer/Går
- Nye og eksisterende invitationer uden særlige tider deltager som standard fra eventets start til slut
- Den sammenfoldede gæstesektion fortæller tydeligt, at den kun skal åbnes, hvis gæsten ikke kan deltage hele tiden
- Gæster kan vælge hele eventets tidsrum eller angive flere komme/gå-tidsrum
- Hvert tidsrum skal ligge inden for eventet og må ikke overlappe et andet tidsrum
- Alle tidsrum bruges til overlap-beregning for måltider
- Komme/gå-kalenderen viser deltagelsestider, måltider og synlige programpunkter i ét samlet layout

## Kost og noter
- Gæster vælger kosttype + noter
- Admin kan opdatere kost for hver person
- Kost-hensyn vises i export og meal detaljer

## Chat
- Event-chat hvor gæster kan skrive og se beskeder
- Viser forfatter og tidspunkt

## Eksport (Admin)
- Standard eksport: én række pr. deltager pr. måltid med event, invitation,
  navn, voksen/barn, event- og måltidsstatus, forventet deltagelse,
  komme/gå-tider, kosthensyn, deadlineændringer og måltidets totaler
- Kompakt navneeksport: forventede deltagere (navne), måske (navne) og total måske

## Dashboard (Gæst)
- Event-info + tidslinje + måltider + chat
- Gæster kan som standard se Gæstelisten med andre invitationers displaynavn og status (Inviterede/Deltager/Måske/Deltager ikke)
- Gæstelisten vises åbent øverst på gæstesiden med statusoptælling og en kompakt navneliste
- Eventejeren kan under Eventindstillinger skjule gæstelisten for alle gæster
- Gæstelisten viser aldrig invitationslinks, kostoplysninger eller andre private detaljer
- ICS-download til kalender er tilgængelig i gæste-flow

## Validering og defaults
- Slut skal være efter start for events og begivenheder
- Måltider slut skal være efter start
- "Svar senest", sluttid og overlap håndteres server-side og i UI

## UI
- Standard darkmode med mulighed for light
- favicon skal lige en begivenheder i røde farver
- icon.svg er logo og ligger i /
- accentfarve rød lig Favicon 
- Teksten i tab i browser skal være "HMRDTM"
- Det skal være Mobile first


## Teknisk

- React 
- SQLite (WAL)
- Administrator kan ændre det viste navn på både sin egen konto og øvrige brugere fra brugeradministrationen. Navnet bruges i adminoversigten og ved visning af eventejere.
- På gæstesiden gemmes Ja, Måske og Deltager ikke med det samme. Deltagelsesstatus vises som en kompakt, selvstændig del adskilt fra displaynavn, kost og partner/børn.
- Måltider følger automatisk invitationens eventstatus for gæsten, partner og børn. Ved eventstatus Ja tæller alle med ved måltider, som overlapper komme/gå-tiderne. Kun eksplicitte måltidsafvigelser (Ja, Måske eller Nej) overskriver eventstatus; Måske og Nej tæller ikke som forventede.
- Valget “Deltag i hele eventet” gemmer eventets præcise start og slut uden tidszoneforskydning. Standardtidsrummet følger automatisk med, hvis administratoren senere ændrer eventets start eller slut.
