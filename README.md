# OpenWrt Switch Development Feed

This repository is my development feed for implementing missing Ethernet switch features in OpenWrt.

It contains custom packages and LuCI applications focused on switch management, diagnostics, and operational tooling.

## Purpose

The goal of this feed is to:

- add and test missing Ethernet switch functionality,
- provide LuCI integration for easier configuration,
- iterate quickly on switch-related features before upstreaming.

## Package Overview

Current packages in this feed include:

- `mstpd-ubus` - MSTP daemon with ubus integration,
- `port-mirror-scripts` - UCI-managed tc-based port mirroring,
- `rtl838x-switch-utils` - Utility scripts for RTL838x switch operation/testing,
- `pn-scanner` - PROFINET device scanner,
- `luci-app-rstp` - LuCI app for RSTP-related configuration/monitoring,
- `luci-app-port-mirror` - LuCI app for port mirroring management,
- `luci-app-pn-scanner` - LuCI app frontend for pn-scanner.

## Usage

### 1. Add feed to `feeds.conf`

Example:

```text
src-git switch https://github.com/AlbrechtL/openwrt-switch-feed.git
```

For local development, you can also use:

```text
src-link switch /path/to/openwrt-switch-feed
```

### 2. Update and install feed packages

From the OpenWrt root directory:

```bash
./scripts/feeds update switch
./scripts/feeds install -a -p switch
```

### 3. Select packages in menuconfig

```bash
make menuconfig
```

Look for packages under:

- `Network` (core switch/network packages),
- `LuCI -> Applications` (LuCI apps).

### 4. Build

```bash
make -j$(nproc)
```

## Development Notes

- After adding or changing package Makefiles, run:

```bash
./scripts/feeds update -i switch
./scripts/feeds install -a -p switch
```

This refreshes feed indexes and package links so new entries appear in `menuconfig`.

- LuCI packages located outside the `feeds/luci` tree should include:

```make
include $(TOPDIR)/feeds/luci/luci.mk
```

## License

Each package keeps its own license metadata in its Makefile and source files.
