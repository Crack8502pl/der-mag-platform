# BOM Parameter Mapping – Dokumentacja

Poniższy dokument opisuje wszystkie zmienne dostępne do mapowania w szablonach BOM (`BomSubsystemTemplate`).
Każda pozycja BOM może korzystać z tych parametrów przez pole `configParamName` (przy `quantitySource: FROM_CONFIG`).

---

## Źródło 1: Wizard Config (`subsystemWizardConfig.ts`)

### SMOKIP_A

| Nazwa parametru       | Typ     | Opis                              | Przykład użycia w BOM                                          |
|-----------------------|---------|-----------------------------------|----------------------------------------------------------------|
| `przejazdyKatA`       | number  | Ilość przejazdów Kat A            | `quantitySource: FROM_CONFIG, configParamName: "przejazdyKatA"` |
| `iloscSKP`            | number  | Ilość SKP                         | `configParamName: "iloscSKP"`                                  |
| `iloscNastawni`       | number  | Ilość Nastawni                    | `configParamName: "iloscNastawni"`                             |
| `hasLCS`              | boolean | LCS obecny                        | Warunkowe dodanie pozycji BOM                                  |
| `nastawniaSamodzielna`| boolean | Nastawnia samodzielna (brak LCS)  | Warunkowe dodanie pozycji BOM                                  |
| `hasCUID`             | boolean | CUID obecny                       | Warunkowe dodanie pozycji BOM                                  |
| `gatewayIP`           | text    | Gateway IP                        | –                                                              |
| `subnetMask`          | text    | Subnet Mask                       | –                                                              |

### SMOKIP_B

| Nazwa parametru  | Typ     | Opis                  |
|------------------|---------|-----------------------|
| `przejazdyKatB`  | number  | Ilość przejazdów Kat B|
| `iloscNastawni`  | number  | Ilość Nastawni        |
| `hasLCS`         | boolean | LCS obecny            |
| `hasCUID`        | boolean | CUID obecny           |
| `gatewayIP`      | text    | Gateway IP            |
| `subnetMask`     | text    | Subnet Mask           |

### SKD

| Nazwa parametru    | Typ    | Opis              |
|--------------------|--------|-------------------|
| `iloscBudynkow`    | number | Ilość budynków    |
| `iloscDrzwi`       | number | Ilość drzwi       |
| `iloscCzytelnikow` | number | Ilość czytników   |
| `gatewayIP`        | text   | Gateway IP        |
| `subnetMask`       | text   | Subnet Mask       |

### Generic (SSWIN, CCTV, SDIP, SUG, SSP, LAN, OTK, ZASILANIE)

| Nazwa parametru    | Typ    | Opis                  |
|--------------------|--------|-----------------------|
| `iloscBudynkow`    | number | Ilość budynków        |
| `iloscPomieszczen` | number | Ilość pomieszczeń     |
| `iloscKontenerow`  | number | Ilość kontenerów      |

### SMW

| Nazwa parametru         | Typ     | Opis                             |
|-------------------------|---------|----------------------------------|
| `iloscStacji`           | number  | Ilość stacji                     |
| `iloscKontenerow`       | number  | Ilość kontenerów                 |
| `sokEnabled`            | boolean | SOK włączony                     |
| `extraViewingEnabled`   | boolean | Dodatkowe stanowisko oglądowe    |

---

## Źródło 2: Task Details (`wizard.types.ts` – TaskDetail)

Dostępne dla zadań szczegółowych (PRZEJAZD, SKP, NASTAWNIA, LCS, CUID):

| Nazwa parametru | Typ    | Opis                                        |
|-----------------|--------|---------------------------------------------|
| `taskType`      | string | Typ zadania (PRZEJAZD_KAT_A, SKP, LCS, …)  |
| `kilometraz`    | string | Kilometraż (np. "12+345")                   |
| `kategoria`     | string | Kategoria przejazdu (KAT A/B/C/E/F)         |
| `nazwa`         | string | Nazwa (np. nazwa nastawni)                  |
| `miejscowosc`   | string | Miejscowość                                 |
| `liniaKolejowa` | string | Numer linii kolejowej                       |
| `gpsLatitude`   | string | Szerokość GPS                               |
| `gpsLongitude`  | string | Długość GPS                                 |

---

## Źródło 3: Konfiguracja LCS (`lcs.types.ts`)

### LCSConfigSmokA

| Ścieżka parametru                            | Typ     | Opis                         |
|----------------------------------------------|---------|------------------------------|
| `lcsConfig.iloscStanowisk`                   | number  | Ilość stanowisk operatorskich|
| `lcsConfig.iloscMonitorow`                   | number  | Ilość monitorów              |
| `lcsConfig.funkcjonalnosci.obserwacja`       | boolean | Funkcja obserwacji           |
| `lcsConfig.funkcjonalnosci.lacznoscAudio`    | boolean | Łączność audio               |
| `lcsConfig.funkcjonalnosci.zapisObrazu`      | boolean | Zapis obrazu                 |
| `lcsConfig.funkcjonalnosci.zapisAudio`       | boolean | Zapis audio                  |
| `lcsConfig.funkcjonalnosci.obslugaLPR`       | boolean | Obsługa LPR                  |
| `lcsConfig.serwerLPR.ip`                     | string  | IP serwera LPR               |
| `lcsConfig.serwerLPR.port`                   | number  | Port serwera LPR             |
| `lcsConfig.serwerLPR.maxTablicNaMinute`      | number  | Max tablic/min               |
| `lcsConfig.hasCUID`                          | boolean | CUID włączony                |
| `lcsConfig.cuidConfig.stanowiskoZgran`       | string  | Stanowisko zgrań             |
| `lcsConfig.cuidConfig.typNosnika`            | string  | Typ nośnika (USB/DVD/HDD)    |
| `lcsConfig.cuidConfig.formatWyjsciowy`       | string  | Format wyjściowy (AVI/MP4/MKV)|

### LCSConfigSmokB

| Ścieżka parametru                           | Typ     | Opis                               |
|---------------------------------------------|---------|------------------------------------|
| `lcsConfig.obserwowanePrzejazdy`            | array   | Lista obserwowanych przejazdów     |
| `lcsConfig.serwerObrazu.ip`                 | string  | IP serwera obrazu                  |
| `lcsConfig.serwerObrazu.maxKamer`           | number  | Max kamer                          |
| `lcsConfig.serwerObrazu.protokol`           | string  | Protokół (RTSP/ONVIF)              |
| `lcsConfig.stacjeOperatorskie`              | array   | Lista stacji operatorskich         |
| `lcsConfig.hasCUID`                         | boolean | CUID włączony                      |
| `lcsConfig.cuidConfig.stanowiskoZgran`      | string  | Stanowisko zgrań                   |
| `lcsConfig.cuidConfig.typNosnika`           | string  | Typ nośnika (USB/DVD/HDD)          |
| `lcsConfig.cuidConfig.formatWyjsciowy`      | string  | Format wyjściowy (AVI/MP4/MKV)     |

---

## Źródło 4: Konfiguracja Nastawni (`nastawnia.types.ts`)

### NastawniaSamodzielnaConfig

| Ścieżka parametru                                    | Typ     | Opis                           |
|------------------------------------------------------|---------|--------------------------------|
| `nastawniConfig.iloscStanowisk`                      | number  | Ilość stanowisk                |
| `nastawniConfig.iloscMonitorow`                      | number  | Ilość monitorów                |
| `nastawniConfig.funkcjonalnosci.obserwacja`          | boolean | Obserwacja                     |
| `nastawniConfig.funkcjonalnosci.lacznoscAudio`       | boolean | Łączność audio                 |
| `nastawniConfig.funkcjonalnosci.zapisObrazu`         | boolean | Zapis obrazu                   |
| `nastawniConfig.funkcjonalnosci.zapisAudio`          | boolean | Zapis audio                    |
| `nastawniConfig.funkcjonalnosci.obslugaLPR`          | boolean | Obsługa LPR                    |
| `nastawniConfig.serwerLokalny.ip`                    | string  | IP serwera lokalnego           |
| `nastawniConfig.serwerLokalny.typ`                   | string  | Typ serwera (NVR/VMS)          |
| `nastawniConfig.telefonSystemowy.numerWewnetrzny`    | string  | Numer wewnętrzny telefonu      |
| `nastawniConfig.telefonSystemowy.typ`                | string  | Typ telefonu (SIP/ANALOG)      |
| `nastawniConfig.systemPodtrzymania.typ`              | string  | Typ UPS (UPS/AKUMULATOR)       |
| `nastawniConfig.systemPodtrzymania.czasPodtrzymania` | number  | Czas podtrzymania (min)        |
| `nastawniConfig.switchTransmisji.typ`                | string  | Typ switcha                    |
| `nastawniConfig.switchTransmisji.iloscPortow`        | number  | Ilość portów                   |
| `nastawniConfig.switchTransmisji.iloscPortowSFP`     | number  | Ilość portów SFP               |

### NastawniaPodleglaConfig

| Ścieżka parametru                                            | Typ            | Opis                              |
|--------------------------------------------------------------|----------------|-----------------------------------|
| `nastawniConfig.nadrzedneLCSId`                              | number         | ID nadrzędnego LCS                |
| `nastawniConfig.serwerWyswietlania.ip`                       | string         | IP serwera wyświetlania           |
| `nastawniConfig.serwerWyswietlania.maxMonitorow`             | number         | Max monitorów                     |
| `nastawniConfig.stacjaOperatorska.iloscMonitorow`            | number         | Ilość monitorów stacji            |
| `nastawniConfig.stacjaOperatorska.przypisaneKamery`          | array (string) | Kamery przypisane do stacji       |
| `nastawniConfig.telefonSystemowy.numerWewnetrzny`            | string         | Numer wewnętrzny telefonu         |
| `nastawniConfig.telefonSystemowy.typ`                        | string         | Typ telefonu (SIP/ANALOG)         |
| `nastawniConfig.infrastruktura.systemPodtrzymania.mocVA`     | number         | Moc UPS (VA)                      |
| `nastawniConfig.infrastruktura.switchTransmisji.model`       | string         | Model switcha                     |
| `nastawniConfig.infrastruktura.switchTransmisji.iloscPortow` | number         | Ilość portów                      |

---

## Źródło 5: SMW Wizard Data (`subsystemWizardConfig.ts` – SmwWizardData)

| Ścieżka parametru                                         | Typ     | Opis                             |
|-----------------------------------------------------------|---------|----------------------------------|
| `smwData.iloscStacji`                                     | number  | Ilość stacji                     |
| `smwData.iloscKontenerow`                                 | number  | Ilość kontenerów                 |
| `smwData.sokEnabled`                                      | boolean | SOK włączony                     |
| `smwData.extraViewingEnabled`                             | boolean | Stanowisko oglądowe włączone     |
| `smwData.stations[].name`                                 | string  | Nazwa stacji                     |
| `smwData.stations[].platforms`                            | number  | Ilość peronów                    |
| `smwData.stations[].elevators`                            | number  | Ilość wind                       |
| `smwData.stations[].tunnels`                              | number  | Ilość tuneli                     |
| `smwData.stations[].platformCabinets[].platformNumber`    | number  | Numer peronu                     |
| `smwData.stations[].platformCabinets[].cabinets[].type`   | string  | Typ szafy (S1/S2/S3/S4)          |
| `smwData.stations[].platformCabinets[].cabinets[].name`   | string  | Nazwa szafy                      |
| `smwData.sokConfig.nameAddress`                           | string  | Adres/nazwa SOK                  |
| `smwData.sokConfig.cabinets[]`                            | array   | Szafy SOK                        |
| `smwData.extraViewingConfig.nameAddress`                  | string  | Adres stanowiska oglądowego      |
| `smwData.extraViewingConfig.cabinets[]`                   | array   | Szafy stanowiska                 |
| `smwData.lcsConfig.cabinets[]`                            | array   | Szafy LCS                        |

---

## Jak używać w BOM Template

### Przykład 1: Stała ilość

```typescript
{
  materialName: "Szafa serwerowa 42U",
  quantitySource: "FIXED",
  defaultQuantity: 1
}
```

### Przykład 2: Ilość z parametru wizarda (FROM_CONFIG – wartość bezpośrednio)

```typescript
{
  materialName: "Sterownik przejazdu",
  quantitySource: "FROM_CONFIG",
  configParamName: "przejazdyKatA",  // MUSI być identyczne z nazwą z wizarda!
  defaultQuantity: 1  // fallback gdy parametr brak
}
// Wynik: przejazdyKatA=5 → ilość = 5 (wartość bezpośrednio z konfiguracji)
```

### Przykład 2b: Ilość = wielokrotność parametru wizarda (PER_UNIT – mnożnik)

```typescript
{
  materialName: "Kamera IP PTZ",
  quantitySource: "PER_UNIT",
  configParamName: "przejazdyKatA",  // MUSI być identyczne z nazwą z wizarda!
  defaultQuantity: 2  // 2 kamery na każdy przejazd
}
// Wynik: przejazdyKatA=5 → 2×5 = 10 kamer
```

### Przykład 3: Ilość zależna od innej pozycji

```typescript
{
  materialName: "Kabel zasilający",
  quantitySource: "DEPENDENT",
  dependsOnItemId: 123,  // ID pozycji "Kamera IP PTZ"
  dependencyFormula: "* 1.5"  // 1.5 kabla na kamerę
}
```

### Przykład 4: Warunkowe dodanie pozycji

```typescript
// Użyj reguł zależności (BomTemplateDependencyRule) dla warunkowego dodawania
// np. dodaj "Serwer LPR" tylko gdy lcsConfig.funkcjonalnosci.obslugaLPR === true
```

---

## Powiązanie z magazynem (Warehouse)

Każda pozycja w BOM Template może mieć `warehouseStockId` który linkuje do pozycji magazynowej:

```typescript
{
  materialName: "Kamera IP PTZ Hikvision DS-2DE4425IW",
  warehouseStockId: 456,  // ← FK do tabeli warehouse_stock
  quantitySource: "FROM_CONFIG",
  configParamName: "iloscKamer"
}
```

Przy generowaniu BOM:
1. System pobiera szablon dla danego typu zadania
2. Dla każdej pozycji:
   - `FIXED` → używa `defaultQuantity` wprost
   - `FROM_CONFIG` → pobiera wartość z `task.metadata.configParams[configParamName]` (wartość bezpośrednio, `defaultQuantity` jako fallback)
   - `PER_UNIT` → mnoży `defaultQuantity` × wartość z `configParamName`
3. Jeśli `warehouseStockId` jest ustawione → rezerwuje/przypisuje materiał z magazynu

---

## Typy zadań (taskVariant) dla dopasowania szablonów

| subsystemType | taskVariant          | Opis                            |
|---------------|----------------------|---------------------------------|
| SMOKIP_A      | PRZEJAZD_KAT_A       | Przejazd kategorii A            |
| SMOKIP_A      | PRZEJAZD_KAT_B       | Przejazd kategorii B (w syst. A)|
| SMOKIP_A      | PRZEJAZD_KAT_C       | Przejazd kategorii C            |
| SMOKIP_A      | PRZEJAZD_KAT_E       | Przejazd kategorii E            |
| SMOKIP_A      | PRZEJAZD_KAT_F       | Przejazd kategorii F            |
| SMOKIP_A      | SKP                  | Samoczynna sygnalizacja         |
| SMOKIP_A      | NASTAWNIA            | Nastawnia                       |
| SMOKIP_A      | LCS                  | Lokalne Centrum Sterowania      |
| SMOKIP_A      | CUID                 | Centrum zgrywania danych        |
| SMOKIP_B      | PRZEJAZD_KAT_B       | Przejazd kategorii B            |
| SMOKIP_B      | NASTAWNIA            | Nastawnia                       |
| SMOKIP_B      | LCS                  | Lokalne Centrum Sterowania      |
| SMOKIP_B      | CUID                 | Centrum zgrywania danych        |
| SMW           | SMW_PLATFORM         | Peron SMW                       |
| SMW           | SMW_SOK              | SOK                             |
| SMW           | SMW_LCS              | LCS SMW                         |
| SMW           | SMW_EXTRA_VIEWING    | Stanowisko oglądowe             |
| SKD           | BUDYNEK              | Budynek SKD                     |
| SKD           | KONTENER             | Kontener SKD                    |
| SKD           | PRZEJSCIE            | Przejście                       |
| SSWIN         | BUDYNEK              | Budynek                         |
| SSWIN         | POMIESZCZENIE        | Pomieszczenie                   |
| SSWIN         | KONTENER             | Kontener                        |
| CCTV          | BUDYNEK              | Budynek                         |
| CCTV          | POMIESZCZENIE        | Pomieszczenie                   |
| CCTV          | KONTENER             | Kontener                        |
