# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Albrecht Lohofener <albrechtloh@gmx.de>

LUCI_TITLE:=LuCI Support for Port Mirroring
LUCI_DESCRIPTION:=Configure tc-based port mirror rules managed by port-mirror-scripts
LUCI_DEPENDS:=+luci-base +port-mirror-scripts
LUCI_PKGARCH:=all

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature