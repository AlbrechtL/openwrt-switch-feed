#
# Copyright (C) 2026 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=mstpd
PKG_VERSION:=0.2.0
PKG_RELEASE:=1

PKG_SOURCE_URL:=https://github.com/mstpd/mstpd.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=3ccdf6b421ecfc5b9ff260148d6616d3be48da0d
PKG_SOURCE_DATE:=2026-04-28
PKG_MIRROR_HASH:=skip

PKG_MAINTAINER:=Albrecht Lohofener <albrechtloh@gmx.de>
PKG_LICENSE:=GPL-2.0
PKG_BUILD_FLAGS:=lto
PKG_FIXUP:=autoreconf
PKG_INSTALL:=1

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/autotools.mk

define Package/mstpd-ubus
  SECTION:=net
  CATEGORY:=Network
  TITLE:=MSTP daemon with ubus integration
  DEPENDS:=+ucode +ucode-mod-ubus +ucode-mod-uloop +ucode-mod-fs
endef

define Package/mstpd-ubus/description
  The mstpd daemon is an implementation of the Multiple Spanning Tree Protocol
  (MSTP, IEEE 802.1Q-2005). This package includes ubus integration for
  management and control.
endef

CONFIGURE_ARGS += \
	--prefix=/usr \
	--exec-prefix= \
	--sbindir=/sbin \
	--sysconfdir=/etc \
	--localstatedir=/var \
	--libexecdir=/lib

define Package/mstpd-ubus/install
	$(INSTALL_DIR) $(1)/sbin $(1)/etc $(1)/etc/init.d $(1)/lib/mstpctl-utils $(1)/usr/libexec
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/sbin/mstpd $(1)/sbin/mstpd
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/sbin/mstpctl $(1)/sbin/mstpctl
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/sbin/bridge-stp $(1)/sbin/bridge-stp
	ln -sf bridge-stp $(1)/sbin/mstp_restart
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/lib/mstpctl-utils/ifquery $(1)/lib/mstpctl-utils/ifquery
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/lib/mstpctl-utils/ifupdown.sh $(1)/lib/mstpctl-utils/ifupdown.sh
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/lib/mstpctl-utils/mstp_config_bridge $(1)/lib/mstpctl-utils/mstp_config_bridge
	$(INSTALL_DATA) $(PKG_INSTALL_DIR)/lib/mstpctl-utils/mstpctl-utils-functions.sh $(1)/lib/mstpctl-utils/mstpctl-utils-functions.sh
	ln -sf /sbin/bridge-stp $(1)/lib/mstpctl-utils/mstpctl_restart_config
	$(INSTALL_CONF) $(PKG_INSTALL_DIR)/etc/bridge-stp.conf $(1)/etc/bridge-stp.conf
	$(INSTALL_BIN) ./files/mstpd-ubus.uc $(1)/usr/libexec/mstpd-ubus.uc
	$(INSTALL_BIN) ./files/mstpd.init $(1)/etc/init.d/mstpd
endef

$(eval $(call BuildPackage,mstpd-ubus))
