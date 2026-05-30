# Contributing — der-mag-platform backend

## ⚠️ Encje TypeORM — obowiązkowe jawne typy kolumn

Ten projekt używa `tsx` (esbuild) który **nie emituje metadanych typów dekoratorów**.

**Każdy `@Column()` MUSI mieć `type:` podany jawnie.**

```typescript
// ❌ ŹLE — crash przy starcie serwera
@Column()
name: string;

// ✅ DOBRZE
@Column({ type: 'varchar' })
name: string;
```

📖 Pełna dokumentacja: [`docs/ENTITIES.md`](docs/ENTITIES.md)  
🔎 Wzorzec: [`src/entities/User.ts`](src/entities/User.ts)  

---

## 🛠️ Uruchomienie projektu

```bash
npm install
npm run dev
```

---

## 🗂️ Migracje bazy danych

Wszystkie pliki migracyjne **muszą mieć datę utworzenia w nazwie**, np.:

```
20260530_add_photos_table.ts
```

---

## 🎨 Motywy CSS

Projekt przełącza się między dwoma motywami:
- `grover-theme` — ciemny
- `huskey-theme` — jasny

---

## ✅ Standardy kodu

- Testy: pokrycie **70–80%**
- Build TypeScript musi przechodzić bez błędów: `npm run build`
- Sprawdź encje przed commitem:

```bash
grep -rn "@Column(" src/entities/ | grep -v "type:" | grep -v "PrimaryGenerated" | grep -v "CreateDate" | grep -v "UpdateDate"
```
