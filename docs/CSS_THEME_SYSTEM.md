# System Motywów CSS - Grover & Huskey

## 🎨 Filozofia Kolorów

### Grover Theme - Owczarek Niemiecki (German Shepherd)
Paleta inspirowana naturalną kolorystyką owczarka niemieckiego:
- **Czarny/Ciemnobrązowy** (#1a1a1a, #252525) - ciemna sierść
- **Brązowy/Tan** (#2d2d2d, #2a2a2a) - brązowe odcienie
- **Pomarańczowo-karmelowy** (#ff6b35, #e55a2a) - charakterystyczne tan/karmelowe zabarwienie
- **Zielony** (#48bb78) - tylko dla statusu "success" (nie primary!)

### Huskey Theme - Husky Syberyjski
Paleta inspirowana huskyem syberyjskim:
- **Biały/Jasnoszary** (#ffffff, #f5f5f5) - biała sierść
- **Niebieski** (#2563EB, #1D4ED8) - charakterystyczne niebieskie oczy
- **Szary** (#e8e8e8, #64748B) - szare odcienie sierści

## ⚠️ Najczęstsze Błędy

### ❌ BŁĄD: Używanie zielonego jako primary w grover-theme
```css
/* ZŁE */
--primary-color: #4caf50; /* Zielony! */
```

### ✅ POPRAWNE: Pomarańczowy jako primary w grover-theme
```css
/* DOBRE */
--primary-color: #ff6b35; /* Pomarańczowy owczarka niemieckiego */
--success-color: #48bb78; /* Zielony TYLKO dla success */
```

## 📊 Tabela Kolorów

| Zmienna | Grover (Dark) | Huskey (Light) | Użycie |
|---------|---------------|----------------|--------|
| `--primary-color` | **#ff6b35** 🟠 | **#2563EB** 🔵 | Przyciski, linki, akcenty |
| `--primary-hover` | **#e55a2a** 🟠 | **#1D4ED8** 🔵 | Hover state |
| `--success-color` | **#48bb78** ✅ | **#388e3c** ✅ | Success status TYLKO |
| `--warning-color` | **#ed8936** ⚠️ | **#f57c00** ⚠️ | Ostrzeżenia |
| `--danger-color` | **#f56565** ❌ | **#d32f2f** ❌ | Błędy, delete |
| `--info-color` | **#4299e1** ℹ️ | **#1976d2** ℹ️ | Informacje |

## Definicje Motywów

### Grover Theme (Dark Mode) - Domyślny
```css
:root {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --bg-tertiary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #aaa;
  --border-color: #333;
}
```

### Huskey Theme (Light Mode)
Aktywacja:
1. `@media (prefers-color-scheme: light)` - automatyczne
2. `body.light-theme` - manual toggle
3. `:root[data-theme="husky"]` - wsparcie dla przełącznika aplikacji

## Komponenty Wspierające Motywy

- ✅ TaskConfigurationStep
- ✅ TokenTimerWidget
- ✅ WizardStepIndicator
- ✅ TokenExpirationModal
- ✅ CustomOrdersStep

## Best Practices

1. **Zawsze używaj zmiennych CSS** - nigdy hardcoded kolorów
2. **Definicje na początku** - sekcja `:root` przed stylami komponentu
3. **Trzy poziomy wsparcia**:
   - `:root` - grover (dark)
   - `@media (prefers-color-scheme: light)` - huskey auto
   - `body.light-theme` / `:root[data-theme="husky"]` - huskey manual
4. **Smooth transitions** - `transition: all 0.2s`
