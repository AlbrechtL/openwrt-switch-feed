# luci-app-rstp

LuCI frontend for configuring and monitoring bridge STP/RSTP/MSTP instances
managed by the `mstpd-ustp` package.

Current scope:

- bridge discovery from `/sys/class/net/*/brif`
- persistent bridge and per-port settings in `/etc/config/rstp`
- runtime bridge apply through the `ustp` ubus object exposed by `mstpd-ustp`
- per-port edge port status polling through `ustp get_port_status`

Current backend limitation:

- the `ustp` ubus API currently exposes runtime setters for bridge mode and
  timing values plus per-port edge port configuration, but not bridge
  priority, hold count, or max hops setters. These values are stored in UCI and
  shown in the UI, but are not pushed into runtime yet.
