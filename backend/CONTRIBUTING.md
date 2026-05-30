## ⚠️ Encje TypeORM — obowiązkowe jawne typy kolumn

Ten projekt używa `tsx` (esbuild) który nie emituje metadanych typów dekoratorów.

**Każdy `@Column()` MUSI mieć `type:` podany jawnie.**

Szczegóły: [`docs/ENTITIES.md`](docs/ENTITIES.md)

Wzorzec: [`src/entities/User.ts`](src/entities/User.ts)
