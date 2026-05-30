# Zasady pisania encji TypeORM

## ⚠️ Wymagane — jawne typy kolumn (tsx / esbuild)

Ten projekt używa `tsx` jako runnera developerskiego.  
`tsx` używa `esbuild` pod spodem, który **celowo nie emituje `emitDecoratorMetadata`**.

Oznacza to że TypeORM **nie może automatycznie odgadnąć typu kolumny** na podstawie
typu TypeScript — mimo że `emitDecoratorMetadata: true` jest w `tsconfig.json`.

### Reguła obowiązkowa

Każdy `@Column()` na polu `string` lub `boolean` **MUSI** mieć jawny `type:`.

| Typ TypeScript | ❌ Źle (crash) | ✅ Dobrze |
|---|---|---|
| `string` | `@Column()` | `@Column({ type: 'varchar' })` |
| `string` długi tekst | `@Column()` | `@Column({ type: 'text' })` |
| `boolean` | `@Column()` | `@Column({ type: 'boolean' })` |
| `number` | `@Column()` | `@Column({ type: 'int' })` |
| `Date` | `@Column()` | `@Column({ type: 'timestamp' })` |

### Typy które działają bez jawnego `type:` ❌ (nie rób wyjątków — zawsze podawaj jawnie)

Nawet jeśli `number` i `Date` mogą działać w niektórych przypadkach,
dla spójności kodu ZAWSZE podawaj `type:` jawnie.

### Wzorcowa encja

Zobacz `src/entities/User.ts` — każda kolumna ma jawny `type:` z komentarzem wyjaśniającym zasadę.

### Dlaczego `tsconfig.json` nie pomaga?

`emitDecoratorMetadata: true` w `tsconfig.json` działa tylko z kompilatorem `tsc`.
`tsx` używa `esbuild` który **ignoruje tę opcję** dla szybkości kompilacji.
Jest to celowe ograniczenie esbuild — nie zostanie naprawione.

### Historia

Problem wykryty po raz pierwszy przy PR #517 (2026-05-30) — encja `Photo.ts`
została wygenerowana bez jawnych typów kolumn co spowodowało crash serwera.
