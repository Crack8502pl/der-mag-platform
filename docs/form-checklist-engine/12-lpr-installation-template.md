# Form & Checklist Engine — etap 12: LPR Installation

## Przykładowy template

`LprInstallationSeed` tworzy idempotentnie template `LPR_INSTALLATION` jako `CHECKLIST` procedury `FIELD_INSTALLATION`, wraz z opublikowaną wersją 1. Seed uruchamia się przy standardowym seedowaniu aplikacji i konfiguracji bazy (`DatabaseSeeder.seed()`); istniejący template o tym kluczu nie jest nadpisywany.

Przykład zawiera sekcje: Montaż mechaniczny, Zasilanie, Sieć, Konfiguracja, Ustawienie kamery, LPR, Nagrywanie i Test końcowy. Pola pokrywają instalację kamery, napięcie, łączność i adresację, synchronizację NTP, test LPR, nagrywanie oraz odtwarzanie.

Gdy `plateRecognitionTest` ma wartość `FAIL`, pola `failureDescription` i `failurePhoto` stają się wymagane. Wbudowana reguła backendu blokuje ukończenie każdej instancji z odpowiedzią `FAIL`.

## Ograniczenia

Obecny registry nie ma typu pola uploadu/zdjęcia ani endpointu załączników. Dlatego `cameraViewPhoto`, `failurePhoto` i `finalPhoto` są polami tekstowymi na referencję do zdjęcia; nie przesyłają ani nie walidują plików. Adres IP jest polem tekstowym bez walidacji formatu IP. Po dodaniu wspólnego kontraktu uploadu należy zmienić typy w definicji, nie tworzyć specjalnego UI wyłącznie dla LPR.

Template jest przykładową definicją danych silnika, nie implementacją workflow ani logiki biznesowej osadzonej w rendererze. Można go otworzyć w `/admin/forms` i utworzyć kolejną wersję z istniejącego UI.

## Weryfikacja

Test `backend/tests/unit/services/LprInstallationSeed.test.ts` sprawdza typ i procedurę template’u, opublikowaną wersję, osiem sekcji, pola warunkowe oraz brak nadpisania istniejącego template’u.
