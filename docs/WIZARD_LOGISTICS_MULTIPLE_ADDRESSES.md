# Wizard — Krok 7: Logistyka (Wielokrotne Adresy Dostawy)

## Przegląd

Krok logistyki został rozbudowany o możliwość dodawania **wielokrotnych adresów dostawy**,
z których każdy posiada własne dane kontaktowe (telefon, osoba kontaktowa) oraz listę przypisanych zadań.

## Funkcjonalności

### 1. Wielokrotne adresy dostawy
- Przycisk **"➕ Dodaj adres"** — dynamicznie dodaje nowy blok adresu
- Przycisk **"✕ Usuń"** w każdym bloku — usuwa wybrany adres
- Każdy adres przechowuje własne dane kontaktowe i listę zadań

### 2. Dane kontaktowe per adres
- **Telefon kontaktowy** (wymagany) — z auto-formatowaniem do `+48-XXX-XXX-XXX` na blur
  - 9 cyfr → `+48-XXX-XXX-XXX`
  - 11 cyfr z prefiksem 48 → `+48-XXX-XXX-XXX`
- **Osoba kontaktowa** (opcjonalna) — imię i nazwisko

### 3. Przypisywanie zadań do adresów
- **Adres 1** — wyświetla wszystkie zadania z wizarda
- **Adres 2+** — wyświetla tylko zadania **niezaznaczone** w poprzednich adresach
- Tekst informacyjny: *"Lista Zadań: do zaznaczenia. Nie wyświetlaj wyżej zaznaczonych"*

### 4. Walidacja
Krok można opuścić tylko gdy:
- Istnieje co najmniej jeden adres z wypełnionym polem `address`
- Co najmniej jeden adres ma wypełnione pole `contactPhone`

## Struktura Danych

```typescript
export interface DeliveryAddress {
  id: string;            // UUID generowany przy tworzeniu
  address: string;       // Adres tekstowy (multiline)
  contactPhone: string;  // Format: +48-XXX-XXX-XXX
  contactPerson: string; // Imię i nazwisko
  taskIds: string[];     // Klucze zadań: "{subsystemType}-{taskIdx}"
}

export interface LogisticsData {
  deliveryAddresses: DeliveryAddress[];
  shippingNotes?: string;
  preferredDeliveryDate?: string;
  orderEmails?: OrderEmailsConfig;
}
```

## Klucze Zadań

Każde zadanie identyfikowane jest kluczem `{subsystemType}-{globalTaskIdx}`, np.:
- `SMOKIP_A-0` — pierwsze zadanie podsystemu SMOKIP_A
- `SMOKIP_B-2` — trzecie zadanie podsystemu SMOKIP_B

Klucze te odpowiadają kluczom używanym w `InfrastructureStep` (`perTask`).

## Filtowanie zadań

Funkcja `getAssignedBefore(addrIdx)` zwraca zbiór kluczy zadań przypisanych
do wszystkich adresów **przed** adresem o danym indeksie.
Zadania z tego zbioru nie są pokazywane w bieżącym adresie.

## Plik Komponentu

`frontend/src/components/contracts/wizard/steps/LogisticsStep.tsx`

## Plik CSS

`frontend/src/components/contracts/wizard/steps/LogisticsStep.css`

Wspiera grover-theme (ciemny) i huskey-theme (jasny) przez zmienne CSS.
