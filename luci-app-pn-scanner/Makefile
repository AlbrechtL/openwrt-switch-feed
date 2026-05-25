# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Albrecht Lohofener <albrechtloh@gmx.de>

LUCI_TITLE:=LuCI Support for pn-scanner
LUCI_DESCRIPTION:=Run PROFINET scans from LuCI diagnostics style interface
LUCI_DEPENDS:=+luci-base +luci-mod-network +pn-scanner
LUCI_PKGARCH:=all

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
