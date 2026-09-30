# Slican audio configuration

```text
SMOK-A audio demand (aggregation in #673)
    → VoIP multiplier formula → active central satisfying all five limits
    → independent license packages per demand field → BOM (#673)
```

This API configures existing Symfonia products only. First locate the product through
`GET /api/warehouse-stock`, then use its `id` as `warehouseStockId` in the
Slican central or license configuration. No product is created or renamed here.
Administrators may edit limits, priorities, package mappings and activity without
deploying code. Selection uses only active centrals; the lowest `priority` wins,
then the lowest VoIP capacity. IVR and conference limits must be entered by an
administrator: no catalog values or voice-channel fallback are assumed.

All endpoints require authentication and `bom:read` for GET, `bom:create` for
POST, `bom:update` for PUT, and `bom:delete` for DELETE. For example:

```sh
curl -H "Authorization: ******" -H "Content-Type: application/json" \
  -d '{"warehouseStockId":1234,"modelName":"NCP-CM300P.BC","maxSipVoipSubscribers":200,"maxDphIpDevices":10,"maxAudioIpDevices":10,"maxIvrChannels":4,"maxConferenceChannels":40}' \
  https://example.com/api/slican-central-specifications

curl -X PUT -H "Authorization: ******" -H "Content-Type: application/json" \
  -d '{"maxIvrChannels":8,"isActive":true}' \
  https://example.com/api/slican-central-specifications/1

curl -H "Authorization: ******" \
  'https://example.com/api/slican-central-specifications/select?demand=%7B%22dphIp%22%3A4%2C%22audioIp%22%3A6%2C%22cts220Ip%22%3A2%2C%22ivr%22%3A1%2C%22conf%22%3A4%7D'

curl -H "Authorization: ******" -H "Content-Type: application/json" \
  -d '{"warehouseStockId":2345,"licenseType":"VOIP_SUBSCRIBER","packageSize":10,"demandField":"sipVoipSubscribers"}' \
  https://example.com/api/slican-license-specifications

curl -X PUT -H "Authorization: ******" -H "Content-Type: application/json" \
  -d '{"dphIpMultiplier":1.5,"audioIpMultiplier":1,"cts220IpMultiplier":1}' \
  https://example.com/api/slican-voip-subscriber-formula
```

CRUD (`GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) is available for
both `slican-central-specifications` and `slican-license-specifications`.
Formula uses `GET /` and `PUT /` and defaults to multipliers of 1. A license
type maps to one demand field: `VOIP_SUBSCRIBER → sipVoipSubscribers`,
`AUDIO → audioDevices`, `IVR → ivrChannels`, `CONFERENCE → conferenceChannels`.
Each configured type requires active package sizes 100, 10 and 1 to calculate
its demand; incomplete sets return 422. An entirely unconfigured type yields a
warning instead. Selection responds with `{central, sipVoipSubscribers,
licenses, warnings}`; `central: null` and a warning means none fits. CRUD rejects
invalid input (400), missing stock/specifications (404), and already-assigned
products or active license packages (409). Deleting a configuration does not
delete the Symfonia stock record.

VoIP subscribers = `ceil(dphIpDevices × dphIpMultiplier + audioIpDevices ×
audioIpMultiplier + cts220IpDevices × cts220IpMultiplier)`. Multipliers are
global, non-negative and stored to two decimal places.

For each nonzero license demand, divide by 100, then 10, then 1. At each tier
use whole packages plus a remainder. Round up to the next 100 only if the
remainder is **99**, and to the next 10 if it is **9**; otherwise continue to
the smaller tier. Examples: 12 → 10 + 2×1; 89 → 9×10; 901 → 9×100 + 1;
912 → 9×100 + 10 + 2×1; 99 → 100; 9999 → 100×100.
The problem statement's `rest100 >= 9` pseudocode conflicts with its own
examples (it would make 12 → 100); this implementation follows the examples.

Apply `scripts/migrations/20260930_add_slican_audio_specs.sql` with the
repository's migration workflow or manually through `psql`. It is idempotent
and does not insert products. Roll back *configuration only* in dependency
order:

```sql
DROP TABLE IF EXISTS slican_license_specifications;
DROP TABLE IF EXISTS slican_voip_subscriber_formula;
DROP TABLE IF EXISTS slican_central_specifications;
```

Open business questions for #673: which additional catalog limits should
participate in selection? Should multipliers vary by central? How should
retired products and their successors be handled? Hierarchy aggregation,
ownership and final BOM insertion belong to #673, not this configuration API.
