# SMOK-A wizard: audio configuration

1. Open the SMOK-A task configuration wizard and enter the camera configuration
   as usual. Audio is a separate section; camera counts do not imply audio
   devices.
2. Add Slican audio items to the applicable LCS, Nastawnia or Przejazd task
   metadata. Supported entries are DPH.IP, Audio.IP, CTS220.IP, IVR and
   conference channels. Use non-negative whole-number quantities.
3. Resolve the BOM. The wizard aggregates entries for the LCS owner (or a
   standalone Nastawnia owner), removes duplicate device IDs, then requests a
   central and license recommendation.
4. Review the **Audio / Slican** section in the BOM step and summary. It shows
   counts, central recommendation, selected license package quantities and
   audio warnings separately from cameras and recorders.
5. If the hierarchy changes, resolve again. The wizard re-aggregates the
   current hierarchy and updates the recommendation and BOM quantities.

## Reading warnings

* **No active central**: an administrator must verify and activate a central
  specification.
* **No central fits**: the current demand exceeds at least one configured
  central limit; ask an administrator to review demand and catalog limits.
* **Missing license/package**: the matching license type or package SKU is not
  active/configured. Do not substitute a different license manually.
* **Duplicate device**: a repeated device ID is counted once. Check whether the
  repeated item represents the same physical device.
* **Different owner**: the node is assigned to another owner and is excluded
  from this aggregate.

If there is no audio demand, older projects continue through normal BOM
resolution without an audio recommendation. Camera, recorder and disk results
are unchanged by audio configuration.

## Screenshots

The UI includes an Audio / Slican region in the BOM step and an audio summary
when audio data is present. Capture the actual hierarchy, BOM and summary steps
in staging once available. Staging credentials and screenshots were not
available while preparing this guide; screenshots should not be fabricated.
