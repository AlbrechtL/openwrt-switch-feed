# luci-app-port-mirror

LuCI application for configuring persistent tc-based port mirroring rules
managed by `port-mirror-scripts`.

## Scope

- Edits `/etc/config/port-mirror`
- Presents mirror rules under LuCI Network menu
- Uses existing backend apply logic from `/usr/sbin/port-mirror-apply`

## Notes

- Backend constraints are still authoritative:
  - source and target must be valid devices
  - source and target must not be the same
  - at least one direction must be enabled
  - only one enabled rule per source device is supported