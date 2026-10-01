# Slican audio deployment checklist

## Release gates

- [ ] TypeScript build passes: `cd backend && npm run build`
- [ ] Backend tests pass: `cd backend && npm test -- --runInBand`
- [ ] Slican audio coverage reviewed; target changed-code coverage is 70–80%
- [ ] Lint passes using the repository's configured CI lint job
- [ ] Schema migration is applied and verified
- [ ] Production seed migration tested against a disposable PostgreSQL database
- [ ] Catalog/warehouse stock mappings and limits independently reviewed
- [ ] Generated specifications remain inactive until values are verified
- [ ] Staging deployment succeeds
- [ ] Staging smoke and integration tests pass
- [ ] `/admin/bom` opens and central/license configuration can be edited
- [ ] `POST /api/slican-audio/resolve` returns expected central and license data
- [ ] SMOK-A wizard displays Audio / Slican data and warnings
- [ ] Camera, recorder, SMOKIP_B, CCTV and legacy project regression checks pass
- [ ] Architecture, API, administrator, user, data retention and rollback docs reviewed
- [ ] Real staging screenshots attached for admin and wizard steps
- [ ] Product Manager approval recorded
- [ ] QA approval recorded
- [ ] DevOps approval recorded
- [ ] Production deployment approved and scheduled

## Post-deployment

- [ ] Check API errors and latency
- [ ] Check central/license warnings and resolver outcomes
- [ ] Confirm support contact and rollback owner are on call
- [ ] Record release version, migration result and approval references
