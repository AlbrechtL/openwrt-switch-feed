# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Albrecht Lohofener <albrechtloh@gmx.de>
PKG_RELEASE:=3

LUCI_TITLE:=LuCI Support for RSTP
LUCI_DESCRIPTION:=Configure and monitor bridge spanning tree settings backed by mstpd-ustp
LUCI_DEPENDS:=+luci-base +mstpd-ubus +rpcd-mod-ucode
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
