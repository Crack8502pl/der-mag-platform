# Slican audio rollback plan

Rollback is triggered by a confirmed production-impacting audio error, incorrect
BOM quantities, unauthorized access or regression in camera/recorder behavior.
The release owner coordinates the application and database steps.

## By environment

* **Staging:** stop the test rollout, preserve logs, revert the PR deployment
  and reset disposable test data.
* **Canary:** disable the feature for the cohort, deploy the prior application
  version, then remove only configuration rows recorded by the seed migration
  if data rollback is approved.
* **Full production:** stop new SMOK-A audio resolutions using the agreed
  feature control, deploy the prior application version and assess database
  rollback with the database owner. Do not drop the schema tables if preserving
  configured production data is safer.

## Database rollback

Back up the database and review the exact rows first. The seed rollback script
deletes only records tracked as inserted by the `20261001` seed. It preserves
warehouse products and pre-existing manually configured specifications.

```sh
cd backend
psql "$DB_CONNECTION_STRING" -v ON_ERROR_STOP=1 \
  -f scripts/rollback/20261001_remove_slican_centrals_and_licenses.sql
```

The separate schema rollback in
`scripts/migrations/20260930_add_slican_audio_specs.sql` drops all configuration
tables and is destructive. Use it only when the database owner confirms that
all Slican configuration can be discarded and no running application needs
those tables.

## Recovery steps

1. Pause new SMOK-A audio projects or disable the rollout cohort.
2. Capture request IDs, logs and a database backup.
3. Decide with the database owner whether seed rows, all audio configuration or
   neither should be removed. Prefer application rollback without data deletion.
4. Deploy the previously approved application version.
5. Monitor API errors and camera/recorder workflows for at least one hour.
6. Notify affected users and record the incident, decision and data changes.
