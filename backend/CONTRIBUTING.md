## ⚠️ Encje TypeORM — obowiązkowe jawne typy kolumn

Ten projekt używa `tsx` (esbuild) który nie emituje metadanych typów dekoratorów.

**Każdy `@Column()` MUSI mieć `type:` podany jawnie.**

Szczegóły: [`backend/docs/ENTITIES.md`](backend/docs/ENTITIES.md)

Wzorzec: [`backend/src/entities/User.ts`](backend/src/entities/User.ts)
