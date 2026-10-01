# Slican audio administrator guide

## Before configuring

Confirm the production warehouse contains the intended Slican products. The API
references an existing `warehouse_stock` row by ID; it does not create or
rename products. Confirm the product and stock ID with:

```sh
curl https://example.com/api/warehouse-stock \
  -H 'Authorization: ******'
```

Use only limits and package sizes verified against the current Slican catalog
and the organization's license inventory. The seed migration intentionally
leaves generated records inactive pending this review.

## Add a central

Create one central specification per stock item. Enter the model name and the
five resolver limits (SIP/VoIP, DPH.IP, Audio.IP, IVR and conference channels).
Optional catalog limits are informational; they currently do not affect
selection. Start inactive until a second administrator has checked the values.

```sh
curl -X POST https://example.com/api/slican-central-specifications \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"warehouseStockId":1234,"modelName":"NCP-CM300P.BC","maxSipVoipSubscribers":200,"maxDphIpDevices":10,"maxAudioIpDevices":10,"maxIvrChannels":4,"maxConferenceChannels":40,"priority":10,"isActive":false}'
```

## Add licenses and package sizes

For each license type, configure the real stock SKU for package sizes 1, 10 and
100, using the matching demand field. The resolver rejects ambiguous active
package sizes and warns when a required package is missing. Verify stock IDs
and SKU labels before activating entries.

```sh
curl -X POST https://example.com/api/slican-license-specifications \
  -H 'Authorization: ******' -H 'Content-Type: application/json' \
  -d '{"warehouseStockId":2345,"licenseType":"AUDIO","packageSize":10,"demandField":"audioDevices","isActive":false}'
```

## Priorities and formula

When multiple active centrals meet all limits, the lowest numeric `priority`
wins; ties use the lower VoIP capacity and then ID. Edit the formula through
`PUT /api/slican-voip-subscriber-formula`. VoIP demand is the ceiling of the
weighted DPH.IP, Audio.IP and CTS220.IP counts. Keep the default multiplier at
1 unless a product owner approves another rule.

Activate verified central and license records with the corresponding PUT
endpoints. Re-run the API resolver using representative demand before opening
the feature to users.

## Warnings and troubleshooting

* **No active central / none fits:** check `isActive`, all five limits and the
  configured priority.
* **Missing package / license type:** check active SKU rows and package sizes
  1, 10 and 100 for the matching type and demand field.
* **No BOM item:** add the selected warehouse stock item to the applicable BOM
  template; resolution does not create template entries.
* **Unexpected selection:** compare configured limits and priorities, then
  test at `/api/slican-audio/resolve`.
* **Aggregation warning:** inspect repeated node IDs, item IDs/device IDs and
  owner assignments in the submitted hierarchy.

## Admin screen

The Slican specifications are managed from the BOM administration area at
`/admin/bom`, under the **Slican audio** tab. The tab has separate **Centrales**
and **Licenses** sections. Capture and attach a screenshot of the deployed
admin page after staging access is available; no staging credentials or live
screenshot were available while preparing this guide.
