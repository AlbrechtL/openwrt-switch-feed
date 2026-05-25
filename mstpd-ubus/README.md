# DISCLAIMER

This README was initially generated with AI assistance Please verify all technical details against the source code and runtime
behavior before production use.

# mstpd-ubus

OpenWrt package that ships `mstpd` plus a ucode ubus compatibility wrapper
(`ustp` object) so netifd can manage STP through the same API used by `ustp`.

## What This Package Installs

| Component | Path | Purpose |
|---|---|---|
| `mstpd` | `/sbin/mstpd` | STP/RSTP/MSTP daemon |
| `mstpctl` | `/sbin/mstpctl` | Control CLI for `mstpd` |
| `mstpd-ubus.uc` | `/usr/libexec/mstpd-ubus.uc` | Exposes `ustp` ubus object |
| `bridge-stp` | `/sbin/bridge-stp` | Kernel userspace-STP helper entry point |
| `mstp_restart` | `/sbin/mstp_restart` | Compatibility alias to `bridge-stp` |
| helper scripts | `/lib/mstpctl-utils/*` | Support scripts used by mstpd tooling |
| config | `/etc/bridge-stp.conf` | bridge-stp configuration |

## Important Behavior

1. `bridge-stp` must exist for Linux bridge to enter userspace STP mode
   (`stp_state=2`).
2. `brctl show` may show STP as `yes`/`2` while `mstpctl showbridge` still says
   disabled if bridge handoff is incomplete.
3. The wrapper now retries `mstpctl addbridge` on startup to avoid boot-order
   races (netifd bridge ready vs mstpd readiness).

## ubus API

Inspect API:

```sh
ubus -v list ustp
```

Methods:

1. `ustp add_bridge`
2. `ustp bridge_state`

### `ustp add_bridge`

Caches bridge configuration payload for compatibility with netifd/ustp flow.

Parameters:

| Field | Type |
|---|---|
| `name` | string |
| `proto` | string |
| `forward_delay` | int |
| `hello_time` | int |
| `max_age` | int |
| `ageing_time` | int |

Example:

```sh
ubus call ustp add_bridge '{
  "name": "switch",
  "proto": "rstp",
  "forward_delay": 15,
  "hello_time": 2,
  "max_age": 20,
  "ageing_time": 300
}'
```

### `ustp bridge_state`

Enables or disables mstpd bridge management.

Parameters:

| Field | Type |
|---|---|
| `name` | string |
| `enabled` | bool |

Examples:

```sh
# Enable
ubus call ustp bridge_state '{"name":"switch","enabled":true}'

# Disable
ubus call ustp bridge_state '{"name":"switch","enabled":false}'
```

## Boot And Runtime Flow

1. `/etc/init.d/mstpd` starts both `mstpd` and `mstpd-ubus.uc`.
2. Wrapper publishes `ustp` ubus object.
3. Wrapper subscribes to `network.device` and triggers `stp_init` replay.
4. On `stp_init`, wrapper caches bridge data and schedules `addbridge`.
5. If `addbridge` fails early (race), wrapper retries until success or timeout.

## Verification Commands

```sh
# Kernel STP mode (expect STP enabled  = 2 for userspace STP)
brctl show switch

# mstpd bridge status (expect enabled yes / stp enabled yes)
mstpctl showbridge switch

# ubus object signature
ubus -v list ustp

# wrapper logs
logread -f | grep mstpd-ubus
```

## Service Commands

```sh
service mstpd start
service mstpd stop
service mstpd restart
service mstpd enable
```

