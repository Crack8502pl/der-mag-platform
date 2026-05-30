# Zasady pisania encji TypeORM

## ⚠️ Wymagane — jawne typy kolumn (tsx / esbuild)

Ten projekt używa `tsx` jako runnera developerskiego.  
`tsx` używa `esbuild` pod spodem, który **celowo nie emituje `emitDecoratorMetadata`**.

Oznacza to że TypeORM **nie może automatycznie odgadnąć typu kolumny** na podstawie
typu TypeScript — mimo że `emitDecoratorMetadata: true` jest w `tsconfig.json`.

> **Historia:** Problem wykryty po raz pierwszy przy PR #517 (2026-05-30).  
> Encje `Photo.ts` i `PhotoAlbum.ts` zostały wygenerowane bez jawnych typów kolumn,  
> co powodowało crash serwera przy starcie (`ColumnTypeUndefinedError`).

---

## 📋 Reguła obowiązkowa

Każdy `@Column()` na polu `string` lub `boolean` **MUSI** mieć jawny `type:`.

| Typ TypeScript | ❌ Źle — crash przy starcie | ✅ Dobrze |
|---|---|---|
| `string` (krótki) | `@Column()` | `@Column({ type: 'varchar' })` |
| `string` (długi tekst) | `@Column()` | `@Column({ type: 'text' })` |
| `boolean` | `@Column()` | `@Column({ type: 'boolean' })` |
| `number` (całkowity) | `@Column()` | `@Column({ type: 'int' })` |
| `number` (dziesiętny) | `@Column()` | `@Column({ type: 'decimal' })` |
| `Date` | `@Column()` | `@Column({ type: 'timestamp' })` |
| `object / JSON` | `@Column()` | `@Column({ type: 'jsonb' })` |

> Nawet jeśli `number` i `Date` mogą działać w niektórych przypadkach,  
> dla spójności kodu **zawsze podawaj `type:` jawnie** — bez wyjątków.

---

## 🔍 Dlaczego `tsconfig.json` nie pomaga?

```
tsconfig.json
└─► emitDecoratorMetadata: true  ← ustawienie dla kompilatora tsc
                                    IGNOROWANE przez tsx/esbuild

tsx (esbuild)
└─► celowo pomija emitDecoratorMetadata dla szybkości
    nie ma flagi, komentarza ani żadnego mechanizmu
    który zmieni to zachowanie per plik lub globalnie
```

**esbuild** to celowy wybór projektowy — szybkość kosztem metadanych typów.  
Nie zostanie to naprawione po stronie esbuild. `tsx` zostaje w projekcie.

---

## ✅ Wzorcowa encja

Zobacz [`src/entities/User.ts`](../src/entities/User.ts) — każda kolumna ma jawny `type:`  
z komentarzem wyjaśniającym zasadę (linia 36).

---

## 🛠️ Jak sprawdzić czy encja jest poprawna?

Uruchom poniższą komendę — wylistuje wszystkie `@Column()` **bez** jawnego `type:`:

```bash
grep -rn "@Column(" src/entities/ | grep -v "type:" | grep -v "PrimaryGenerated" | grep -v "CreateDate" | grep -v "UpdateDate"
```

Jeśli wynik jest pusty — wszystkie encje są poprawne. ✅

---

## 📝 Szablon nowej encji

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// UWAGA: tsx (esbuild) nie emituje decorator metadata.
// Każdy @Column() na polu string/boolean MUSI mieć jawny type:
// Zobacz: User.ts jako wzorzec i docs/ENTITIES.md
@Entity('my_table')
export class MyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })          // string krótki
  name: string;

  @Column({ type: 'text', nullable: true })  // string długi
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int' })
  count: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```
