# Przewodnik tworzenia szablonów dokumentów

## Wprowadzenie
System Grover umożliwia tworzenie szablonów dokumentów z dynamicznymi placeholderami, które są automatycznie wypełniane danymi z systemu.

## Obsługiwane formaty
- **DOCX** (Microsoft Word) - rekomendowany
- **XLSX** (Microsoft Excel)
- **PDF** (tylko podgląd, bez edycji)

## Składnia placeholderów
Placeholdery używają składni: `{{nazwa_pola}}`

Przykład w dokumencie Word:
```
Protokół zdawczo-odbiorczy nr {{task_number}}

Data: {{date}}
Kontrakt: {{contract_name}}
Wykonawca: {{contractor_name}}
```

## Dostępne placeholdery

### Dane kontraktu (contracts.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{contract_id}}` | ID kontraktu | 123 |
| `{{contract_number}}` | Numer kontraktu | R2024001 |
| `{{contract_name}}` | Nazwa kontraktu | Modernizacja stacji Warszawa Centralna |
| `{{contract_client}}` | Nazwa klienta | PKP PLK S.A. |
| `{{contract_start_date}}` | Data rozpoczęcia | 2024-01-15 |
| `{{contract_end_date}}` | Data zakończenia | 2024-12-31 |
| `{{contract_status}}` | Status kontraktu | W realizacji |
| `{{contract_manager}}` | Imię i nazwisko managera | Jan Kowalski |
| `{{contract_value}}` | Wartość kontraktu | 1 500 000,00 PLN |

### Dane zadania (tasks.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{task_id}}` | ID zadania | 456 |
| `{{task_number}}` | Numer zadania | P0000101240103 |
| `{{task_title}}` | Tytuł zadania | Montaż systemu CCTV - Peron 1 |
| `{{task_type}}` | Typ zadania | SMW |
| `{{task_status}}` | Status zadania | W realizacji |
| `{{task_priority}}` | Priorytet | Wysoki |
| `{{task_location}}` | Lokalizacja | Warszawa Centralna, Peron 1 |
| `{{task_planned_start}}` | Planowana data rozpoczęcia | 2024-03-01 |
| `{{task_planned_end}}` | Planowana data zakończenia | 2024-03-15 |
| `{{task_actual_start}}` | Rzeczywista data rozpoczęcia | 2024-03-02 |
| `{{task_actual_end}}` | Rzeczywista data zakończenia | 2024-03-14 |
| `{{task_assigned_to}}` | Przypisany pracownik | Piotr Nowak |
| `{{task_created_by}}` | Utworzone przez | Jan Kowalski |
| `{{task_description}}` | Opis zadania | Montaż 8 kamer IP na peronie... |

### Dane podsystemu (subsystems.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{subsystem_id}}` | ID podsystemu | 789 |
| `{{subsystem_name}}` | Nazwa podsystemu | SMW - System Monitoringu Wizyjnego |
| `{{subsystem_code}}` | Kod podsystemu | SMW |
| `{{subsystem_location}}` | Lokalizacja | Peron 1 |
| `{{subsystem_device_count}}` | Liczba urządzeń | 8 |

### Dane urządzenia (devices.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{device_id}}` | ID urządzenia | 1001 |
| `{{device_serial}}` | Numer seryjny | SN-2024-001234 |
| `{{device_type}}` | Typ urządzenia | Kamera IP |
| `{{device_manufacturer}}` | Producent | Hikvision |
| `{{device_model}}` | Model | DS-2CD2143G2-I |
| `{{device_ip}}` | Adres IP | 192.168.1.101 |
| `{{device_mac}}` | Adres MAC | AA:BB:CC:DD:EE:01 |
| `{{device_status}}` | Status | Zainstalowane |
| `{{device_location}}` | Lokalizacja | Peron 1, Słup 3 |
| `{{device_installed_by}}` | Zainstalowane przez | Piotr Nowak |
| `{{device_installed_date}}` | Data instalacji | 2024-03-10 |

### Dane sieciowe (network.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{network_pool}}` | Nazwa puli IP | POOL-SMW-001 |
| `{{network_address}}` | Adres sieci | 192.168.1.0/24 |
| `{{network_gateway}}` | Brama domyślna | 192.168.1.1 |
| `{{network_mask}}` | Maska podsieci | 255.255.255.0 |
| `{{network_vlan}}` | VLAN ID | 100 |
| `{{network_capacity}}` | Pojemność puli | 254 |
| `{{network_used}}` | Wykorzystane IP | 45 |
| `{{network_available}}` | Dostępne IP | 209 |

### Dane materiałów BOM (bom.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{bom_material_name}}` | Nazwa materiału | Kabel UTP Cat6 |
| `{{bom_catalog_number}}` | Numer katalogowy | CAT6-UTP-305 |
| `{{bom_quantity}}` | Ilość | 500 |
| `{{bom_unit}}` | Jednostka | m |
| `{{bom_unit_price}}` | Cena jednostkowa | 2,50 PLN |
| `{{bom_total_price}}` | Wartość | 1 250,00 PLN |
| `{{bom_supplier}}` | Dostawca | Elektro-Kabel Sp. z o.o. |
| `{{bom_category}}` | Kategoria | Okablowanie |

### Dane użytkownika (user.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{user_id}}` | ID użytkownika | 15 |
| `{{user_username}}` | Login | jkowalski |
| `{{user_email}}` | Email | jan.kowalski@firma.pl |
| `{{user_first_name}}` | Imię | Jan |
| `{{user_last_name}}` | Nazwisko | Kowalski |
| `{{user_full_name}}` | Pełne imię i nazwisko | Jan Kowalski |
| `{{user_phone}}` | Telefon | +48 123 456 789 |
| `{{user_role}}` | Rola | Menedżer |

### Dane systemowe (system.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{date}}` | Bieżąca data | 2024-03-14 |
| `{{datetime}}` | Bieżąca data i godzina | 2024-03-14 15:30:00 |
| `{{time}}` | Bieżąca godzina | 15:30:00 |
| `{{year}}` | Bieżący rok | 2024 |
| `{{month}}` | Bieżący miesiąc | 03 |
| `{{day}}` | Bieżący dzień | 14 |
| `{{generated_by}}` | Wygenerowane przez | System Grover |
| `{{document_id}}` | ID dokumentu | DOC-2024-001234 |

### Dane firmy (company.*)
| Placeholder | Opis | Przykład wartości |
|-------------|------|-------------------|
| `{{company_name}}` | Nazwa firmy | Der-Mag Sp. z o.o. |
| `{{company_address}}` | Adres | ul. Kolejowa 15, 00-001 Warszawa |
| `{{company_nip}}` | NIP | 123-456-78-90 |
| `{{company_regon}}` | REGON | 123456789 |
| `{{company_phone}}` | Telefon | +48 22 123 45 67 |
| `{{company_email}}` | Email | biuro@der-mag.pl |

## Tabele i listy

### Tabela materiałów BOM
Użyj znacznika `{{#bom_items}}...{{/bom_items}}` do iteracji:

```
{{#bom_items}}
| {{bom_material_name}} | {{bom_quantity}} {{bom_unit}} | {{bom_unit_price}} | {{bom_total_price}} |
{{/bom_items}}
```

### Tabela urządzeń
```
{{#devices}}
| {{device_serial}} | {{device_type}} | {{device_ip}} | {{device_status}} |
{{/devices}}
```

### Tabela adresów IP
```
{{#ip_addresses}}
| {{ip_address}} | {{ip_device}} | {{ip_status}} |
{{/ip_addresses}}
```

## Formatowanie warunkowe

### Wyświetlanie warunkowe
```
{{#if task_actual_end}}
Data zakończenia: {{task_actual_end}}
{{else}}
Zadanie w trakcie realizacji
{{/if}}
```

### Sprawdzanie statusu
```
{{#if_eq task_status "Zakończone"}}
✅ Zadanie zakończone pomyślnie
{{/if_eq}}
```

## Przykładowe szablony

### 1. Protokół zdawczo-odbiorczy
```
PROTOKÓŁ ZDAWCZO-ODBIORCZY NR {{task_number}}

Data: {{date}}
Kontrakt: {{contract_name}} ({{contract_number}})
Zadanie: {{task_title}}
Lokalizacja: {{task_location}}

WYKONAWCA:
{{company_name}}
{{company_address}}
NIP: {{company_nip}}

ZAMAWIAJĄCY:
{{contract_client}}

PRZEDMIOT ODBIORU:
{{task_description}}

LISTA ZAMONTOWANYCH URZĄDZEŃ:
{{#devices}}
- {{device_type}} {{device_model}}, SN: {{device_serial}}, IP: {{device_ip}}
{{/devices}}

UWAGI:
_______________________________________________________

Podpisy:

Przekazujący: ___________________    Odbierający: ___________________
             {{user_full_name}}                   

Data: {{date}}
```

### 2. Raport kompletacji
```
RAPORT KOMPLETACJI

Numer zadania: {{task_number}}
Data kompletacji: {{date}}
Kompletujący: {{user_full_name}}

LISTA MATERIAŁÓW:
| Lp. | Nazwa | Nr kat. | Ilość | Jednostka |
|-----|-------|---------|-------|-----------|
{{#bom_items}}
| {{@index}} | {{bom_material_name}} | {{bom_catalog_number}} | {{bom_quantity}} | {{bom_unit}} |
{{/bom_items}}

Status: {{completion_status}}
Uwagi: {{completion_notes}}
```

### 3. Macierz adresacji IP
```
MACIERZ ADRESACJI IP

Podsystem: {{subsystem_name}}
Pula: {{network_pool}}
Zakres: {{network_address}}
Gateway: {{network_gateway}}

| Adres IP | Urządzenie | Typ | Status |
|----------|------------|-----|--------|
{{#ip_addresses}}
| {{ip_address}} | {{ip_device}} | {{ip_type}} | {{ip_status}} |
{{/ip_addresses}}

Wykorzystanie: {{network_used}}/{{network_capacity}} ({{network_usage_percent}}%)
```

## Wskazówki

1. **Testuj szablony** przed użyciem produkcyjnym
2. **Używaj opisowych nazw** dla własnych placeholderów
3. **Zachowaj formatowanie** - placeholdery muszą być dokładnie takie jak w dokumentacji
4. **Sprawdzaj wielkość liter** - placeholdery są case-sensitive
5. **Unikaj znaków specjalnych** w nazwach placeholderów

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| Placeholder nie jest wypełniany | Sprawdź pisownię i wielkość liter |
| Brak danych | Upewnij się, że dane istnieją w systemie |
| Błąd formatowania | Sprawdź czy zamknąłeś wszystkie znaczniki |
| Tabela nie działa | Użyj znaczników {{#...}} i {{/...}} |

---

**Wersja dokumentu:** 1.0  
**Data ostatniej aktualizacji:** 2026-01-03  
**Autor:** System Grover
