# E2E Test Scenarios — K2K3.ai

## Test 1: Periodiseringsgräns (beloppsexakthet)

**Fråga:** "Måste jag periodisera en faktura på 4 000 kr?"

**Förväntat svar ska innehålla:**
- Hänvisning till **punkt 2.4** (K2)
- Beloppet **7 000 kronor** (INTE 5 000 kr — ändrat via BFNAR 2025:2)
- Punkt 2.4A om förskott
- Punkt 2.4B om väsentlighetsspärr
- Slutsats: 4 000 kr < 7 000 kr → behöver inte periodiseras (K2)

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 31, Kapitel 2 – Redovisningsprinciper

**Varför detta test är viktigt:**
- Testar att AI:n använder belopp från kontexten, inte från träningsdata
- Det gamla beloppet (5 000 kr) ändrades till 7 000 kr via BFNAR 2025:2
- AI-modeller har ofta det gamla beloppet i sin träningsdata
- STATUS: PASS — löst via facts-systemet (strukturerad faktaextraktion)

**Routing förväntat:** K2 Kap 2 – Redovisningsprinciper (primär)

---

## Test 2: Avskrivning inventarier (grundläggande K2)

**Fråga:** "Hur skriver jag av inventarier enligt K2?"

**Förväntat svar ska innehålla:**
- Punkt 10.27 (nyttjandeperiod 5 år, förenklingsregel)
- Punkt 10.25 (avskrivningsunderlag)
- Punkt 10.23 (avskrivning påbörjas vid bruk)
- Linjär avskrivning

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 204+, Kapitel 10

**STATUS: PASS**

---

## Test 3: K2 vs K3 leasing (jämförelse)

**Fråga:** "Vad är skillnaden mellan K2 och K3 för leasing?"

**Förväntat svar ska innehålla:**
- K2: alltid operationell (punkt 7.10), leasingavgift som kostnad linjärt
- K3: klassificering finansiell/operationell (punkt 20.3-20.4)
- K3 finansiell: tillgång + skuld i balansräkningen

**Routing förväntat:** K2 Kap 7 + K3 Kap 20

---

## Test 4: Fusion dotterbolag (specialregelverk)

**Fråga:** "Hur redovisas en fusion av ett helägt dotterbolag?"

**Förväntat svar ska innehålla:**
- Hänvisning till BFNAR 2020:5 (Fusioner)
- Punkt 2.1-2.8 om värdering och fusionsdifferens
- Kontinuitetsprincipen (bokförda värden)
- INTE K3 kapitel 37 (det handlar om ideella föreningar)

**Routing förväntat:** Fusioner Kap 2 (primär)

---

## Test 5: Arkivering (bokföringsvägledningen)

**Fråga:** "Hur länge måste jag spara bokföringen?"

**Förväntat svar ska innehålla:**
- BFL 7 kap. 2 § (lagtext)
- **Sju år** efter kalenderårets utgång
- Vad som ska sparas (verifikationer, bokslut, systemdokumentation)

**Routing förväntat:** Bokföring Kap 8 – Arkivering

**STATUS: PASS**

---

## Test 6: BRF nyckeltal

**Fråga:** "Vilka nyckeltal ska en BRF redovisa?"

**Förväntat svar ska innehålla:**
- Årsavgift per kvm
- Skuldsättning per kvm
- Sparande per kvm
- Räntekänslighet
- Energikostnad per kvm
- Hänvisning till BFNAR 2023:1

**Routing förväntat:** BRF – Nyckeltal

---

## Test 7: Gränsvärden (regelverksval)

**Fråga:** "Vilka gränsvärden avgör om jag ska använda K2 eller K3?"

**Förväntat svar ska innehålla:**
- 50 anställda
- 40 MSEK balansomslutning
- 80 MSEK nettoomsättning
- Två av tre kriterier

**Routing förväntat:** Gränsvärden – Allmänt råd

---

## Test 8: Inventarier mindre värde — prisbasbelopp (beloppsexakthet)

**Fråga:** "Hur stort belopp får jag direktavdra för inventarier enligt K2?"

**Förväntat svar ska innehålla:**
- Punkt 10.5: **halvt prisbasbelopp** (INTE "25 000 kr")
- Prisbasbeloppet 2025 = 58 800 kr → halvt = 29 400 kr
- Sambandsregeln (punkt 10.5 st 2): vid naturligt samband bedöms sammanlagt värde
- Referens till mervärdesskattelagen (2023:200)

**Varför detta test är viktigt:**
- AI:n svarar troligen "25 000 kr" — det var det gamla fasta beloppet
- Sedan BFNAR 2025:2 är gränsen kopplad till prisbasbeloppet (dynamiskt)
- Prisbasbeloppet ändras varje år
- Sambandsregeln (ny via BFNAR 2025:2) saknas i AI:ns träningsdata

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 192, Kapitel 10 punkt 10.5

---

## Test 9: Förskottsgräns — ny punkt (existens)

**Fråga:** "Får jag intäktsredovisa ett erhållet förskott på 5 000 kr direkt?"

**Förväntat svar ska innehålla:**
- Punkt 2.4A: Ja, förskott under **7 000 kr** får redovisas som intäkt direkt
- Punkt 2.4B: Väsentlighetsspärr — gäller inte om samlad påverkan är väsentlig
- Regeltyp: allmänt råd (bindande)

**Varför detta test är viktigt:**
- Punkt 2.4A är helt ny (BFNAR 2025:2) — existerar inte i AI:ns träningsdata
- AI:n kommer troligen svara utifrån punkt 2.4 (periodisering) utan att nämna förskottsregeln

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 31

---

## Test 10: Tomträtt med byggnad — ny punkt (existens)

**Fråga:** "Hur redovisas förvärv av tomträtt med byggnad enligt K2?"

**Förväntat svar ska innehålla:**
- Punkt 10.11A: Hela anskaffningsvärdet FÅR hänföras till byggnaden
- Undantag: om byggnaden saknar värde eller har obetydligt värde
- Regeltyp: allmänt råd (bindande)

**Varför detta test är viktigt:**
- Punkt 10.11A är helt ny (BFNAR 2025:2)
- AI:n saknar denna regel och svarar troligen att anskaffningsvärdet ska fördelas

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 198, Kapitel 10

---

## Test 11: Goodwill tilläggsköpeskilling — ny punkt (existens)

**Fråga:** "Hur skrivs goodwill av om den kommer från en tilläggsköpeskilling?"

**Förväntat svar ska innehålla:**
- Punkt 10.22A: Goodwill från tilläggsköpeskilling = separat avskrivningsenhet
- Punkt 9.3A om tilläggsköpeskilling
- Regeltyp: allmänt råd (bindande)

**Varför detta test är viktigt:**
- Punkt 10.22A och 9.3A är helt nya (BFNAR 2025:2)
- AI:n kommer troligen inte nämna separata avskrivningsenheter

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 204, Kapitel 10

---

## Test 12: Avskrivningsplan omprövning — ändrad regel

**Fråga:** "När får man ompröva en avskrivningsplan enligt K2?"

**Förväntat svar ska innehålla:**
- Punkt 10.26 st 1: Omprövas BARA vid nedskrivning eller uppenbart felaktig plan
- Punkt 10.26 st 2 (NY): Plan fastställd med punkt 10.27/10.28/10.30/10.31 FÅR ALLTID omprövas
- Regeltyp: allmänt råd (bindande)

**Varför detta test är viktigt:**
- Andra stycket i punkt 10.26 är nytt via BFNAR 2025:2
- AI:n kommer troligen bara nämna huvudregeln (nedskrivning/uppenbart felaktig)
- Den nya omprövningsrätten för schablonplaner är ett viktigt förenklingstillägg

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 205, Kapitel 10

---

## Test 13: Förbättringsutgift nyttjandeperiod — ändrad regel

**Fråga:** "Hur lång nyttjandeperiod har förbättringsutgifter på annans fastighet?"

**Förväntat svar ska innehålla:**
- Punkt 10.31: 10 år (förbättring tak/fasad/liknande), 20 år (annan förbättring)
- NY begränsning: Får INTE tillämpas om nyttjandeperioden skiljer sig väsentligt från planerad nyttjandetid
- Regeltyp: allmänt råd (bindande)

**Varför detta test är viktigt:**
- Väsentlighetsundantaget är nytt (BFNAR 2025:2)
- AI:n svarar troligen bara "10 eller 20 år" utan begränsningen

**Källa:** vl16-10-k2ar-kons2025.pdf, sida 210, Kapitel 10
