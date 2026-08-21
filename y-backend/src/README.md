Backend structure:

- `modules/`
  - Business/domain modules such as `season`, `customer`, `entering`, `company-paddy`, `farmer-paddy`, and `rice`
  - Each module keeps its own controller, service, module file, and `dto/`
- `infrastructure/`
  - Shared technical wiring such as Prisma
- `generated/`
  - Generated code kept separate from handwritten application code
- Root files
  - `main.ts` bootstraps Nest
  - `app.module.ts` composes the application modules
