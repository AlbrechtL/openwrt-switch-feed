#
# Copyright (C) 2026 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=rtl838x-switch-utils
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0
PKG_MAINTAINER:=Albrecht Lohofener <albrecht@albrechtloh.de>

PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/rtl838x-switch-utils
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Utility scripts for RTL838x switches
  PKGARCH:=all
endef

define Package/rtl838x-switch-utils/description
 Collection of shell scripts for operating and testing RTL838x switches.
endef

define Build/Prepare
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/rtl838x-switch-utils/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/rtl838x-led-chase $(1)/usr/sbin/rtl838x-led-chase
endef

$(eval $(call BuildPackage,rtl838x-switch-utils))