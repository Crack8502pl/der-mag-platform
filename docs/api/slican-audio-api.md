# Slican audio API

All routes are under `/api`, require authentication and return JSON. Error
responses use `{ "error": "..." }` unless noted. Authentication failures are
401; missing permissions are 403.

## Central specifications

Base path: `/api/slican-central-specifications`. GET requires `bom:read`, POST
`bom:create`, PUT `bom:update`, and DELETE `bom:delete`.

| Method and path | Request | Success response | Errors |
| --- | --- | --- | --- |
| `GET /` | None | `{ "success": true, "data": [central, ...] }` | 401, 403, 500 |
| `GET /:id` | Positive integer ID | `{ "success": true, "data": central }` | 400, 401, 403, 404, 500 |
| `POST /` | Central JSON below | 201 `{ "success": true, "data": central }` | 400, 401, 403, 404 (unknown stock), 409, 500 |
| `PUT /:id` | Partial central JSON | `{ "success": true, "data": central }` | 400, 401, 403, 404, 409, 500 |
| `DELETE /:id` | None | `{ "success": true }` | 400, 401, 403, 404, 500 |

Required create fields are `warehouseStockId`, `modelName`,
`maxSipVoipSubscribers`, `maxDphIpDevices`, `maxAudioIpDevices`,
`maxIvrChannels` and `maxConferenceChannels`. Optional fields are
`maxAllAccounts`, `maxCtsPhonesUp0Ip`, `maxConcurrentVoiceCalls`,
`maxConcurrentVideoCalls`, `maxWebctiMessengerctiAccounts`, `priority`,
`isActive` and `notes`. Limits and priority must be non-negative integers.
`warehouseStockId` must reference an existing stock row and may only be
assigned once.

```sh
curl -X POST https://example.com/api/slican-central-specifications \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"warehouseStockId":1234,"modelName":"NCP-CM300P.BC","maxSipVoipSubscribers":200,"maxDphIpDevices":10,"maxAudioIpDevices":10,"maxIvrChannels":4,"maxConferenceChannels":40}'
curl https://example.com/api/slican-central-specifications/1 \
  -H 'Authorization: ******'
curl -X PUT https://example.com/api/slican-central-specifications/1 \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"priority":5,"isActive":true}'
curl -X DELETE https://example.com/api/slican-central-specifications/1 \
  -H 'Authorization: ******'
```

## License specifications

Base path: `/api/slican-license-specifications`; authorization follows the
central CRUD endpoints above.

| Method and path | Request | Success response | Errors |
| --- | --- | --- | --- |
| `GET /` | None | `{ "success": true, "data": [license, ...] }` | 401, 403, 500 |
| `GET /:id` | Positive integer ID | `{ "success": true, "data": license }` | 400, 401, 403, 404, 500 |
| `POST /` | License JSON below | 201 `{ "success": true, "data": license }` | 400, 401, 403, 404, 409, 500 |
| `PUT /:id` | Partial license JSON | `{ "success": true, "data": license }` | 400, 401, 403, 404, 409, 500 |
| `DELETE /:id` | None | `{ "success": true }` | 400, 401, 403, 404, 500 |

Create requires `warehouseStockId`, `licenseType`, `packageSize` and
`demandField`. Types are `VOIP_SUBSCRIBER`, `AUDIO`, `IVR` and `CONFERENCE`;
package size is 1, 10 or 100. The corresponding demand fields are
`sipVoipSubscribers`, `audioDevices`, `ivrChannels` and `conferenceChannels`.
An active package size can only be configured once per license type.

```sh
curl -X POST https://example.com/api/slican-license-specifications \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"warehouseStockId":2345,"licenseType":"VOIP_SUBSCRIBER","packageSize":10,"demandField":"sipVoipSubscribers"}'
curl https://example.com/api/slican-license-specifications/1 \
  -H 'Authorization: ******'
curl -X PUT https://example.com/api/slican-license-specifications/1 \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"priority":5,"isActive":true}'
curl -X DELETE https://example.com/api/slican-license-specifications/1 \
  -H 'Authorization: ******'
```

## VoIP subscriber formula

Path: `/api/slican-voip-subscriber-formula`. GET requires `bom:read`; PUT
requires `bom:update`.

| Method | Request | Success response | Errors |
| --- | --- | --- | --- |
| `GET /` | None | `{ "success": true, "data": { "id": 1, "dphIpMultiplier": 1, "audioIpMultiplier": 1, "cts220IpMultiplier": 1 } }` (defaults if unset) | 401, 403, 500 |
| `PUT /` | Any subset of the three multiplier fields | `{ "success": true, "data": formula }` | 400, 401, 403, 500 |

Multipliers must be finite non-negative numbers with at most two decimal places
and at most 999.99.

```sh
curl https://example.com/api/slican-voip-subscriber-formula \
  -H 'Authorization: ******'
curl -X PUT https://example.com/api/slican-voip-subscriber-formula \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"dphIpMultiplier":1.5,"audioIpMultiplier":1,"cts220IpMultiplier":1}'
```

## Audio resolver

Canonical path: `POST /api/slican-audio/resolve`. The older
`POST /api/slican-audio-resolver/resolve` path remains supported. Requires
`bom:read`.

Request body must contain exactly these five non-negative integer fields:

```json
{
  "dphIpDevices": 4,
  "audioIpDevices": 6,
  "cts220IpDevices": 2,
  "ivrChannels": 1,
  "conferenceChannels": 4
}
```

Success response: `{ "centralRecommendation": { "warehouseStockId": 1234,
"modelName": "NCP-CM300P.BC" } | null, "licenses": [{ "type": "AUDIO",
"items": [{ "warehouseStockId": 2345, "quantity": 1 }] }], "warnings": [],
"bomItems": [{ "warehouseStockId": 1234, "quantity": 1 }] }`. The license list
contains each of the four types when a central fits; `bomItems` includes the
central and configured license stock quantities.

Errors: 400 invalid body, 401 unauthenticated, 403 permission denied, 422
calculation outside the supported integer range, 500 unexpected failure.
Missing/inactive configuration and package gaps are returned as warnings.

```sh
curl -X POST https://example.com/api/slican-audio/resolve \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"dphIpDevices":4,"audioIpDevices":6,"cts220IpDevices":2,"ivrChannels":1,"conferenceChannels":4}'
```

## SMOK-A hierarchy aggregation

Path: `POST /api/smoka/audio/aggregate`; requires `bom:read`.

```json
{
  "ownerId": "lcs-1",
  "nodes": [
    { "id": "lcs-1", "type": "LCS", "items": [] },
    {
      "id": "crossing-1",
      "type": "Przejazd",
      "parentId": "lcs-1",
      "ownerId": "lcs-1",
      "items": [{ "id": "dph-1", "deviceType": "DPH_IP", "quantity": 1 }]
    }
  ]
}
```

Success response: `{ "aggregate": { "dphIpDevices": 1, "audioIpDevices": 0,
"cts220IpDevices": 0, "ivrChannels": 0, "conferenceChannels": 0 },
"warnings": [] }`. Valid device types are `DPH_IP`, `AUDIO_IP`, `CTS220_IP`,
`IVR` and `CONFERENCE`; valid node types are `LCS`, `Nastawnia`, `Przejazd`,
`SKP` and `Point`. Errors: 400 invalid request or node, 401 unauthenticated,
403 permission denied, 500 unexpected failure.

```sh
curl -X POST https://example.com/api/smoka/audio/aggregate \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"ownerId":"lcs-1","nodes":[{"id":"lcs-1","type":"LCS","items":[]},{"id":"crossing-1","type":"Przejazd","ownerId":"lcs-1","items":[{"id":"dph-1","deviceType":"DPH_IP","quantity":1}]}]}'
```

The separate BOM orchestration endpoint is `POST
/api/bom-resolver/resolve`; its SMOK-A request may include `audioBreakdown`.
Audio stock quantities are mapped only to matching items in the selected BOM
template. Camera and recorder counts are not used as audio demand.
