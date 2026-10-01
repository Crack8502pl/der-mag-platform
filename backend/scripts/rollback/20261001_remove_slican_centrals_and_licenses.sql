BEGIN;

DELETE FROM slican_license_specifications specification
USING slican_audio_seed_log seed
WHERE seed.seed_key = '20261001_seed_slican_centrals_and_licenses'
  AND seed.entity_table = 'slican_license_specifications'
  AND specification.id = seed.entity_id;

DELETE FROM slican_central_specifications specification
USING slican_audio_seed_log seed
WHERE seed.seed_key = '20261001_seed_slican_centrals_and_licenses'
  AND seed.entity_table = 'slican_central_specifications'
  AND specification.id = seed.entity_id;

DELETE FROM slican_audio_seed_log
WHERE seed_key = '20261001_seed_slican_centrals_and_licenses';

COMMIT;
