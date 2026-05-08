# System Motywów CSS - Grover & Huskey

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
