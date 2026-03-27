/**
 * Pre-compute embeddings for all chapter descriptions.
 * Run: npx tsx scripts/generate-embeddings.ts
 * Output: src/lib/server/embeddings.json
 */

const JINA_API_KEY = 'jina_260992f1705140168cadd54e270abdb4KFBgzkQty27un7YvuzV5wi2djSgp';
const JINA_API_URL = 'https://api.jina.ai/v1/embeddings';

interface ChapterDesc {
  regulation: string;
  dir: string;
  file: string;
  label: string;
  description: string; // what this chapter covers — used for embedding
}

// Every chapter with a human-readable description of its content
const CHAPTERS: ChapterDesc[] = [
  // K2
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '01-tillämpning.md', label: 'K2 Kap 1 – Tillämpning', description: 'K2 tillämpning: vilka företag får använda K2, definitioner, punkt 1.7 (val att använda K3-regler), aktiebolag, ekonomiska föreningar, handelsbolag, ideella föreningar, stiftelser, filialer' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '02-redovisningsprinciper.md', label: 'K2 Kap 2 – Redovisningsprinciper', description: 'K2 grundläggande redovisningsprinciper: periodisering av fakturor och kostnader, periodiseringsgräns 7000 kronor (punkt 2.4 behöver inte periodisera under 7000 kr), väsentlighet, försiktighet, fortlevnad, konsekvent tillämpning, individuell värdering, kvittningsförbud, kontinuitet, schablonmässig värdering, byten, händelser efter balansdagen, rättelse av fel, måste jag periodisera' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '03-årsredovisningens-utformning.md', label: 'K2 Kap 3 – Utformning', description: 'K2 årsredovisningens utformning: presentation, delar, språk, form, valuta, belopp, undertecknande, datering, jämförelsetal' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '04a-uppställningsformer-resultaträkning.md', label: 'K2 Kap 4a – Uppställningsformer RR', description: 'K2 uppställningsform för resultaträkningen: nettoomsättning, förändring lager, övriga rörelseintäkter, råvaror, personalkostnader, avskrivningar, övriga rörelsekostnader, finansiella poster, bokslutsdispositioner, skatt' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '04b-uppställningsformer-balansräkning.md', label: 'K2 Kap 4b – Uppställningsformer BR', description: 'K2 uppställningsform för balansräkningen: anläggningstillgångar, omsättningstillgångar, eget kapital, obeskattade reserver, avsättningar, långfristiga skulder, kortfristiga skulder, poster i balansräkningen' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '04c-uppställningsformer-särskilda-regler.md', label: 'K2 Kap 4c – Uppställningsformer särskilda', description: 'K2 särskilda uppställningsformer per företagsform: aktiebolag, ekonomiska föreningar, handelsbolag, stiftelser, ideella föreningar, samfällighetsföreningar, filialer' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '05-förvaltningsberättelsen.md', label: 'K2 Kap 5 – Förvaltningsberättelsen', description: 'K2 förvaltningsberättelse: verksamheten, flerårsöversikt, hållbarhet, förändringar i eget kapital, väsentliga händelser, särskilda regler per företagsform' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '06a-rörelseintäkter-grundregler.md', label: 'K2 Kap 6a – Rörelseintäkter grundregler', description: 'K2 rörelseintäkter: vad är en inkomst, hur stor är inkomsten, när blir inkomst intäkt, varuförsäljning, tjänsteuppdrag, entreprenaduppdrag, provisionsbaserade uppdrag, uppdrag löpande räkning, uppdrag fast pris, successiv vinstavräkning huvudregel, alternativregel, färdigställandegrad' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '06b-rörelseintäkter-övriga-och-särskilda.md', label: 'K2 Kap 6b – Rörelseintäkter övriga', description: 'K2 övriga rörelseintäkter: hyra, leasing intäkt, royalty, provision, franchise, försäkringsersättning, skadestånd, gåva, bidrag offentligt, realisationsvinst, tilläggsköpeskilling, medlemsavgift, särskilda regler ekonomiska föreningar handelsbolag stiftelser ideella föreningar samfällighetsföreningar' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '07-rörelsekostnader.md', label: 'K2 Kap 7 – Rörelsekostnader', description: 'K2 rörelsekostnader: utgift, kostnad, periodisering av utgifter, leasing kostnad, leasingavgift, personalutgifter, bonus, försäkring, försäljning utrangering anläggningstillgångar, realisationsförlust, förenklingsregel 7000 kr' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '08-finansiella-poster.md', label: 'K2 Kap 8 – Finansiella poster', description: 'K2 finansiella poster: ränteintäkter, räntekostnader, utdelning, realisationsresultat finansiella tillgångar, kapitalförsäkring uttag, emissionsinsats, vinstutdelning, bokslutsdispositioner, skatt på årets resultat' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '09-tillgångar.md', label: 'K2 Kap 9 – Tillgångar', description: 'K2 tillgångar: anläggningstillgång vs omsättningstillgång, klassificering, anskaffningsvärde beräkning, tillgång genom köp gåva testamente byte, tillskjuten egendom, omklassificering' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '10a-anläggningstillgångar-anskaffning-avskrivning.md', label: 'K2 Kap 10a – Anl.tillgångar anskaffning/avskrivning', description: 'K2 immateriella och materiella anläggningstillgångar: definition, anskaffningsvärde, tillkommande utgifter, avskrivning linjär, nyttjandeperiod, 5-årsregel inventarier, inventarier mindre värde 25000 kr, goodwill, förbättringsutgift annans fastighet, koncessioner patent, byggnader mark maskiner' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '10b-anläggningstillgångar-nedskrivning-särskilda.md', label: 'K2 Kap 10b – Nedskrivning', description: 'K2 nedskrivning av immateriella och materiella anläggningstillgångar: nedskrivningsbehov, indikation, bestående värdeminskning, återföring av nedskrivning, uppskrivning aktiebolag, uppskrivningsfond' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '11-finansiella-anläggningstillgångar.md', label: 'K2 Kap 11 – Finansiella anl.tillgångar', description: 'K2 finansiella anläggningstillgångar: aktiepost aktieinnehav andelar obligationer, nedskrivning av aktier, nedskrivning finansiell anläggningstillgång, gränsvärde nedskrivning 25 000 kronor, anskaffningsvärde, kollektiv värdering, värdepappersportfölj, noterade onoterade, nollvärdering, kapitalförsäkring' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '12-varulager.md', label: 'K2 Kap 12 – Varulager', description: 'K2 varulager: anskaffningsvärde, inköpspris, tillverkningskostnad, FIFU först-in-först-ut, nettoförsäljningsvärde, inkurans, lägsta värdets princip, egentillverkade varor, handelsvaror, pågående arbete, kollektiv värdering, detaljhandelsföretag' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '13-kortfristiga-fordringar.md', label: 'K2 Kap 13 – Kortfristiga fordringar', description: 'K2 kortfristiga fordringar: kundfordran, osäker fordran, nedskrivning fordran, kundförlust, valutafordran' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '14-kortfristiga-placeringar.md', label: 'K2 Kap 14 – Kortfristiga placeringar', description: 'K2 kortfristiga placeringar kassa bank: likvida medel, bankgiro, postgiro, kontantkassa, redovisningsmedel, placering aktier kortfristigt' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '15-eget-kapital.md', label: 'K2 Kap 15 – Eget kapital', description: 'K2 eget kapital och obeskattade reserver: aktiekapital, reservfond, fritt eget kapital, insättningar uttag, obeskattade reserver, periodiseringsfond, överavskrivning, ackumulerade överavskrivningar, särskilda regler per företagsform' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '16-avsättningar.md', label: 'K2 Kap 16 – Avsättningar', description: 'K2 avsättningar: garantiavsättning, pensionsavsättning, pensionsförpliktelse, tryggandelagen, kapitalförsäkring, särskild löneskatt, eventualförpliktelse, omstrukturering, 500000 kr gränsvärde' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '17-skulder.md', label: 'K2 Kap 17 – Skulder', description: 'K2 skulder: leverantörsskuld, skatteskuld, moms, semesterlöneskuld, upplupna kostnader, förutbetalda intäkter, checkräkningskredit, långfristiga skulder, kortfristiga skulder, offentliga bidrag' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '18-noter.md', label: 'K2 Kap 18 – Noter', description: 'K2 noter: redovisningsprinciper, anläggningstillgångar, ackumulerade avskrivningar, ställda säkerheter, ansvarsförbindelser, eventualförpliktelser, upplysningskrav' },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '19-koncern-intresseföretag.md', label: 'K2 Kap 19 – Koncern/intresseföretag', description: 'K2 koncern och intresseföretag: dotterföretag, intresseföretag, gemensamt styrda företag, andelar, anskaffningsvärde, nedskrivning, koncernbidrag, utdelning från dotterföretag' },

  // K3
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '09-koncernredovisning.md', label: 'K3 Kap 9 – Koncernredovisning', description: 'K3 koncernredovisning: dotterföretag konsolidering, förvärvsmetoden, förvärvsanalys, eliminering koncerninterna transaktioner, minoritetsintresse, avyttring dotterföretag, stegvisa förvärv' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '17-materiella-anläggningstillgångar.md', label: 'K3 Kap 17 – Materiella anl.tillgångar', description: 'K3 materiella anläggningstillgångar: komponentavskrivning, anskaffningsvärde, tillkommande utgifter, avskrivning, nyttjandeperiod, restvärde, nedskrivning, uppskrivning, utrangering, mark och byggnader, maskiner inventarier' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '18-immateriella-tillgångar.md', label: 'K3 Kap 18 – Immateriella tillgångar', description: 'K3 immateriella tillgångar utom goodwill: egenupparbetade, forskningsfas, utvecklingsfas, aktivering utvecklingsutgifter, identifierbarhet, patent, licens, varumärke, koncessioner, nyttjandeperiod, avskrivning, fond utvecklingsutgifter' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '19-rörelseförvärv-goodwill.md', label: 'K3 Kap 19 – Rörelseförvärv/goodwill', description: 'K3 rörelseförvärv och goodwill: förvärvsmetoden, köpare identifiering, anskaffningsvärde förvärv, verkligt värde tillgångar skulder, goodwill positiv negativ, nyttjandeperiod goodwill, inkråmsförvärv' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '20-leasingavtal.md', label: 'K3 Kap 20 – Leasingavtal', description: 'K3 leasingavtal: finansiell leasing, operationell leasing, klassificering, leasetagare, leasegivare, sale-and-lease-back, leasad tillgång, leasingskuld, avskrivning leasad tillgång' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '23-intäkter.md', label: 'K3 Kap 23 – Intäkter', description: 'K3 intäkter: varuförsäljning, tjänsteuppdrag, entreprenadavtal, successiv vinstavräkning (tvingande i K3), färdigställandegrad, ränta, royalty, utdelning intäkt' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '27-nedskrivningar.md', label: 'K3 Kap 27 – Nedskrivningar', description: 'K3 nedskrivningar: indikation på nedskrivningsbehov, återvinningsvärde, verkligt värde minus försäljningskostnader, nyttjandevärde, kassagenererande enhet, goodwill nedskrivning, återföring' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '29-inkomstskatter.md', label: 'K3 Kap 29 – Inkomstskatter', description: 'K3 inkomstskatter: aktuell skatt, uppskjuten skatt, uppskjuten skattefordran, uppskjuten skatteskuld, temporär skillnad, skattemässigt underskott, obeskattade reserver i juridisk person' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '28-ersättningar-anställda.md', label: 'K3 Kap 28 – Ersättningar anställda', description: 'K3 ersättningar till anställda: kortfristiga ersättningar, pension, förmånsbestämda planer, avgiftsbestämda planer, övriga långfristiga ersättningar, uppsägningsersättningar' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '30-valutakurser.md', label: 'K3 Kap 30 – Valutakurser', description: 'K3 valutakurser: omräkning utländsk valuta, monetära poster, balansdagskurs, kursvinst kursförlust, nettoinvestering utlandsverksamhet, omräkning dotterföretag' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '38-bostadsrättsföreningar.md', label: 'K3 Kap 38 – Bostadsrättsföreningar', description: 'K3 bostadsrättsföreningar: årsavgift per kvm, skuldsättning per kvm, sparande per kvm, räntekänslighet, energikostnad, komponentavskrivning byggnad, underhållsfond, kassaflödesanalys BRF' },
  { regulation: 'K3', dir: 'k3-arsredovisning', file: '11-finansiella-instrument-anskaffning.md', label: 'K3 Kap 11 – Fin.instrument (anskaffning)', description: 'K3 finansiella instrument värderade till anskaffningsvärde: definition, klassificering, effektivräntemetoden, nedskrivning, borttagande, säkringsredovisning, sammansatta instrument' },

  // Bokföring
  { regulation: 'Bokföring', dir: 'bokforing', file: '02-löpande-bokföring.md', label: 'Bokföring Kap 2 – Löpande bokföring', description: 'Löpande bokföring: registreringsordning, systematisk ordning, grundbokföring, huvudbok, kontoplan, rättelse bokföringspost, bokslutstransaktioner, flera verksamheter' },
  { regulation: 'Bokföring', dir: 'bokforing', file: '03-tidpunkt-bokföring.md', label: 'Bokföring Kap 3 – Tidpunkt', description: 'Tidpunkt för bokföring: kontantmetoden, faktureringsmetoden, senareläggning, när ska kontanta betalningar bokföras, andra affärshändelser, tre arbetsdagar, en arbetsdag' },
  { regulation: 'Bokföring', dir: 'bokforing', file: '05-verifikationer.md', label: 'Bokföring Kap 5 – Verifikationer', description: 'Verifikationer: vad är en verifikation, kvitto, faktura, innehåll, verifikationsnummer, nummerföljd, hänvisningsverifikation, rättelse av verifikation' },
  { regulation: 'Bokföring', dir: 'bokforing', file: '08-arkivering.md', label: 'Bokföring Kap 8 – Arkivering', description: 'Arkivering av räkenskapsinformation: hur ska arkivering ske, var ska arkivering ske, hur länge ska bokföringen sparas, sju år, 7 år, förstöring av bokföring, vem ansvarar' },

  // Fusioner
  { regulation: 'Fusioner', dir: 'fusioner', file: '02-redovisning-fusion.md', label: 'Fusioner Kap 2 – Redovisning av fusion', description: 'Redovisning av fusion: absorption, dotterbolag helägt, fusionsvederlag, värdering övertagna tillgångar skulder, eliminering, obeskattade reserver, fusionsdifferens positiv negativ, bundet eget kapital, internvinster, koncernmässiga värden' },
  { regulation: 'Fusioner', dir: 'fusioner', file: '03-nedströmsfusion.md', label: 'Fusioner Kap 3 – Nedströmsfusion', description: 'Nedströmsfusion: moderbolaget är överlåtande företag, dotterbolaget är övertagande, värdering tillgångar skulder, fusionsdifferens, bundet eget kapital' },

  // Gränsvärden
  { regulation: 'Gränsvärden', dir: 'gransvarden', file: '01-allmant-rad.md', label: 'Gränsvärden – Allmänt råd', description: 'Gränsvärden: storleksgränser för företag och koncerner, antal anställda 50, balansomslutning 40 miljoner, nettoomsättning 80 miljoner, välja K1 K2 K3, större mindre företag, två av tre gränsvärden' },

  // BRF
  { regulation: 'BRF', dir: 'brf-upplysningar', file: '02-nyckeltal.md', label: 'BRF – Nyckeltal', description: 'BRF bostadsrättsförening kompletterande upplysningar: nyckeltal, årsavgift per kvadratmeter, skuldsättning per kvadratmeter, sparande per kvadratmeter, räntekänslighet, energikostnad per kvadratmeter' },
];

async function generateEmbeddings() {
  console.log(`Generating embeddings for ${CHAPTERS.length} chapters...`);

  const descriptions = CHAPTERS.map(c => c.description);

  // Batch in groups of 20
  const BATCH_SIZE = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < descriptions.length; i += BATCH_SIZE) {
    const batch = descriptions.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(descriptions.length / BATCH_SIZE)} (${batch.length} items)...`);

    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: batch,
        normalized: true,
        embedding_type: 'float',
        task: 'retrieval.passage',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Jina API error ${response.status}: ${err}`);
    }

    const data = await response.json() as { data: { embedding: number[] }[] };
    for (const item of data.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  // Build output: chapters with their embeddings
  const output = CHAPTERS.map((ch, i) => ({
    regulation: ch.regulation,
    dir: ch.dir,
    file: ch.file,
    label: ch.label,
    description: ch.description,
    embedding: allEmbeddings[i],
  }));

  // Write to JSON
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.join(import.meta.dirname, '..', 'src', 'lib', 'server', 'embeddings.json');
  fs.writeFileSync(outPath, JSON.stringify(output));

  const fileSizeKB = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`Done! Written ${output.length} embeddings to ${outPath} (${fileSizeKB} KB)`);
  console.log(`Embedding dimension: ${allEmbeddings[0].length}`);
}

generateEmbeddings().catch(console.error);
