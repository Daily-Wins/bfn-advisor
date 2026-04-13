/**
 * Routes a user question to the most relevant knowledge base chapters.
 *
 * Three-layer matching (all instant, 0ms):
 * 1. Punkt-number detection: "punkt 10.27" → direct file match
 * 2. Regulation preference: "K2" / "K3" in question → boost that regulation
 * 3. Keyword scoring: weighted keyword matching across all chapters
 */

export interface ChapterMatch {
  regulation: string;
  dir: string;
  file: string;
  score: number;
  label: string;
}

interface RouteEntry {
  keywords: string[];
  regulation: string;
  dir: string;
  file: string;
  label: string;
  punktRange?: [number, number]; // [from, to] punkt numbers in this chapter
}

// Punkt-number ranges per chapter for direct lookup
const PUNKT_INDEX: { regulation: string; dir: string; file: string; label: string; from: number; to: number; prefix?: string }[] = [
  // K2
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '01-tillämpning.md', label: 'K2 Kap 1 – Tillämpning', from: 1.1, to: 1.7 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '02-redovisningsprinciper.md', label: 'K2 Kap 2 – Redovisningsprinciper', from: 2.1, to: 2.12 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '03-årsredovisningens-utformning.md', label: 'K2 Kap 3 – Årsredovisningens utformning', from: 3.1, to: 3.14 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '04a-uppställningsformer-resultaträkning.md', label: 'K2 Kap 4a – Uppställningsformer RR', from: 4.1, to: 4.5 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '04b-uppställningsformer-balansräkning.md', label: 'K2 Kap 4b – Uppställningsformer BR', from: 4.6, to: 4.8 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '04c-uppställningsformer-särskilda-regler.md', label: 'K2 Kap 4c – Uppställningsformer särskilda', from: 4.9, to: 4.37 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '05-förvaltningsberättelsen.md', label: 'K2 Kap 5 – Förvaltningsberättelsen', from: 5.1, to: 5.10 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '06a-rörelseintäkter-grundregler.md', label: 'K2 Kap 6a – Rörelseintäkter grundregler', from: 6.1, to: 6.25 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '06b-rörelseintäkter-övriga-och-särskilda.md', label: 'K2 Kap 6b – Rörelseintäkter övriga', from: 6.26, to: 6.43 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '07-rörelsekostnader.md', label: 'K2 Kap 7 – Rörelsekostnader', from: 7.1, to: 7.21 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '08-finansiella-poster.md', label: 'K2 Kap 8 – Finansiella poster', from: 8.1, to: 8.10 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '09-tillgångar.md', label: 'K2 Kap 9 – Tillgångar', from: 9.1, to: 9.19 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '10a-anläggningstillgångar-anskaffning-avskrivning.md', label: 'K2 Kap 10a – Anl.tillgångar anskaffning/avskrivning', from: 10.1, to: 10.30 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '10b-anläggningstillgångar-nedskrivning-särskilda.md', label: 'K2 Kap 10b – Anl.tillgångar nedskrivning', from: 10.31, to: 10.43 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '11-finansiella-anläggningstillgångar.md', label: 'K2 Kap 11 – Finansiella anl.tillgångar', from: 11.1, to: 11.26 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '12-varulager.md', label: 'K2 Kap 12 – Varulager', from: 12.1, to: 12.20 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '13-kortfristiga-fordringar.md', label: 'K2 Kap 13 – Kortfristiga fordringar', from: 13.1, to: 13.6 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '14-kortfristiga-placeringar.md', label: 'K2 Kap 14 – Kortfristiga placeringar', from: 14.1, to: 14.11 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '15-eget-kapital.md', label: 'K2 Kap 15 – Eget kapital', from: 15.1, to: 15.24 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '16-avsättningar.md', label: 'K2 Kap 16 – Avsättningar', from: 16.1, to: 16.20 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '17-skulder.md', label: 'K2 Kap 17 – Skulder', from: 17.1, to: 17.10 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '18-noter.md', label: 'K2 Kap 18 – Noter', from: 18.1, to: 18.24 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '19-koncern-intresseföretag.md', label: 'K2 Kap 19 – Koncern/intresseföretag', from: 19.1, to: 19.22 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '20-byte-till-detta-allmänna-råd.md', label: 'K2 Kap 20 – Byte till K2', from: 20.1, to: 20.17 },
  { regulation: 'K2', dir: 'k2-arsredovisning', file: '21-kassaflödesanalys.md', label: 'K2 Kap 21 – Kassaflödesanalys', from: 21.1, to: 21.20 },
];

const ROUTES: RouteEntry[] = [
  // ===== K2 Årsredovisning =====
  { keywords: ['tillämpning', 'vilka företag', 'k2 eller k3', 'välja regelverk', 'mindre företag årsredovisning', 'punkt 1.7'], regulation: 'K2', dir: 'k2-arsredovisning', file: '01-tillämpning.md', label: 'K2 Kap 1 – Tillämpning' },
  { keywords: ['redovisningsprincip', 'väsentlighet', 'försiktighet', 'periodisering', 'fortlevnad', 'kontinuitet', 'kvittning', 'bruttoredovisning', 'konsekvent', 'händelse efter balansdag', 'rättelse av fel', 'schablonmässig'], regulation: 'K2', dir: 'k2-arsredovisning', file: '02-redovisningsprinciper.md', label: 'K2 Kap 2 – Redovisningsprinciper' },
  { keywords: ['årsredovisningens utformning', 'presentation', 'undertecknande', 'jämförelsetal', 'valuta belopp'], regulation: 'K2', dir: 'k2-arsredovisning', file: '03-årsredovisningens-utformning.md', label: 'K2 Kap 3 – Utformning' },
  { keywords: ['uppställningsform resultaträkning', 'resultaträkningens poster', 'uppställningsform rr'], regulation: 'K2', dir: 'k2-arsredovisning', file: '04a-uppställningsformer-resultaträkning.md', label: 'K2 Kap 4a – Uppställningsformer RR' },
  { keywords: ['uppställningsform balansräkning', 'balansräkningens poster', 'uppställningsform br'], regulation: 'K2', dir: 'k2-arsredovisning', file: '04b-uppställningsformer-balansräkning.md', label: 'K2 Kap 4b – Uppställningsformer BR' },
  { keywords: ['förvaltningsberättelse', 'flerårsöversikt', 'verksamhetsbeskrivning', 'hållbarhet'], regulation: 'K2', dir: 'k2-arsredovisning', file: '05-förvaltningsberättelsen.md', label: 'K2 Kap 5 – Förvaltningsberättelsen' },
  { keywords: ['intäkt', 'inkomst', 'varuförsäljning', 'uppdrag löpande räkning', 'uppdrag fast pris', 'successiv vinstavräkning', 'alternativregel', 'nettoomsättning', 'rörelseintäkt', 'tjänsteuppdrag', 'entreprenaduppdrag', 'färdigställandegrad', 'provisionsbaserat'], regulation: 'K2', dir: 'k2-arsredovisning', file: '06a-rörelseintäkter-grundregler.md', label: 'K2 Kap 6a – Rörelseintäkter grundregler' },
  { keywords: ['bidrag offentligt', 'gåva redovisning', 'realisationsvinst', 'hyresintäkt', 'royalty', 'provision intäkt', 'försäkringsersättning', 'skadestånd intäkt', 'medlemsavgift intäkt', 'franchiseavgift'], regulation: 'K2', dir: 'k2-arsredovisning', file: '06b-rörelseintäkter-övriga-och-särskilda.md', label: 'K2 Kap 6b – Övriga intäkter' },
  { keywords: ['kostnad', 'utgift', 'rörelsekostnad', 'personalkostnad', 'leasing kostnad', 'leasingavgift', 'utrangering', 'realisationsförlust', 'försäkring kostnad', 'förenklingsregel'], regulation: 'K2', dir: 'k2-arsredovisning', file: '07-rörelsekostnader.md', label: 'K2 Kap 7 – Rörelsekostnader' },
  { keywords: ['finansiell post', 'ränteintäkt', 'räntekostnad', 'utdelning intäkt', 'bokslutsdisposition', 'skatt årets resultat', 'kapitalförsäkring', 'emissionsinsats'], regulation: 'K2', dir: 'k2-arsredovisning', file: '08-finansiella-poster.md', label: 'K2 Kap 8 – Finansiella poster' },
  { keywords: ['tillgång klassificering', 'anskaffningsvärde beräkning', 'omsättningstillgång', 'anläggningstillgång definition', 'tillgång gåva', 'tillgång testamente', 'tillgång byte'], regulation: 'K2', dir: 'k2-arsredovisning', file: '09-tillgångar.md', label: 'K2 Kap 9 – Tillgångar' },
  { keywords: ['avskrivning', 'inventarie', 'maskin avskrivning', 'byggnad avskrivning', 'nyttjandeperiod', 'goodwill', 'förbättringsutgift', 'immateriell anläggningstillgång', 'materiell anläggningstillgång', 'aktivering', 'anskaffningsvärde anläggningstillgång', '5 år schablon', 'direktavdrag', 'mindre värde'], regulation: 'K2', dir: 'k2-arsredovisning', file: '10a-anläggningstillgångar-anskaffning-avskrivning.md', label: 'K2 Kap 10a – Anl.tillgångar anskaffning/avskrivning' },
  { keywords: ['nedskrivning anläggningstillgång', 'uppskrivning', 'återföring nedskrivning', 'nedskrivningsbehov'], regulation: 'K2', dir: 'k2-arsredovisning', file: '10b-anläggningstillgångar-nedskrivning-särskilda.md', label: 'K2 Kap 10b – Nedskrivning' },
  { keywords: ['finansiell anläggningstillgång', 'aktie anläggningstillgång', 'obligation', 'andel', 'värdepapper långsiktigt', 'nedskrivning aktie'], regulation: 'K2', dir: 'k2-arsredovisning', file: '11-finansiella-anläggningstillgångar.md', label: 'K2 Kap 11 – Finansiella anl.tillgångar' },
  { keywords: ['varulager', 'lager värdering', 'inkurans', 'nettoförsäljningsvärde', 'fifu', 'först in först ut', 'egentillverkade varor', 'pågående arbete', 'lagervärdering'], regulation: 'K2', dir: 'k2-arsredovisning', file: '12-varulager.md', label: 'K2 Kap 12 – Varulager' },
  { keywords: ['kundfordran', 'kortfristig fordran', 'osäker fordran', 'kundförlust', 'fordran nedskrivning'], regulation: 'K2', dir: 'k2-arsredovisning', file: '13-kortfristiga-fordringar.md', label: 'K2 Kap 13 – Kortfristiga fordringar' },
  { keywords: ['kortfristig placering', 'kassa', 'bank', 'likvida medel', 'värdepapper kortfristigt'], regulation: 'K2', dir: 'k2-arsredovisning', file: '14-kortfristiga-placeringar.md', label: 'K2 Kap 14 – Kortfristiga placeringar' },
  { keywords: ['eget kapital', 'obeskattade reserver', 'periodiseringsfond', 'överavskrivning', 'aktiekapital', 'fritt eget kapital', 'bundet eget kapital', 'insättningar uttag'], regulation: 'K2', dir: 'k2-arsredovisning', file: '15-eget-kapital.md', label: 'K2 Kap 15 – Eget kapital' },
  { keywords: ['avsättning', 'garantiavsättning', 'pension avsättning', 'eventualförpliktelse', 'pensionsskuld', 'särskild löneskatt pension'], regulation: 'K2', dir: 'k2-arsredovisning', file: '16-avsättningar.md', label: 'K2 Kap 16 – Avsättningar' },
  { keywords: ['skuld', 'leverantörsskuld', 'skatteskuld', 'semesterlöneskuld', 'upplupna kostnader', 'förutbetalda intäkter', 'checkräkningskredit'], regulation: 'K2', dir: 'k2-arsredovisning', file: '17-skulder.md', label: 'K2 Kap 17 – Skulder' },
  { keywords: ['not', 'upplysning', 'noter', 'tilläggsupplysning', 'ställda säkerheter', 'ansvarsförbindelse'], regulation: 'K2', dir: 'k2-arsredovisning', file: '18-noter.md', label: 'K2 Kap 18 – Noter' },
  { keywords: ['koncern k2', 'dotterföretag k2', 'intresseföretag k2', 'koncernbidrag', 'andelar koncernföretag'], regulation: 'K2', dir: 'k2-arsredovisning', file: '19-koncern-intresseföretag.md', label: 'K2 Kap 19 – Koncern/intresseföretag' },
  { keywords: ['byte regelverk', 'byta till k2', 'övergång k2'], regulation: 'K2', dir: 'k2-arsredovisning', file: '20-byte-till-detta-allmänna-råd.md', label: 'K2 Kap 20 – Byte till K2' },
  { keywords: ['kassaflödesanalys k2', 'kassaflöde'], regulation: 'K2', dir: 'k2-arsredovisning', file: '21-kassaflödesanalys.md', label: 'K2 Kap 21 – Kassaflödesanalys' },

  // ===== K3 Årsredovisning =====
  { keywords: ['k3 tillämpning', 'koncernredovisning regler', 'ifrs sme'], regulation: 'K3', dir: 'k3-arsredovisning', file: '01-tillämpning.md', label: 'K3 Kap 1 – Tillämpning' },
  { keywords: ['k3 princip', 'verkligt värde princip', 'rättvisande bild', 'k3 begrepp'], regulation: 'K3', dir: 'k3-arsredovisning', file: '02-begrepp-principer.md', label: 'K3 Kap 2 – Begrepp och principer' },
  { keywords: ['k3 utformning', 'k3 förvaltningsberättelse', 'juridisk person redovisning'], regulation: 'K3', dir: 'k3-arsredovisning', file: '03-utformning.md', label: 'K3 Kap 3 – Utformning' },
  { keywords: ['k3 balansräkning', 'k3 klassificering tillgång skuld'], regulation: 'K3', dir: 'k3-arsredovisning', file: '04-balansräkning.md', label: 'K3 Kap 4 – Balansräkning' },
  { keywords: ['k3 resultaträkning', 'k3 kostnadsslagsindelad', 'k3 funktionsindelad'], regulation: 'K3', dir: 'k3-arsredovisning', file: '05-resultaträkning.md', label: 'K3 Kap 5 – Resultaträkning' },
  { keywords: ['förändring eget kapital', 'specifikation eget kapital', 'k3 koncernbidrag'], regulation: 'K3', dir: 'k3-arsredovisning', file: '06-förändring-eget-kapital.md', label: 'K3 Kap 6 – Förändring eget kapital' },
  { keywords: ['kassaflödesanalys k3', 'kassaflöde k3', 'indirekt metod', 'direkt metod'], regulation: 'K3', dir: 'k3-arsredovisning', file: '07-kassaflödesanalys.md', label: 'K3 Kap 7 – Kassaflödesanalys' },
  { keywords: ['k3 noter', 'k3 upplysning', 'större företag noter', 'mindre företag noter'], regulation: 'K3', dir: 'k3-arsredovisning', file: '08-noter.md', label: 'K3 Kap 8 – Noter' },
  { keywords: ['koncernredovisning', 'dotterföretag konsolidering', 'förvärvsmetod', 'minoritetsintresse', 'eliminering koncern'], regulation: 'K3', dir: 'k3-arsredovisning', file: '09-koncernredovisning.md', label: 'K3 Kap 9 – Koncernredovisning' },
  { keywords: ['byte redovisningsprincip', 'ändrad uppskattning', 'k3 rättelse fel', 'retroaktiv tillämpning'], regulation: 'K3', dir: 'k3-arsredovisning', file: '10-byte-princip.md', label: 'K3 Kap 10 – Byte princip/rättelse' },
  { keywords: ['finansiellt instrument anskaffningsvärde', 'k3 lån', 'k3 fordran', 'k3 kundfordran', 'k3 leverantörsskuld', 'effektivräntemetoden', 'säkring'], regulation: 'K3', dir: 'k3-arsredovisning', file: '11-finansiella-instrument-anskaffning.md', label: 'K3 Kap 11 – Fin.instrument (anskaffning)' },
  { keywords: ['verkligt värde finansiellt', 'derivat', 'säkringsredovisning k3', 'inbäddat derivat', 'k3 aktie verkligt värde'], regulation: 'K3', dir: 'k3-arsredovisning', file: '12-finansiella-instrument-verkligt-värde.md', label: 'K3 Kap 12 – Fin.instrument (verkligt värde)' },
  { keywords: ['k3 varulager', 'k3 lager', 'k3 tillverkningskostnad'], regulation: 'K3', dir: 'k3-arsredovisning', file: '13-varulager.md', label: 'K3 Kap 13 – Varulager' },
  { keywords: ['intresseföretag k3', 'kapitalandelsmetod', 'betydande inflytande'], regulation: 'K3', dir: 'k3-arsredovisning', file: '14-intresseföretag.md', label: 'K3 Kap 14 – Intresseföretag' },
  { keywords: ['joint venture', 'gemensamt styrt', 'klyvningsmetod', 'proportionell konsolidering'], regulation: 'K3', dir: 'k3-arsredovisning', file: '15-joint-venture.md', label: 'K3 Kap 15 – Joint venture' },
  { keywords: ['förvaltningsfastighet'], regulation: 'K3', dir: 'k3-arsredovisning', file: '16-förvaltningsfastigheter.md', label: 'K3 Kap 16 – Förvaltningsfastigheter' },
  { keywords: ['komponentavskrivning', 'k3 materiell anläggningstillgång', 'k3 avskrivning byggnad', 'k3 mark', 'k3 inventarie', 'uppskrivning k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '17-materiella-anläggningstillgångar.md', label: 'K3 Kap 17 – Materiella anl.tillgångar' },
  { keywords: ['egenupparbetad', 'immateriell tillgång k3', 'forskning utveckling', 'aktivera utvecklingsutgift', 'k3 patent', 'k3 licens'], regulation: 'K3', dir: 'k3-arsredovisning', file: '18-immateriella-tillgångar.md', label: 'K3 Kap 18 – Immateriella tillgångar' },
  { keywords: ['rörelseförvärv', 'goodwill k3', 'förvärvsanalys', 'negativ goodwill', 'inkråmsförvärv'], regulation: 'K3', dir: 'k3-arsredovisning', file: '19-rörelseförvärv-goodwill.md', label: 'K3 Kap 19 – Rörelseförvärv/goodwill' },
  { keywords: ['leasing k3', 'finansiell leasing', 'operationell leasing', 'leasingavtal k3', 'sale leaseback'], regulation: 'K3', dir: 'k3-arsredovisning', file: '20-leasingavtal.md', label: 'K3 Kap 20 – Leasingavtal' },
  { keywords: ['avsättning k3', 'eventualförpliktelse k3', 'eventualtillgång', 'omstrukturering avsättning'], regulation: 'K3', dir: 'k3-arsredovisning', file: '21-avsättningar.md', label: 'K3 Kap 21 – Avsättningar' },
  { keywords: ['skuld eget kapital klassificering', 'konvertibel', 'egna aktier'], regulation: 'K3', dir: 'k3-arsredovisning', file: '22-skulder-eget-kapital.md', label: 'K3 Kap 22 – Skulder/eget kapital' },
  { keywords: ['intäkt k3', 'intäktsredovisning k3', 'successiv vinstavräkning k3', 'entreprenad k3', 'ränta intäkt k3', 'royalty intäkt k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '23-intäkter.md', label: 'K3 Kap 23 – Intäkter' },
  { keywords: ['offentligt bidrag k3', 'statligt stöd', 'bidrag k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '24-offentliga-bidrag.md', label: 'K3 Kap 24 – Offentliga bidrag' },
  { keywords: ['låneutgift', 'aktivera ränta', 'lånekostnad k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '25-låneutgifter.md', label: 'K3 Kap 25 – Låneutgifter' },
  { keywords: ['aktierelaterad ersättning', 'optionsprogram', 'teckningsoption'], regulation: 'K3', dir: 'k3-arsredovisning', file: '26-aktierelaterade-ersättningar.md', label: 'K3 Kap 26 – Aktierelaterade ersättningar' },
  { keywords: ['nedskrivning k3', 'kassagenererande enhet', 'återvinningsvärde', 'nyttjandevärde', 'verkligt värde nedskrivning'], regulation: 'K3', dir: 'k3-arsredovisning', file: '27-nedskrivningar.md', label: 'K3 Kap 27 – Nedskrivningar' },
  { keywords: ['pension k3', 'ersättning anställda', 'förmånsbestämd', 'avgiftsbestämd', 'uppsägning ersättning'], regulation: 'K3', dir: 'k3-arsredovisning', file: '28-ersättningar-anställda.md', label: 'K3 Kap 28 – Ersättningar anställda' },
  { keywords: ['uppskjuten skatt', 'temporär skillnad', 'inkomstskatt k3', 'aktuell skatt k3', 'skattefordran'], regulation: 'K3', dir: 'k3-arsredovisning', file: '29-inkomstskatter.md', label: 'K3 Kap 29 – Inkomstskatter' },
  { keywords: ['valutakurs', 'utländsk valuta', 'omräkning dotterföretag', 'kursvinst', 'kursförlust'], regulation: 'K3', dir: 'k3-arsredovisning', file: '30-valutakurser.md', label: 'K3 Kap 30 – Valutakurser' },
  { keywords: ['händelse efter balansdag k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '32-händelser-efter-balansdagen.md', label: 'K3 Kap 32 – Händelser efter balansdagen' },
  { keywords: ['närstående', 'närstående transaktion', 'lån ledande befattningshavare'], regulation: 'K3', dir: 'k3-arsredovisning', file: '33-närstående.md', label: 'K3 Kap 33 – Närstående' },
  { keywords: ['första gången k3', 'övergång k3', 'byta till k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '35-första-gången.md', label: 'K3 Kap 35 – Första gången K3' },
  { keywords: ['stiftelse k3', 'stiftelse redovisning'], regulation: 'K3', dir: 'k3-arsredovisning', file: '36-stiftelser.md', label: 'K3 Kap 36 – Stiftelser' },
  { keywords: ['ideell förening k3', 'trossamfund k3'], regulation: 'K3', dir: 'k3-arsredovisning', file: '37-ideella-föreningar.md', label: 'K3 Kap 37 – Ideella föreningar' },
  { keywords: ['bostadsrättsförening k3', 'brf k3', 'komponent brf', 'underhållsfond', 'årsavgift brf'], regulation: 'K3', dir: 'k3-arsredovisning', file: '38-bostadsrättsföreningar.md', label: 'K3 Kap 38 – Bostadsrättsföreningar' },

  // ===== Bokföring =====
  { keywords: ['bokföring', 'löpande bokföring', 'bokföringspost', 'registreringsordning', 'systematisk ordning', 'grundbokföring', 'huvudbok'], regulation: 'Bokföring', dir: 'bokforing', file: '02-löpande-bokföring.md', label: 'Bokföring Kap 2 – Löpande bokföring' },
  { keywords: ['tidpunkt bokföring', 'kontantmetod bokföring', 'faktureringsmetod', 'senareläggning bokföring', 'när ska bokföras'], regulation: 'Bokföring', dir: 'bokforing', file: '03-tidpunkt-bokföring.md', label: 'Bokföring Kap 3 – Tidpunkt' },
  { keywords: ['anläggningsregister', 'register anläggningstillgång'], regulation: 'Bokföring', dir: 'bokforing', file: '04-anläggninsregister.md', label: 'Bokföring Kap 4 – Anläggningsregister' },
  { keywords: ['verifikation', 'kvitto', 'faktura krav', 'verifikationsinnehåll', 'verifikationsnummer', 'hänvisningsverifikation', 'rättelse verifikation'], regulation: 'Bokföring', dir: 'bokforing', file: '05-verifikationer.md', label: 'Bokföring Kap 5 – Verifikationer' },
  { keywords: ['gemensam verifikation', 'kontantförsäljning', 'kassaregister', 'dagskassa'], regulation: 'Bokföring', dir: 'bokforing', file: '06-gemensam-verifikation.md', label: 'Bokföring Kap 6 – Gemensam verifikation' },
  { keywords: ['räkenskapsinformation', 'digital bokföring', 'elektronisk verifikation', 'kryptering bokföring', 'varaktighet'], regulation: 'Bokföring', dir: 'bokforing', file: '07-räkenskapsinformation.md', label: 'Bokföring Kap 7 – Räkenskapsinformation' },
  { keywords: ['arkivering', 'spara bokföring', 'hur länge spara', 'sju år', '7 år', 'förstöra bokföring', 'var spara'], regulation: 'Bokföring', dir: 'bokforing', file: '08-arkivering.md', label: 'Bokföring Kap 8 – Arkivering' },
  { keywords: ['systemdokumentation', 'behandlingshistorik', 'kontoplan dokumentation'], regulation: 'Bokföring', dir: 'bokforing', file: '09-systemdokumentation.md', label: 'Bokföring Kap 9 – Systemdokumentation' },

  // ===== Fusioner =====
  { keywords: ['fusion', 'absorption', 'fusionsdifferens', 'fusionsvederlag', 'sammanslagning bolag', 'helägt dotterbolag fusion', 'dotterbolag fusion'], regulation: 'Fusioner', dir: 'fusioner', file: '02-redovisning-fusion.md', label: 'Fusioner Kap 2 – Redovisning av fusion' },
  { keywords: ['nedströmsfusion', 'moderbolag fusion'], regulation: 'Fusioner', dir: 'fusioner', file: '03-nedströmsfusion.md', label: 'Fusioner Kap 3 – Nedströmsfusion' },
  { keywords: ['fusion upplysning', 'fusion förvaltningsberättelse', 'fusion not'], regulation: 'Fusioner', dir: 'fusioner', file: '04-upplysningar.md', label: 'Fusioner Kap 4 – Upplysningar' },

  // ===== K1 =====
  { keywords: ['k1 enskild', 'enskild firma', 'enskild näringsidkare', 'förenklat årsbokslut enskild', 'ne-bilaga'], regulation: 'K1 Enskilda', dir: 'k1-enskilda', file: '06-balansräkningen.md', label: 'K1 Enskilda Kap 6 – Balansräkningen' },
  { keywords: ['k1 enskild intäkt', 'k1 enskild kostnad', 'enskild firma resultat'], regulation: 'K1 Enskilda', dir: 'k1-enskilda', file: '07-resultaträkningen.md', label: 'K1 Enskilda Kap 7 – Resultaträkningen' },
  { keywords: ['k1 enskild bokföring', 'enskild firma kontantmetod'], regulation: 'K1 Enskilda', dir: 'k1-enskilda', file: '04-löpande-bokföring.md', label: 'K1 Enskilda Kap 4 – Löpande bokföring' },
  { keywords: ['k1 ideell', 'ideell förening k1', 'förenklat årsbokslut ideell', 'trossamfund k1'], regulation: 'K1 Ideella', dir: 'k1-ideella', file: '06-balansräkningen.md', label: 'K1 Ideella Kap 6 – Balansräkningen' },
  { keywords: ['k1 ideell intäkt', 'ideell förening medlemsavgift', 'ideell gåva'], regulation: 'K1 Ideella', dir: 'k1-ideella', file: '07-resultaträkningen.md', label: 'K1 Ideella Kap 7 – Resultaträkningen' },

  // ===== Gränsvärden =====
  { keywords: ['gränsvärde', 'storleksgräns', 'antal anställda gräns', 'balansomslutning gräns', 'nettoomsättning gräns', 'k1 k2 k3 välja', 'vilken kategori', 'större företag', 'mindre företag gräns'], regulation: 'Gränsvärden', dir: 'gransvarden', file: '01-allmant-rad.md', label: 'Gränsvärden – Allmänt råd' },

  // ===== BRF =====
  { keywords: ['brf upplysning', 'bostadsrättsförening nyckeltal', 'årsavgift per kvadratmeter', 'skuldsättning brf', 'energikostnad brf', 'räntekänslighet brf', 'brf årsredovisning'], regulation: 'BRF', dir: 'brf-upplysningar', file: '04-fleraarsoversikt.md', label: 'BRF – Nyckeltal' },

  // ===== Årsbokslut =====
  { keywords: ['årsbokslut', 'bfnar 2017:3', 'årsbokslut regler'], regulation: 'Årsbokslut', dir: 'arsbokslut', file: '01-tillämpning.md', label: 'Årsbokslut Kap 1 – Tillämpning' },
];

function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e');
}

/** Detect explicit regulation preference in the question */
function detectRegulationPreference(question: string): string | null {
  const q = question.toLowerCase();
  // Exact matches first
  if (/\bk2\b/.test(q) && !/\bk3\b/.test(q)) return 'K2';
  if (/\bk3\b/.test(q) && !/\bk2\b/.test(q)) return 'K3';
  if (/\bk1\b/.test(q)) return 'K1';
  if (/\bbfnar 2020:5\b/.test(q) || /\bfusion\b/.test(q)) return 'Fusioner';
  if (/\bbfnar 2013:2\b/.test(q) || /\bbokföringslagen\b/.test(q)) return 'Bokföring';
  return null;
}

/** Direct punkt-number lookup: "punkt 10.27" → specific chapter file */
function matchPunktNumber(question: string): ChapterMatch | null {
  const match = question.match(/punkt\s+(\d+)\.(\d+)/i);
  if (!match) return null;

  const num = parseFloat(`${match[1]}.${match[2]}`);

  for (const entry of PUNKT_INDEX) {
    if (num >= entry.from && num <= entry.to) {
      return {
        regulation: entry.regulation,
        dir: entry.dir,
        file: entry.file,
        score: 1000, // highest priority
        label: entry.label,
      };
    }
  }
  return null;
}

/** Parse regulation filter string into a Set of allowed regulations, or null for no filtering. */
function parseRegulationFilter(filter?: string): Set<string> | null {
  if (!filter || filter === 'auto') return null;
  const regulations = filter.split(',').map((s) => s.trim()).filter(Boolean);
  return regulations.length > 0 ? new Set(regulations) : null;
}

export function routeQuestion(question: string, regulationFilter?: string): ChapterMatch[] {
  const allowed = parseRegulationFilter(regulationFilter);
  const results: ChapterMatch[] = [];

  // Layer 1: Direct punkt-number match (highest priority)
  const punktMatch = matchPunktNumber(question);
  if (punktMatch && (!allowed || allowed.has(punktMatch.regulation))) {
    results.push(punktMatch);
  }

  // Layer 2: Keyword matching
  const q = normalize(question);
  const regPref = detectRegulationPreference(question);

  for (const route of ROUTES) {
    if (allowed && !allowed.has(route.regulation)) continue;

    let score = 0;
    for (const keyword of route.keywords) {
      const kw = normalize(keyword);
      if (q.includes(kw)) {
        score += kw.length;
      }
    }

    // Boost score if regulation matches user preference
    if (regPref && route.regulation.startsWith(regPref)) {
      score *= 2;
    }

    // Penalize if user specified a different regulation
    if (regPref && !route.regulation.startsWith(regPref) && score > 0) {
      score *= 0.3;
    }

    if (score > 0) {
      results.push({
        regulation: route.regulation,
        dir: route.dir,
        file: route.file,
        score,
        label: route.label,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Deduplicate
  const seen = new Set<string>();
  const unique: ChapterMatch[] = [];
  for (const m of results) {
    const key = `${m.dir}/${m.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(m);
    }
  }

  return unique.slice(0, 3);
}
