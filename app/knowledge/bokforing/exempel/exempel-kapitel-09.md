# Exempel till kapitel 9 – Systemdokumentation och behandlingshistorik

## Exempel 9.1 Systemdokumentation – kontoplan

**Förutsättningar:**

Ett företag som upprättar årsredovisning använder den senaste versionen av BAS-kontoplanen med tillhörande konteringsinstruktioner. Företaget har lagt till konton för försäljning och inköp som inte framgår av BAS-kontoplanen. Kontona benämns Försäljning av blommor, Försäljning av tillbehör, Inköp av blommor och Inköp av tillbehör.

**Tänk så här:**

Enligt punkt 9.2 ska företagets systemdokumentation innehålla företagets kontoplan. Systemdokumentationen ska också innehålla en beskrivning som både visar hur konton används i det löpande bokföringsarbetet och hur de sammanställs när årsredovisningen upprättas.

Eftersom företaget använder en standardkontoplan räcker det att i systemdokumentationen ange standardkontoplanens beteckning och version samt vilken version av konteringsinstruktionerna som används. Endast de konton som företaget har lagt till och som inte ingår i standarden behöver anges särskilt. Om det inte klart framgår av kontonamnet eller av kontoplanen i övrigt kan en beskrivning för dessa konton behöva upprättas. Beskrivningen ska visa hur kontona används löpande och hur de sammanställs i årsredovisningen, dvs. i vilken post i årsredovisningen som kontot ingår. Företaget bedömer att detta framgår av kontonamnen och att någon beskrivning därför inte behöver upprättas.

**Skriv t.ex. så här:**

Kontoplan

Den senaste versionen av BAS-kontoplanen med tillhörande konteringsinstruktioner (Bokföringsboken) används. BAS-standarden följs avseende såväl principer för kontering som för sammanställning av årsredovisningen.

Egna konton för försäljning och inköp framgår av kontoplanen i bokföringssystemet.

Kontoplaner för respektive räkenskapsår finns sparade i bokföringssystemet och förändringar under året framgår av systemets behandlingshistorik.

**Referenser:**

5 kap. 11 § BFL och punkterna 9.2 a, 9.2 b och 9.3.

---

## Exempel 9.2 Systemdokumentation – samlingsplan

**Förutsättningar:**

Ett företag säljer tjänster. I uppdragen används material från företagets lager. Företaget upprättar kundfakturor i ett datorbaserat system för fakturering och lagerredovisning. För bokföringsarbetet anlitar företaget en redovisningsbyrå. Både företaget och redovisningsbyrån använder standardsystem.

**Tänk så här:**

Enligt punkt 9.2 c ska företagets systemdokumentation innehålla en samlingsplan. En samlingsplan är en dokumentation över bokföringssystemet som visar vilka delar systemet består av, sambanden mellan dessa delar och i övrigt hur bokföringssystemet är uppbyggt, se punkt 9.4. Hur detaljerad samlingsplanen behöver vara beror på bokföringssystemets omfattning och komplexitet.

Eftersom företaget och redovisningsbyrån använder standardsystem är mycket redan dokumenterat i manualer och hjälptexter. Företaget behöver därför endast komplettera den informationen.

Om bokföringssystemet består av flera delar ska systemdokumentation även innehålla en beskrivning av informationsflöden, se punkt 9.11. Beskrivningen kan med fördel lämnas i samlingsplanen.

Eftersom delsystemen i företagets bokföringssystem delvis är fristående från varandra behöver samlingsplanen visa och beskriva sambanden och informationsflödena mellan systemen. Samlingsplanen behöver även beskriva arbetsfördelningen mellan företaget och redovisningsbyrån.

**Skriv t.ex. så här:**

Samlingsplan

Bokföringssystemets uppbyggnad och informationsflöden.

[Samlingsplanen visar ett flödesschema med följande delar: Företaget har Tid/Projektredovisning, Lagerredovisning och Fakturering. Redovisningsbyrån har Löneredovisning, Bokföring, Kundreskontra, Leverantörsreskontra och Bokslutsprogram.]

1. Kundfakturor upprättas i det datorbaserade standardsystemet för fakturering och lagerredovisning, XYZ.

2. Uttag av material i lagerredovisningen uppdaterar automatiskt tid- och projektredovisningen i realtid.

3. Fakturaunderlag överförs elektroniskt från webbaserat tid- och projektredovisningssystem till faktureringsprogrammet en gång i månaden.

4. Redovisningsbyrån använder det datorbaserade standardsystemet ABC för bokföring och reskontror.

5. Uppgifterna i fakturorna överförs elektroniskt från faktureringssystemet till kundreskontran hos redovisningsbyrån i anslutning till faktureringen.

6. Bokföringen i registreringsordning och systematisk ordning uppdateras automatiskt transaktion för transaktion vid registreringar i kund- och leverantörsreskontra.

7. Löneunderlag överförs elektroniskt från tid- och projektredovisningssystemet till redovisningsbyråns standardprogram för löner en gång i månaden. Redovisningsbyrån använder standardprogrammet LÖN.

8. I löneprogrammet skrivs bokföringsorder ut en gång i månaden och registreras sedan manuellt i redovisningsbyråns bokföringsprogram.

9. Från lagerredovisningen överförs varje vecka och vid månadsslut uppgifter om in- och utleveranser i en elektronisk bokföringsorder i SIE-format för automatisk bokföring i redovisningsbyråns bokföringsprogram.

10. Vid räkenskapsårets slut förs bokföringen över elektroniskt till redovisningsbyråns datorbaserade program för bokslut, ABC Bokslut. Där bearbetas och sammanställs boksluten och bokslutsposterna förs över till bokföringen elektroniskt.

Kundfakturor lagras elektroniskt i faktureringssystemet, elektroniska leverantörsfakturor lagras i särskild fil i redovisningsbyråns leverantörsreskontra och övriga verifikationer lagras i pappersform.

Utskrifter från bokföringen i registreringsordning och systematisk ordning samt andra rapporter sammanställs och översänds från redovisningsbyrån varje månad.

För mer detaljerade beskrivningar av bokföringssystemets uppbyggnad hänvisas till de använda standardprogrammens manualer och hjälptexter.

**Referenser:**

Punkterna 9.2 c, 9.4 och 9.11.

---

## Exempel 9.3 Systemdokumentation – identifikation av verifikationer

**Förutsättningar:**

Ett företag använder ett datorbaserat standardsystem för bokföring samt kund- och leverantörsreskontra. Företaget identifierar verifikationerna med verifikationsnummer och använder flera verifikationsnummerserier i bokföringen. Manualerna saknar dokumentation om hur de olika serierna används.

**Tänk så här:**

Eftersom företaget använder flera verifikationsnummerserier behöver serierna beskrivas i systemdokumentationen, se punkt 9.6. Beskrivningen ska visa hur serierna är indelade och vilken tidsperiod de omfattar.

**Skriv t.ex. så här:**

Verifikationsnummerserier

Flera verifikationsnummerserier används enligt följande:

| Nummerserie | Startnummer |
|-------------|-------------|
| M Övrig bokföring | 100 001 |
| K Kundfakturor | 200 001 |
| L Leverantörsfakturor | 300 001 |
| A Automatkonteringar | 400 001 |
| H Löner | 500 001 |
| P Bokslutstransaktioner | 900 001 |

Nummerserierna löper från 2012-01-01 och tills vidare.

**Referenser:**

Punkt 9.6.

---

## Exempel 9.4 Systemdokumentation – verifieringskedja

**Förutsättningar:**

Ett företag som upprättar årsredovisning använder ett datorbaserat standardsystem för bokföring samt kund- och leverantörsreskontra. Företaget saknar dokumentation som visar verifieringskedjan för leverantörsfakturor.

När en leverantörsfaktura kommer till företaget ankomststämplas fakturan samt tilldelas ett löpnummer. Fakturan registreras därefter i leverantörsreskontran. I leverantörsreskontran identifieras fakturorna med löpnummer. Identifieringstecken i bokföringen för presentation i registreringsordning och systematisk ordning är verifikationsnummer och kontonummer.

**Tänk så här:**

Eftersom företaget använder olika identifieringstecken för samma faktura i leverantörsreskontran respektive bokföringen behöver systemdokumentationen enligt punkt 9.7 innehålla en beskrivning över verifieringskedjan för leverantörsfakturor. Beskrivningen ska innehålla de hänvisningar och identifieringstecken som behövs för att följa affärshändelsens väg genom bokföringssystemet från verifikationen till årsbokslutet eller årsredovisningen och omvänt, se punkt 9.8.

**Skriv t.ex. så här:**

Verifieringskedja för leverantörsfakturor

För bokföringsposter som skapats automatiskt av uppgifter från leverantörsreskontran används särskild verifikationsnummerserie som börjar på L.

| Räkenskapsinformation | Hänvisningar/identifieringstecken |
|---|---|
| Leverantörsfaktura | Leverantörens fakturanummer samt tilldelat löpnummer |
| Leverantörsfakturajournal | Verifikationsnummer samt löpnummer på de fakturor som bokföringsordern omfattar |
| Presentation i registreringsordning | Verifikations- och kontonummer |
| Presentation i systematisk ordning | Konto- och verifikationsnummer |

Verifieringskedjan mellan bokföringen för presentation i systematisk ordning och årsredovisningen framgår av beskrivningen av kontoplanen.

**Referenser:**

Punkterna 9.7 och 9.8.

---

## Exempel 9.5 Systemdokumentation – behandlingsregler

**Förutsättningar:**

Ett företag använder ett standardprogram för bokföring. Lönehanteringen är manuell. Vid bokföringen av löner beräknas och bokförs sociala avgifter och semesterlöneskuld automatiskt. Automatkonteringarna aktiveras när utgifter bokförs på särskilt angivna lönekonton. Automatkonteringarna är inte beskrivna i bokföringsprogrammets manual.

**Tänk så här:**

Systemdokumentationen ska enligt punkt 9.9 innehålla en beskrivning av behandlingsregler om det förekommer behandlingsregler som skapar nya bokföringsposter. Eftersom företaget använder automatkonteringar som inte finns beskrivna i bokföringssystemets manual behöver företaget ta fram en egen beskrivning av behandlingsregeln.

**Skriv t.ex. så här:**

Automatkonteringar vid bokföring av lön

Automatkonteringar som innebär att programmet automatiskt beräknar och bokför semesterlöneskuld och sociala avgifter används vid bokföring av lön.

Under automatkonteringar i programmets företagsinställningar framgår vilka lönekonton som aktiverar beräkningarna, vilken procentsats som används vid beräkningarna och på vilka konton semesterlön och sociala avgifter bokförs. Ändringar i automatkonteringar framgår av programmets behandlingshistorik.

Vid ändringar av konteringar eller procentsatser arkiveras en pappersutskrift av den inaktuella automatkonteringen med notering om vilken tidsperiod den har använts.

**Referenser:**

Punkterna 9.9 och 9.10.

---

## Exempel 9.6 Systemdokumentation – informationsflöden

**Förutsättningar:**

Ett företag använder ett datorbaserat standardsystem för bokföring, lagerredovisning samt kund- och leverantörsreskontra. Standardsystemets manual innehåller detaljerade beskrivningar av informationsflöden mellan systemets olika delar. Företaget bedömer att systemets informationsflöde för inköp är otillräckligt dokumenterat i manualen.

**Tänk så här:**

Systemdokumentationen till ett bokföringssystem som består av flera delar behöver enligt punkt 9.11 innehålla en beskrivning av de informationsflöden som finns i systemet. Eftersom företaget bedömer att systemets informationsflöde för inköp är otillräckligt dokumenterat behöver informationen i manualen kompletteras. Det ska av beskrivningen gå att följa informationens väg mellan systemets olika delar.

**Skriv t.ex. så här:**

Informationsflöde vid inköp

[Flödesschemat visar: Inkommande följesedel och Leverantörsfaktura matas in i Lagerredovisning respektive Leverantörsreskontra. Lagerredovisningen genererar Lagerförändringsjournal. Leverantörsreskontran genererar Leverantörsfakturajournal. Båda journalerna flödar vidare till Bokföring.]

- Inkommande följesedlar som avser lagervaror registreras med antal och preliminära inpriser i lagerredovisningen vid godsets ankomst.
- Leverantörsfaktura får löpnummer och registreras i leverantörsreskontra. Om fakturan avser lagervaror stäms inpriser av automatiskt mot följesedelns inpris och eventuella avvikelser uppdateras automatiskt i lagerredovisningen.
- I lagerredovisningen skapas dagligen elektronisk lagerförändringsjournal med bokföringsunderlag som bokförs automatiskt för presentation i registreringsordning och systematisk ordning. Journalen innehåller alla dagens lagertransaktioner.
- I leverantörsreskontran skapas dagligen elektronisk leverantörsfakturajournal med bokföringsunderlag som bokförs automatiskt för presentation i registreringsordning och systematisk ordning. Bokföringsordern innehåller alla dagens reskontraförändringar.

**Referenser:**

Punkt 9.11.

---

## Exempel 9.7 Systemdokumentation – elektronisk räkenskapsinformation

**Förutsättningar:**

Ett företag använder ett datorbaserat standardsystem för bokföring, fakturering samt kund- och leverantörsreskontra.

Företagets samtliga kundfakturor sammanställs elektroniskt men skickas i pappersform till de kunder som efterfrågar det. Företagets leverantörsfakturor tas till övervägande del emot i pappersform. Företaget har valt att arbeta med elektroniska verifikationer i bokföringen. Ett externt företag anlitas för inskanning av de mottagna leverantörsfakturorna i pappersform.

**Tänk så här:**

Eftersom företaget använder ett datorbaserat system har företaget elektronisk räkenskapsinformation. Enligt punkt 9.12 ska systemdokumentationen innehålla en beskrivning av hur elektronisk räkenskapsinformation kan tas fram i en pappershandling. Finns det en beskrivning i systemets manualer räcker det med att hänvisa till denna. I annat fall måste företaget ta fram en beskrivning.

**Skriv t.ex. så här:**

Elektronisk räkenskapsinformation

- Alla registreringar i bokföringssystemet finns sparade i delsystemen och kan läsas och skrivas ut på papper enligt delsystemens manualer. Räkenskapsinformation för räkenskapsår längre tid tillbaka än tre år är sparad i komprimerad form i delsystemen men originalregistreringarna finns sparade på säkerhetskopior som kan läsas in i programmet och sedan läsas och skrivas ut.
- Kundfakturor skickas i pappersform till vissa kunder och i elektronisk form till andra. Alla kundfakturor sparas, kan läsas och skrivas ut i faktureringssystemet.
- Leverantörsfakturorna skannas in av Skanningföretaget AB. De inskannade uppgifterna läses in i leverantörsreskontran där de sparas, kan läsas och skrivas ut.

**Referenser:**

Punkt 9.12.

---

## Exempel 9.8 Systemdokumentation – behandlingshistorik

**Förutsättningar:**

Ett företag använder ett datorbaserat standardsystem för bokföring, fakturering samt kund- och leverantörsreskontra.

I varje delsystem finns uppgifter om när data har bearbetats eller ändrats. Hur behandlingshistoriken skapas i varje delsystem framgår av delsystemets manual.

**Tänk så här:**

Enligt 5 kap. 11 § BFL ska företaget upprätta en beskrivning över genomförda bearbetningar inom systemet. Eftersom behandlingshistoriken finns på olika ställen i systemet är det svårt att få en samlad överblick över behandlingshistoriken. Företaget behöver därför enligt punkt 9.15 ta fram en beskrivning som visar hur och var behandlingshistoriken skapas i systemet.

**Skriv t.ex. så här:**

- Uppgifter om systemförändringar och bearbetningar sparas i behandlingshistoriken till respektive delsystem enligt närmare beskrivning i delsystemets manual.
- Registreringstidpunkt och vem som har gjort registreringen sparas för alla bokföringsposter, kundfakturor, leverantörsfakturor samt in- och utbetalningar i delsystemen. Uppgifterna kan läsas och skrivas ut genom särskilt kolumntillval i verifikationslista, kundfakturalista, leverantörsfakturalista och betalningslista.

**Referenser:**

Punkt 9.15.
