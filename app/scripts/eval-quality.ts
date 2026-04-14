/**
 * LLM response quality evaluation for K2K3.ai.
 *
 * Sends questions to the live API, then uses a judge LLM to score
 * each response against expert ground truth on 4 dimensions.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... npx tsx scripts/eval-quality.ts [local|prod]
 *
 * Output: per-question scores + aggregate quality metrics.
 */

import { parseSSE } from '../src/lib/sse-parser';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const BASE_URL = process.argv[2] === 'prod'
  ? 'https://app-daily-wins.vercel.app'
  : 'http://localhost:5174';

const JUDGE_MODEL = 'anthropic/claude-sonnet-4';

// ─── Evaluation dataset ────────────────────────────────────────────

interface EvalCase {
  id: number;
  name: string;
  question: string;
  groundTruth: string;        // Expert reference answer (key facts)
  requiredPunkts: string[];   // Punkt numbers that MUST be cited
  forbiddenClaims: string[];  // Statements that indicate hallucination
  regulation: string;         // Regulation to send with the question
}

const EVAL_SET: EvalCase[] = [
  {
    id: 1,
    name: 'Periodiseringsgräns',
    question: 'Måste jag periodisera en faktura på 4 000 kr?',
    groundTruth: `Nej, du behöver inte periodisera. Enligt K2 punkt 2.4 behöver ett företag inte periodisera inkomster och utgifter som understiger 7 000 kronor. Eftersom fakturan är på 4 000 kr understiger den gränsen. Detta är ett allmänt råd (bindande). Gränsen gäller per faktura/post, inte totalt.`,
    requiredPunkts: ['2.4'],
    forbiddenClaims: ['5 000 kronor', 'halva prisbasbeloppet'],
    regulation: 'K2',
  },
  {
    id: 2,
    name: 'Avskrivning inventarier K2',
    question: 'Hur skriver jag av inventarier enligt K2?',
    groundTruth: `Inventarier skrivs av linjärt över nyttjandeperioden enligt K2 punkt 10.25. Nyttjandeperioden bestäms individuellt men får som schablon sättas till 5 år (punkt 10.27). Avskrivning ska påbörjas den månad tillgången tas i bruk. Inventarier av mindre värde (under ett halvt prisbasbelopp, punkt 10.5) får kostnadsföras direkt.`,
    requiredPunkts: ['10.25', '10.27'],
    forbiddenClaims: ['komponentavskrivning'],
    regulation: 'K2',
  },
  {
    id: 3,
    name: 'K2 vs K3 leasing',
    question: 'Vad är skillnaden mellan K2 och K3 för leasing?',
    groundTruth: `I K2 redovisas alla leasingavtal som operationella — leasingavgiften kostnadsförs linjärt. I K3 (kapitel 20) klassificeras leasing som finansiell eller operationell. Finansiell leasing redovisas som tillgång och skuld i balansräkningen hos leasetagaren, med avskrivning och ränta. Operationell leasing kostnadsförs linjärt även i K3.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K2K3',
  },
  {
    id: 4,
    name: 'Fusion helägt dotterbolag',
    question: 'Hur redovisas en fusion av ett helägt dotterbolag?',
    groundTruth: `Vid fusion av helägt dotterbolag (absorption) övertar moderbolaget alla tillgångar och skulder. Enligt BFNAR 2020:5 värderas övertagna tillgångar och skulder till koncernmässiga värden. Fusionsdifferensen (skillnad mellan andelarnas redovisade värde och nettotillgångarna) redovisas mot eget kapital. Fusionen redovisas på den dag registrering sker.`,
    requiredPunkts: [],
    forbiddenClaims: ['kapitel 37', 'K3 kapitel 37'],
    regulation: 'Fusioner',
  },
  {
    id: 5,
    name: 'Arkivering 7 år',
    question: 'Hur länge måste jag spara bokföringen?',
    groundTruth: `Räkenskapsinformation ska bevaras i 7 år efter utgången av det kalenderår då räkenskapsåret avslutades, enligt 7 kap. 2 § bokföringslagen (BFL). Informationen ska vara tillgänglig i Sverige och bevaras i varaktigt läsbar form.`,
    requiredPunkts: [],
    forbiddenClaims: ['10 år', '5 år'],
    regulation: 'Bokföring',
  },
  {
    id: 6,
    name: 'BRF nyckeltal',
    question: 'Vilka nyckeltal ska en BRF redovisa?',
    groundTruth: `Enligt BFNAR 2023:1 ska en bostadsrättsförening redovisa fem nyckeltal: (1) årsavgift per kvadratmeter, (2) skuldsättning per kvadratmeter, (3) sparande per kvadratmeter, (4) räntekänslighet, (5) energikostnad per kvadratmeter. Nyckeltalen ska redovisas i förvaltningsberättelsen som flerårsöversikt.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'BRF',
  },
  {
    id: 7,
    name: 'Gränsvärden K2/K3',
    question: 'Vilka gränsvärden avgör om jag ska använda K2 eller K3?',
    groundTruth: `Ett företag som överskrider minst två av tre gränsvärden under vart och ett av de två senaste räkenskapsåren räknas som större och måste använda K3: (1) medelantal anställda > 50, (2) balansomslutning > 40 miljoner kr, (3) nettoomsättning > 80 miljoner kr. Mindre företag kan välja K2 eller K3.`,
    requiredPunkts: [],
    forbiddenClaims: ['25 anställda'],
    regulation: 'Gränsvärden',
  },
  {
    id: 8,
    name: 'Inventarier mindre värde',
    question: 'Hur stort belopp får jag direktavdra för inventarier enligt K2?',
    groundTruth: `Enligt K2 punkt 10.5 får inventarier av mindre värde kostnadsföras direkt om anskaffningsvärdet understiger ett halvt prisbasbelopp med tillägg för ej avdragsgill moms. Prisbasbeloppet 2025 är 58 800 kr, så gränsen är 29 400 kr. Gäller per tillgång, men tillgångar som ingår i en större investering eller har naturligt samband ska bedömas sammantaget.`,
    requiredPunkts: ['10.5'],
    forbiddenClaims: ['25 000 kronor'],
    regulation: 'K2',
  },
  {
    id: 9,
    name: 'Händelser efter balansdagen',
    question: 'Hur hanteras händelser efter balansdagen enligt K2?',
    groundTruth: `Enligt K2 punkt 2.11 ska händelser efter balansdagen som bekräftar förhållanden som förelåg på balansdagen beaktas. Punkt 2.11A anger att händelser som inte bekräftar förhållanden på balansdagen inte ska påverka resultat- eller balansräkningen men kan behöva upplysas om i förvaltningsberättelsen.`,
    requiredPunkts: ['2.11'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 10,
    name: 'Uppskjuten skatt i K2',
    question: 'Hur redovisas uppskjuten skatt enligt K2?',
    groundTruth: `K2 tillåter inte redovisning av uppskjuten skatt. Uppskjuten skatt är ett K3-koncept (kapitel 29). I K2 redovisas enbart aktuell skatt. Obeskattade reserver redovisas brutto i K2 (utan uppdelning i uppskjuten skatteskuld och eget kapital).`,
    requiredPunkts: [],
    forbiddenClaims: ['punkt 29', 'temporär skillnad'],
    regulation: 'K2',
  },
  {
    id: 11,
    name: 'Egenupparbetad immateriell',
    question: 'Får jag aktivera egenupparbetade immateriella tillgångar?',
    groundTruth: `I K2 är det som huvudregel inte tillåtet att aktivera egenupparbetade immateriella tillgångar — de ska kostnadsföras. I K3 (kapitel 18) kan egenupparbetade immateriella tillgångar aktiveras om utvecklingsutgifterna uppfyller sex specifika kriterier i punkt 18.12 (bl.a. teknisk genomförbarhet, avsikt att slutföra, förmåga att använda/sälja).`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K2K3',
  },
  {
    id: 12,
    name: 'Nedskrivning finansiell tillgång',
    question: 'Måste jag skriva ned en aktiepost som tappat 15% i värde enligt K2?',
    groundTruth: `Enligt K2 punkt 11.20 behöver nedskrivning inte göras om värdenedgången understiger det lägsta av 25 000 kronor och 10 procent av eget kapital vid årets ingång. Men nedskrivning ska alltid göras om det sammanlagda värdet på alla finansiella anläggningstillgångar understiger redovisat värde med mer än dessa gränser. Grundregeln i ÅRL 4 kap 5 § är att nedskrivning ska ske om värdenedgången kan antas vara bestående, men K2 ger en förenklingsregel med fasta gränsvärden.`,
    requiredPunkts: ['11.20'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 13,
    name: 'Koncernbidrag K2',
    question: 'Hur redovisas koncernbidrag i K2?',
    groundTruth: `Enligt K2 kapitel 19 redovisas koncernbidrag som lämnas som en kostnad och koncernbidrag som erhålls som en intäkt. Mottagande företag redovisar det som bokslutsdisposition. Koncernbidraget ska redovisas samma räkenskapsår som det avser.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 14,
    name: 'Avsättning 20 000 kr',
    question: 'Måste jag göra en avsättning för en garantiförpliktelse på 20 000 kr enligt K2?',
    groundTruth: `Enligt K2 punkt 16.6 behöver ett företag inte göra en avsättning om det sammanlagda beloppet av samtliga avsättningar inte överstiger 25 000 kr. Om den enda avsättningen är 20 000 kr (under gränsen) behöver den inte redovisas separat.`,
    requiredPunkts: ['16.6'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 15,
    name: 'Komponentavskrivning K3',
    question: 'Hur fungerar komponentavskrivning enligt K3?',
    groundTruth: `Enligt K3 kapitel 17 ska materiella anläggningstillgångar delas upp i komponenter med väsentligt olika nyttjandeperioder, och varje komponent ska skrivas av separat. Typiskt exempel: en byggnad delas i stomme, tak, fasad, installationer etc. Vid utbyte av en komponent utrangeras den gamla och den nya aktiveras. Nyttjandeperiod och avskrivningsmetod ska omprövas om förutsättningarna förändras.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  // ─── K2 coverage (16-25) ────────────────────────────────────────
  {
    id: 16,
    name: 'Successiv vinstavräkning K2',
    question: 'Hur fungerar successiv vinstavräkning enligt K2 för uppdrag till fast pris?',
    groundTruth: `Uppdrag till fast pris redovisas enligt en huvudregel eller alternativregel (K2 punkt 6.15). Enligt huvudregeln (punkt 6.16) — så kallad successiv vinstavräkning — redovisas intäkten i takt med färdigställandet om företaget tillförlitligt kan beräkna uppdragsinkomst, färdigställandegrad och återstående utgifter. Enligt alternativregeln (punkt 6.22) redovisas intäkten först när arbetet väsentligen är fullgjort. Samma metod ska användas för samtliga uppdrag till fast pris.`,
    requiredPunkts: ['6.15', '6.16'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 17,
    name: 'Färdigställandegrad K2',
    question: 'Hur beräknas färdigställandegrad enligt K2?',
    groundTruth: `Enligt K2 punkt 6.17 beräknas färdigställandegraden normalt som nedlagda utgifter på balansdagen i förhållande till totalt beräknade utgifter för att fullgöra uppdraget. Punkt 6.18 kräver att metoden tillämpas konsekvent på alla uppdrag inom samma typ av verksamhet. Andra metoder, t.ex. faktiskt utfört arbete, kan användas. Delbetalningar och förskott återspeglar normalt inte utfört arbete.`,
    requiredPunkts: ['6.17', '6.18'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 18,
    name: 'Leasing kostnad K2',
    question: 'Hur redovisas leasing som kostnad enligt K2?',
    groundTruth: `Enligt K2 ska kostnad för leasing redovisas linjärt över den avtalade leasingperioden. Alla leasingavtal behandlas som operationella — den leasade tillgången redovisas hos leasegivaren så länge äganderätten inte övergått. Första förhöjd leasingavgift periodiseras linjärt över perioden. Den del som avser kommande räkenskapsår redovisas som förutbetald kostnad.`,
    requiredPunkts: [],
    forbiddenClaims: ['finansiell leasing', 'kapitaliseras i balansräkningen'],
    regulation: 'K2',
  },
  {
    id: 19,
    name: 'Varulager inkurans K2',
    question: 'Hur hanteras inkurans i varulagret enligt K2?',
    groundTruth: `Enligt K2 punkt 12.14 ska försäljningsvärdet fastställas utifrån förhållandena på balansdagen, och hänsyn ska tas till inkurans. Inkurans innebär att varornas värde minskat, t.ex. på grund av skador, omodernitet eller övertalighet. Försäljningsvärdet för inkuranta varor beräknas till det nedsatta pris varorna bedöms kunna säljas för. Underlaget ska vara tillförlitligt och kan grundas på försäljnings- och lagerstatistik.`,
    requiredPunkts: ['12.14'],
    forbiddenClaims: ['schablon 3 procent', 'schablonmässig inkurans 5 procent'],
    regulation: 'K2',
  },
  {
    id: 20,
    name: 'FIFU-principen K2',
    question: 'Får jag tillämpa FIFU (först-in-först-ut) enligt K2?',
    groundTruth: `Ja. Enligt 4 kap. 11 § ÅRL (som K2 kapitel 12 hänvisar till) får anskaffningsvärdet för varulager av likartade tillgångar beräknas enligt först-in-först-ut-principen (FIFU), vägda genomsnittspriser eller någon annan liknande princip. Sist-in-först-ut-principen (SIFU/LIFO) är däremot inte tillåten.`,
    requiredPunkts: [],
    forbiddenClaims: ['SIFU är tillåten', 'LIFO är tillåten'],
    regulation: 'K2',
  },
  {
    id: 21,
    name: 'Periodiseringsfond K2',
    question: 'Hur redovisas periodiseringsfond enligt K2?',
    groundTruth: `Enligt K2 punkt 15.3 får obeskattade reserver redovisas endast om skattelagstiftningen kräver att motsvarande belopp bokförs för avdragsrätt. Periodiseringsfonder ska enligt uppställningsformen i kapitel 4 redovisas under rubriken Obeskattade reserver i en egen post "Periodiseringsfonder". De redovisas brutto (utan uppdelning i uppskjuten skatteskuld och eget kapital). Avsättning och återföring redovisas som bokslutsdispositioner.`,
    requiredPunkts: ['15.3'],
    forbiddenClaims: ['uppskjuten skatteskuld'],
    regulation: 'K2',
  },
  {
    id: 22,
    name: 'Upplupna kostnader K2',
    question: 'När redovisas upplupna kostnader enligt K2?',
    groundTruth: `Enligt K2 kapitel 17 redovisas upplupna kostnader som skuld när företaget har ett åtagande till följd av avtal men faktura saknas eller är daterad efter balansdagen. Exempel är semesterlöneskuld (punkt 17.10) och ospecificerade leverantörsskulder (punkt 17.9). Upplupna kostnader redovisas som skulder, inte avsättningar, trots att belopp eller betalningstidpunkt kan vara ovissa — osäkerheten bedöms mindre än för avsättningar.`,
    requiredPunkts: ['17.9', '17.10'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 23,
    name: 'Noter minsta krav K2',
    question: 'Vilka är minsta krav på noter i K2?',
    groundTruth: `Enligt K2 kapitel 18 ska noter lämnas enligt ÅRL 5 kap. 4–24 §§ och presenteras i ordningen (a) redovisnings- och värderingsprinciper, (b) noter till enskilda poster, (c) övriga noter (punkt 18.2). Krav på upplysning om tillämpade värderingsprinciper framgår av punkt 18.3. Upplysning om avskrivningar (nyttjandeperiod eller avskrivningsprocent per post) lämnas enligt punkt 18.4. Har företaget inget att redovisa i en viss not behöver den inte lämnas.`,
    requiredPunkts: ['18.2', '18.3', '18.4'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 24,
    name: 'Andelar i dotterföretag K2',
    question: 'Hur redovisas anskaffningsvärdet för andelar i ett dotterföretag enligt K2?',
    groundTruth: `Enligt K2 punkt 19.2 är andelar i koncernföretag normalt anläggningstillgångar. Anskaffningsvärdet utgörs av inköpspriset plus utgifter direkt hänförliga till förvärvet (se ÅRL 4 kap. 3 §, hänvisning i kapitel 9). Aktieägartillskott ökar det redovisade värdet när utfästelsen lämnas (punkt 19.5). Erhållen emissionsinsats ökar värdet när behörigt organ beslutat (punkt 19.4). Kapitalandelsmetoden får inte användas i K2 (punkt 19.6A).`,
    requiredPunkts: ['19.2', '19.5'],
    forbiddenClaims: ['kapitalandelsmetoden'],
    regulation: 'K2',
  },
  {
    id: 25,
    name: 'Kassaflödesanalys K2',
    question: 'Måste ett mindre företag enligt K2 upprätta kassaflödesanalys?',
    groundTruth: `Nej. Enligt ÅRL 2 kap. 1 § är det endast större företag och bostadsrättsföreningar som ska upprätta kassaflödesanalys. Ett mindre företag enligt K2 får frivilligt upprätta en kassaflödesanalys, och i så fall ska kapitel 21 tillämpas (punkt 21.1). Indirekt metod används enligt punkt 21.9. Kassaflödesanalysen placeras mellan balansräkningen och noterna (punkt 21.2).`,
    requiredPunkts: ['21.1', '21.2'],
    forbiddenClaims: ['alla mindre företag måste upprätta kassaflödesanalys'],
    regulation: 'K2',
  },
  // ─── K3 coverage (26-33) ────────────────────────────────────────
  {
    id: 26,
    name: 'Förändring eget kapital K3',
    question: 'Hur specificeras förändringar i eget kapital enligt K3?',
    groundTruth: `Enligt K3 kapitel 6 (baserat på ÅRL 6 kap. 2 §) ska andra företag än handelsbolag och enskilda näringsidkare specificera förändringar i eget kapital jämfört med föregående års balansräkning — antingen i förvaltningsberättelsen eller i en egen räkning. Specifikationen ska visa förändring i varje post i eget kapital, samt förändringar i redovisade värden som redovisats direkt mot eget kapital. Notupplysning enligt 5 kap. 11–12 §§ ÅRL ska ändå lämnas.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  {
    id: 27,
    name: 'Kassaflödesanalys indirekt metod K3',
    question: 'Vad innebär indirekt metod för kassaflödesanalys enligt K3?',
    groundTruth: `Enligt K3 punkt 7.8 får företaget välja indirekt eller direkt metod för kassaflöden från den löpande verksamheten. Indirekt metod (punkt 7.9) innebär att resultatet justeras för transaktioner som inte medfört in- eller utbetalningar, upplupna/förutbetalda poster samt intäkter och kostnader hänförliga till investerings- eller finansieringsverksamheten. Direkt metod innebär att väsentliga slag av in- och utbetalningar anges brutto och separat.`,
    requiredPunkts: ['7.8', '7.9'],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  {
    id: 28,
    name: 'Intresseföretag kapitalandelsmetoden K3',
    question: 'Hur tillämpas kapitalandelsmetoden på intresseföretag i K3?',
    groundTruth: `Enligt K3 kapitel 14 ska andelar i intresseföretag redovisas i koncernredovisningen enligt kapitalandelsmetoden (punkterna 14.2–14.11). Förvärvsanalys upprättas vid varje förvärv (punkt 14.4). I koncernresultaträkningen redovisas ägarföretagets andel av intresseföretagets resultat efter skatt på egen rad inom rörelseresultatet (punkt 14.5). I juridisk person redovisas andelar enligt anskaffningsvärdemetoden (punkterna 14.12–14.14).`,
    requiredPunkts: ['14.4', '14.5'],
    forbiddenClaims: ['kapitalandelsmetoden i juridisk person är obligatorisk'],
    regulation: 'K3',
  },
  {
    id: 29,
    name: 'Utbyte av komponent K3',
    question: 'Hur redovisas utbyte av en komponent i en materiell anläggningstillgång enligt K3?',
    groundTruth: `Enligt K3 punkt 17.5 ska utgifter för utbyte av en komponent räknas in i tillgångens redovisade värde om tillgången delats upp i komponenter enligt punkt 17.4. Detta gäller även tillkommande nya komponenter. Enligt punkt 17.6 ska det redovisade värdet av den del som byts ut tas bort från balansräkningen (utrangeras), oavsett om den hade skrivits av separat eller inte. Detta gäller även vid partiella utbyten.`,
    requiredPunkts: ['17.4', '17.5'],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  {
    id: 30,
    name: 'Egenupparbetad immateriell K3 kriterier',
    question: 'Vilka kriterier krävs för att aktivera egenupparbetade immateriella tillgångar enligt K3?',
    groundTruth: `Enligt K3 punkt 18.12 (aktiveringsmodellen) får utvecklingsutgifter aktiveras endast om företaget kan påvisa samtliga sex förutsättningar: (a) teknisk genomförbarhet, (b) avsikt att färdigställa och använda/sälja, (c) förmåga att använda eller sälja, (d) hur tillgången kommer att generera framtida ekonomiska fördelar, (e) tillgång till nödvändiga resurser för att färdigställa, (f) förmåga att tillförlitligt beräkna hänförliga utgifter. Aktiebolag och ekonomiska föreningar måste föra över motsvarande belopp från fritt eget kapital till en fond för utvecklingsutgifter.`,
    requiredPunkts: ['18.12'],
    forbiddenClaims: ['fyra kriterier', 'fem kriterier'],
    regulation: 'K3',
  },
  {
    id: 31,
    name: 'Klassificering finansiell leasing K3',
    question: 'Hur klassificeras ett leasingavtal som finansiellt eller operationellt enligt K3?',
    groundTruth: `Enligt K3 punkt 20.3 ska leasingavtal klassificeras som finansiellt eller operationellt redan när avtalet ingås, baserat på avtalets ekonomiska innebörd — inte dess juridiska form. Ett finansiellt leasingavtal överför i allt väsentligt de ekonomiska risker och fördelar som förknippas med ägandet. Ett operationellt leasingavtal är ett leasingavtal som inte är finansiellt. Klassificeringen får enligt punkt 20.4 inte ändras under leasingperioden om inte villkoren ändras.`,
    requiredPunkts: ['20.3'],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  {
    id: 32,
    name: 'Uppskjuten skatt temporär skillnad K3',
    question: 'Vad är en temporär skillnad enligt K3?',
    groundTruth: `Enligt K3 punkt 29.14 är en temporär skillnad skillnaden mellan redovisat och skattemässigt värde på en tillgång eller skuld. Skillnaden är antingen skattepliktig (leder till framtida skattepliktiga belopp) eller avdragsgill (leder till framtida avdragsgilla belopp). Uppskjuten skatteskuld uppkommer från skattepliktiga temporära skillnader (punkt 29.13) och uppskjuten skattefordran från avdragsgilla temporära skillnader samt outnyttjade underskottsavdrag (punkt 29.12).`,
    requiredPunkts: ['29.12', '29.13', '29.14'],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  {
    id: 33,
    name: 'Händelser efter balansdagen K3',
    question: 'Hur ska händelser efter balansdagen hanteras enligt K3?',
    groundTruth: `Enligt K3 kapitel 32 delas händelser efter balansdagen i två slag. Händelser som bekräftar förhållanden som förelåg på balansdagen ska enligt punkt 32.3 beaktas genom justering av belopp eller redovisning av tidigare ej medtagna poster. Händelser som indikerar förhållanden som uppstått efter balansdagen ska enligt punkt 32.4 inte beaktas i balans- och resultaträkningen, men normalt lämnas upplysning om dem.`,
    requiredPunkts: ['32.3', '32.4'],
    forbiddenClaims: [],
    regulation: 'K3',
  },
  // ─── Bokföring (34-38) ───────────────────────────────────────────
  {
    id: 34,
    name: 'Kontantmetoden tidpunkt',
    question: 'När får jag tillämpa kontantmetoden för bokföring?',
    groundTruth: `Enligt 5 kap. 2 § tredje stycket BFL får ett företag vars årliga nettoomsättning normalt uppgår till högst tre miljoner kronor dröja med att bokföra affärshändelser tills betalning sker (kontantmetoden). Vid räkenskapsårets utgång ska dock samtliga obetalda fordringar och skulder bokföras. Bokföringen får enligt BFNAR 2013:2 senarelaggas till 50 dagar efter kvartalets utgång för företag under tre miljoner kronor.`,
    requiredPunkts: [],
    forbiddenClaims: ['5 miljoner kronor', 'omsättningsgräns 10 miljoner'],
    regulation: 'Bokföring',
  },
  {
    id: 35,
    name: 'Anläggningsregister innehåll',
    question: 'Vad ska finnas i ett anläggningsregister?',
    groundTruth: `Enligt BFNAR 2013:2 punkt 4.5 ska anläggningsregistret för varje tillgång innehålla (a) uppgifter för att identifiera tillgången, (b) anskaffningsvärde, (c) anskaffningstidpunkt, (d) beräknat restvärde och nyttjandeperiod, (e) tillämpad avskrivningsmetod om annan än linjär, samt ackumulerade avskrivningar. Enligt punkt 4.7 ska även uppgift om avyttring eller utrangering under räkenskapsåret anges. Registret uppdateras senast i samband med bokslut. Direktkostnadsförda tillgångar behöver inte tas upp.`,
    requiredPunkts: ['4.5'],
    forbiddenClaims: [],
    regulation: 'Bokföring',
  },
  {
    id: 36,
    name: 'Verifikation obligatoriska uppgifter',
    question: 'Vilka obligatoriska uppgifter måste en verifikation innehålla?',
    groundTruth: `Enligt 5 kap. 7 § BFL ska en verifikation innehålla uppgift om (1) när den sammanställts, (2) när affärshändelsen inträffat, (3) vad affärshändelsen avser, (4) belopp, (5) motpart, samt (6) verifikationsnummer eller annat identifieringstecken och övriga uppgifter som behövs för att koppla verifikationen till bokföringsposten. I förekommande fall ska också upplysning om underlagshandlingar och var de finns tillgängliga finnas. Uppgifterna ska vara varaktiga och får inte raderas eller göras oläsliga.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'Bokföring',
  },
  {
    id: 37,
    name: 'Elektronisk arkivering',
    question: 'Får jag arkivera räkenskapsinformation elektroniskt?',
    groundTruth: `Ja. Enligt 7 kap. 1 § BFL behåller räkenskapsinformation den form (pappers- eller elektronisk) den hade när den togs emot eller sammanställdes. Enligt 7 kap. 2 § BFL ska handlingarna vara varaktiga, lätt åtkomliga och förvaras i Sverige i ordnat skick. Elektronisk räkenskapsinformation ska säkerhetskopieras regelbundet. Enligt 7 kap. 3 a § BFL får elektroniska handlingar förvaras i ett annat EU-land om Skatteverket kan få omedelbar elektronisk åtkomst och företaget kan skriva ut informationen i Sverige.`,
    requiredPunkts: [],
    forbiddenClaims: ['molnlagring är förbjuden', 'måste förvaras på papper'],
    regulation: 'Bokföring',
  },
  {
    id: 38,
    name: 'Systemdokumentation',
    question: 'Vad ska systemdokumentationen innehålla?',
    groundTruth: `Enligt 5 kap. 11 § BFL ska företaget upprätta sådana beskrivningar av bokföringssystemets organisation och uppbyggnad som behövs för att ge överblick över systemet. Enligt BFNAR 2013:2 punkt 9.2 ska systemdokumentationen åtminstone innehålla en kontoplan (samlingsplan) och beskrivning av bokföringssystemets uppbyggnad. Kompletterande beskrivningar behövs vid automatkonteringar, flera verifikationsnummerserier eller flera datorbaserade delar. Systemdokumentationen är räkenskapsinformation och ska arkiveras.`,
    requiredPunkts: ['9.2'],
    forbiddenClaims: [],
    regulation: 'Bokföring',
  },
  // ─── BRF (39-41) ─────────────────────────────────────────────────
  {
    id: 39,
    name: 'BRF tillämpning',
    question: 'Vilka bostadsrättsföreningar omfattas av BFNAR 2023:1?',
    groundTruth: `Enligt BFNAR 2023:1 punkt 1 ska det allmänna rådet tillämpas när en bostadsrättsförening upprättar årsredovisning enligt ÅRL. Reglerna gäller oavsett om föreningen tillämpar K2 (BFNAR 2016:10) eller K3 (BFNAR 2012:1) — rådet innehåller kompletterande upplysningskrav som främst rör förvaltningsberättelsen. Särskilda regler finns i punkterna 15–19 för K2-föreningar och punkt 20 för K3-föreningar.`,
    requiredPunkts: [],
    forbiddenClaims: ['endast K2-föreningar omfattas', 'endast K3-föreningar omfattas'],
    regulation: 'BRF',
  },
  {
    id: 40,
    name: 'BRF förvaltningsberättelse',
    question: 'Vilka särskilda krav ställs på en BRF:s förvaltningsberättelse?',
    groundTruth: `Enligt BFNAR 2023:1 ska förvaltningsberättelsen innehålla uppgifter om "Allmänt om verksamheten" (punkt 2) samt en flerårsöversikt med fem nyckeltal: årsavgift, skuldsättning, sparande, räntekänslighet och energikostnad per kvadratmeter. För föreningar som visar förlust ska särskild upplysning lämnas. Privatbostadsföretagens fördelning mellan upplåtelseformer kan vara en sådan speciell omständighet som ska anges.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'BRF',
  },
  {
    id: 41,
    name: 'BRF kassaflödesanalys obligatorisk',
    question: 'Måste en bostadsrättsförening upprätta kassaflödesanalys?',
    groundTruth: `Ja. Enligt 2 kap. 1 § ÅRL ska en bostadsrättsförenings årsredovisning innehålla en kassaflödesanalys — även om föreningen är mindre. Detta skiljer sig från regeln för övriga mindre företag. Enligt BFNAR 2023:1 punkt 17 ska kassaflödesanalysen upprättas enligt kapitel 21 i K2 (eller K3 beroende på vald normgivning). Indirekt eller direkt metod får tillämpas (punkt 18). Föreningens andel av medel på klientmedelskonto hos ekonomisk förvaltare får anses som likvida medel.`,
    requiredPunkts: [],
    forbiddenClaims: ['kassaflödesanalys är frivillig för bostadsrättsföreningar'],
    regulation: 'BRF',
  },
  // ─── Fusioner (42-43) ────────────────────────────────────────────
  {
    id: 42,
    name: 'Nedströmsfusion redovisning',
    question: 'Hur redovisas en nedströmsfusion?',
    groundTruth: `Enligt BFNAR 2020:5 kapitel 3 är nedströmsfusion en fusion där moderföretaget är överlåtande och dotterföretaget övertagande. Dotterföretaget (övertagande) övertar moderföretagets tillgångar och skulder till de bokförda värden dessa hade i moderföretaget, om inte dotterföretaget tillämpar en annan redovisningsprincip som kräver justering. Dotterföretagets egna tillgångar och skulder justeras enligt punkterna 2.4–2.5. Fusionsdifferens hanteras mot eget kapital.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'Fusioner',
  },
  {
    id: 43,
    name: 'Fusion upplysningar',
    question: 'Vilka upplysningar ska lämnas om en genomförd fusion?',
    groundTruth: `Enligt BFNAR 2020:5 punkt 4.1 ska upplysning om fusion lämnas i förvaltningsberättelsen hos det övertagande företaget om fusionen är viktig för bedömningen av ställning och resultat eller annars är en händelse av väsentlig betydelse (ÅRL 6 kap. 1 §). Ett större företag ska enligt punkt 4.2 för varje överlåtande företag i not ange namn, organisationsnummer, hemvist, det överlåtande företagets resultat under sista räkenskapsåret samt förvärvat resultat som inte ingår i resultaträkningen.`,
    requiredPunkts: ['4.2'],
    forbiddenClaims: [],
    regulation: 'Fusioner',
  },
  // ─── K1 Enskilda (44-45) ─────────────────────────────────────────
  {
    id: 44,
    name: 'K1 enskild firma förutsättningar',
    question: 'Vilka förutsättningar gäller för att upprätta förenklat årsbokslut enligt K1 för enskild firma?',
    groundTruth: `Enligt BFNAR 2006:1 punkt 1.1 tillämpas det allmänna rådet av fysiska personer som upprättar förenklat årsbokslut enligt 6 kap. bokföringslagen. Förutsättningen är att den årliga nettoomsättningen normalt uppgår till högst tre miljoner kronor (6 kap. 3 § BFL). En fysisk person som är moderföretag i en koncern får inte tillämpa K1. Gränsvärdet gäller för den fysiska personens samtliga verksamheter totalt. Företaget ska även följa BFNAR 2013:2 om bokföring.`,
    requiredPunkts: ['1.1'],
    forbiddenClaims: ['omsättning över 5 miljoner tillåtet', 'gränsvärde 10 miljoner'],
    regulation: 'K1 Enskilda',
  },
  {
    id: 45,
    name: 'K1 kontantmetoden gränsvärde',
    question: 'Vilket omsättningsgränsvärde gäller för kontantmetoden i K1?',
    groundTruth: `Samma tregränsvärde som K1 själv använder: nettoomsättning som normalt uppgår till högst tre miljoner kronor (5 kap. 2 § tredje stycket BFL). En enskild näringsidkare som tillämpar förenklat årsbokslut enligt K1 (BFNAR 2006:1) får därmed också tillämpa kontantmetoden. Vid räkenskapsårets utgång ska dock samtliga då obetalda fordringar och skulder bokföras.`,
    requiredPunkts: [],
    forbiddenClaims: ['1 miljon kronor', 'gränsvärde 5 miljoner'],
    regulation: 'K1 Enskilda',
  },
  // ─── Årsbokslut (46-47) ──────────────────────────────────────────
  {
    id: 46,
    name: 'Årsbokslut periodiseringsgräns 5000',
    question: 'Vad är periodiseringsgränsen i årsbokslut enligt BFNAR 2017:3?',
    groundTruth: `Enligt BFNAR 2017:3 (Årsbokslut) behöver ett företag inte periodisera inkomster och utgifter som var för sig understiger 5 000 kronor. Observera att detta är en lägre gräns än i K2 (BFNAR 2016:10), där gränsen enligt punkt 2.4 är 7 000 kronor. Företag som upprättar årsbokslut enligt 6 kap. BFL (t.ex. enskilda näringsidkare och handelsbolag med endast fysiska personer) tillämpar alltså den lägre 5 000-kronorsgränsen.`,
    requiredPunkts: [],
    forbiddenClaims: ['7 000 kronor gäller i årsbokslut', '10 000 kronor'],
    regulation: 'Årsbokslut',
  },
  {
    id: 47,
    name: 'Årsbokslut vs K2 val',
    question: 'När väljer man årsbokslut (BFNAR 2017:3) framför K2?',
    groundTruth: `Årsbokslut enligt BFNAR 2017:3 tillämpas av företag som enligt 6 kap. 3 § BFL ska avsluta löpande bokföring med ett årsbokslut — inte en årsredovisning. Det gäller t.ex. enskilda näringsidkare (som inte upprättar förenklat K1-årsbokslut), handelsbolag med endast fysiska personer som delägare, och ideella föreningar som inte omfattas av krav på årsredovisning. K2 (BFNAR 2016:10) tillämpas av mindre aktiebolag och ekonomiska föreningar som upprättar årsredovisning. Valet styrs alltså av företagsformen och BFL:s krav.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'Årsbokslut',
  },
  // ─── Gränsvärden (48-50) ─────────────────────────────────────────
  {
    id: 48,
    name: 'Mindre företag tvåårsregel',
    question: 'Hur fungerar tvåårsregeln för större/mindre företag?',
    groundTruth: `Enligt 1 kap. 3 § första stycket 4 ÅRL är ett företag större om det under vart och ett av de två senaste räkenskapsåren överskrider minst två av tre gränsvärden: (a) medelantal anställda mer än 50, (b) balansomslutning mer än 40 miljoner kronor, (c) nettoomsättning mer än 80 miljoner kronor. Det krävs alltså att samma två gränsvärden överskrids båda åren. Mindre företag är företag som inte är större företag. Tvåårsregeln gör att övergång mellan kategorierna sker först efter två år i rad.`,
    requiredPunkts: [],
    forbiddenClaims: ['25 anställda', 'ett års överskridande räcker'],
    regulation: 'Gränsvärden',
  },
  {
    id: 49,
    name: 'Nystartat företag gränsvärden',
    question: 'Hur klassificeras ett nystartat företag enligt gränsvärdesreglerna?',
    groundTruth: `Enligt BFNAR 2006:11 (kommentar till punkt 1) klassificeras ett nystartat företag alltid som mindre företag de två första åren, eftersom gränsvärdena enligt 1 kap. 3 § ÅRL måste vara uppfyllda under vart och ett av de två senaste räkenskapsåren. En nybildad koncern klassificeras dock som större redan det första året om moderföretaget självt är ett större företag.`,
    requiredPunkts: [],
    forbiddenClaims: ['nystartade är alltid större', 'direkt klassificering år 1'],
    regulation: 'Gränsvärden',
  },
  {
    id: 50,
    name: 'Koncern gränsvärden koncernnivå',
    question: 'Hur beräknas gränsvärden på koncernnivå?',
    groundTruth: `Enligt 1 kap. 3 § ÅRL gäller samma tre gränsvärden för koncerner (medelantal > 50, balansomslutning > 40 mkr, nettoomsättning > 80 mkr under två år i rad). Enligt BFNAR 2006:11 beräknas koncernens balansomslutning som summan av koncernföretagens tillgångar efter eliminering av andelar i dotterföretag, koncerninterna fordringar och utgående internvinst. Koncernens nettoomsättning summeras efter eliminering av försäljning mellan koncernföretag. Medelantalet anställda summeras i koncernföretagen utan eliminering.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'Gränsvärden',
  },
];

// ─── Judge prompt ──────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `Du är en expert-granskare av svar från en svensk redovisningsrådgivare (K2K3.ai).

Du bedömer ett AI-genererat svar mot ett facit (expert ground truth).

Bedöm på dessa 4 dimensioner, varje poäng 1-5:

## KORREKTHET (1-5)
Är sakinnehållet korrekt? Stämmer belopp, regler och principer?
1 = Helt fel, 2 = Mestadels fel, 3 = Delvis rätt med väsentliga fel,
4 = Rätt med mindre brister, 5 = Helt korrekt

## PUNKTREFERENSER (1-5)
Citeras rätt punktnummer? Hittas alla krav-punkter?
1 = Inga/felaktiga punkter, 2 = Enstaka rätt, 3 = Hälften rätt,
4 = De flesta rätt, 5 = Alla korrekta punkter citerade

## HALLUCINATION (1-5)
Förekommer påhittade regler, felaktiga punktnummer, eller fel belopp?
1 = Allvarliga hallucinationer, 2 = Flera påhittade fakta,
3 = Enstaka tvivelaktigt påstående, 4 = Allt verifierbart,
5 = Helt fritt från hallucination

## FULLSTÄNDIGHET (1-5)
Besvaras frågan tillräckligt för en redovisningskonsult?
1 = Obesvarat, 2 = Ytligt, 3 = Grundläggande men saknar viktiga detaljer,
4 = Bra svar med de flesta relevanta aspekter, 5 = Komplett och användbart

Svara EXAKT i detta JSON-format (inga andra kommentarer):
{
  "correctness": <1-5>,
  "citations": <1-5>,
  "hallucination": <1-5>,
  "completeness": <1-5>,
  "notes": "<kort motivering, max 100 ord>"
}`;

// ─── API helpers ───────────────────────────────────────────────────

let sessionCookies = '';

async function initSession(): Promise<void> {
  try {
    const csrfResp = await fetch(BASE_URL + '/auth/csrf', { redirect: 'follow' });
    if (csrfResp.ok) {
      const cookies = csrfResp.headers.getSetCookie?.() || [];
      sessionCookies = cookies.map(c => c.split(';')[0]).join('; ');
    }
  } catch {
    // Auth not available — continue without session cookies
  }
}

async function askQuestion(question: string, regulation: string = 'auto'): Promise<{ text: string; sources: string[] }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookies && sessionCookies.length > 0) headers['Cookie'] = sessionCookies;

  const response = await fetch(BASE_URL + '/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: question, regulation }),
  });

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  const reader = response.body!.getReader();
  let fullText = '';
  let sources: string[] = [];

  for await (const payload of parseSSE(reader)) {
    try {
      const data = JSON.parse(payload);
      if (data.content) fullText += data.content;
      if (data.done && Array.isArray(data.sources)) sources = data.sources;
    } catch { /* skip */ }
  }

  return { text: fullText, sources };
}

interface JudgeScores {
  correctness: number;
  citations: number;
  hallucination: number;
  completeness: number;
  notes: string;
}

async function judgeAnswer(
  question: string,
  answer: string,
  evalCase: EvalCase
): Promise<JudgeScores> {
  const userMessage = [
    `## Fråga\n${question}`,
    `## AI-svar att bedöma\n${answer}`,
    `## Facit (expert ground truth)\n${evalCase.groundTruth}`,
    evalCase.requiredPunkts.length > 0
      ? `## Krav-punkter som MÅSTE citeras\n${evalCase.requiredPunkts.join(', ')}`
      : '',
    evalCase.forbiddenClaims.length > 0
      ? `## Förbjudna påståenden (hallucination-indikatorer)\n${evalCase.forbiddenClaims.join(', ')}`
      : '',
  ].filter(Boolean).join('\n\n');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://k2k3.ai',
      'X-Title': 'K2K3.ai Eval',
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 512,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Judge API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  const raw = data.choices[0].message.content;

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Judge did not return valid JSON: ' + raw.slice(0, 200));
  }

  return JSON.parse(jsonMatch[0]) as JudgeScores;
}

// ─── Main ──────────────────────────────────────────────────────────

async function runEval() {
  console.log('K2K3.ai Quality Evaluation');
  console.log('Target: ' + BASE_URL);
  console.log('Judge: ' + JUDGE_MODEL);
  console.log('='.repeat(70));
  console.log('');

  await initSession();

  const results: {
    id: number;
    name: string;
    scores: JudgeScores;
    sources: string[];
  }[] = [];
  const errors: string[] = [];

  for (const evalCase of EVAL_SET) {
    process.stdout.write(`[${evalCase.id}/${EVAL_SET.length}] ${evalCase.name} [${evalCase.regulation}] ... `);

    try {
      const answer = await askQuestion(evalCase.question, evalCase.regulation);
      const scores = await judgeAnswer(evalCase.question, answer.text, evalCase);

      const avg = (scores.correctness + scores.citations + scores.hallucination + scores.completeness) / 4;
      const status = avg >= 4 ? 'GOOD' : avg >= 3 ? 'OK' : 'POOR';

      console.log(
        `${status} (C:${scores.correctness} P:${scores.citations} H:${scores.hallucination} F:${scores.completeness} = ${avg.toFixed(1)})`
      );

      if (scores.notes) {
        console.log(`  ${scores.notes}`);
      }

      results.push({ id: evalCase.id, name: evalCase.name, scores, sources: answer.sources });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.log(`ERROR: ${msg}`);
      errors.push(`${evalCase.id}: ${msg}`);
    }
  }

  // ─── Summary ───────────────────────────────────────────────────

  console.log('');
  console.log('='.repeat(70));
  console.log('QUALITY SUMMARY');
  console.log('='.repeat(70));

  if (results.length === 0) {
    console.log('No results to summarize.');
    process.exit(1);
  }

  const avg = (dim: keyof Omit<JudgeScores, 'notes'>) =>
    results.reduce((sum, r) => sum + r.scores[dim], 0) / results.length;

  const correctness = avg('correctness');
  const citations = avg('citations');
  const hallucination = avg('hallucination');
  const completeness = avg('completeness');
  const overall = (correctness + citations + hallucination + completeness) / 4;

  console.log('');
  console.log(`  Korrekthet:       ${correctness.toFixed(2)} / 5`);
  console.log(`  Punktreferenser:  ${citations.toFixed(2)} / 5`);
  console.log(`  Hallucination:    ${hallucination.toFixed(2)} / 5`);
  console.log(`  Fullständighet:   ${completeness.toFixed(2)} / 5`);
  console.log(`  ─────────────────────────`);
  console.log(`  TOTALT:           ${overall.toFixed(2)} / 5`);
  console.log('');

  // Flagged answers (any dimension < 3)
  const flagged = results.filter(r =>
    r.scores.correctness < 3 ||
    r.scores.citations < 3 ||
    r.scores.hallucination < 3 ||
    r.scores.completeness < 3
  );

  if (flagged.length > 0) {
    console.log(`FLAGGED (${flagged.length} answers with score < 3 on any dimension):`);
    for (const f of flagged) {
      const dims: string[] = [];
      if (f.scores.correctness < 3) dims.push(`correctness=${f.scores.correctness}`);
      if (f.scores.citations < 3) dims.push(`citations=${f.scores.citations}`);
      if (f.scores.hallucination < 3) dims.push(`hallucination=${f.scores.hallucination}`);
      if (f.scores.completeness < 3) dims.push(`completeness=${f.scores.completeness}`);
      console.log(`  #${f.id} ${f.name}: ${dims.join(', ')}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e}`);
    }
  }

  console.log(`\nEvaluated: ${results.length}/${EVAL_SET.length}`);

  // Exit with failure if overall quality is below threshold
  if (overall < 3.5) {
    console.log('\nFAIL: Overall quality below 3.5 threshold');
    process.exit(1);
  }

  console.log('\nPASS: Quality meets threshold (>= 3.5)');
}

runEval();
