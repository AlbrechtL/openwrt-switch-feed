include $(TOPDIR)/rules.mk

PKG_NAME:=pn-scanner
PKG_RELEASE:=1
PKG_BUILD_DEPENDS:=libpcap

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/AlbrechtL/profinet_scanner.git
PKG_SOURCE_DATE:=2026-03-25
PKG_SOURCE_VERSION:=73b993e8f17e02dede30cf637d6b249541c229e3
PKG_MIRROR_HASH:=skip

PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE.txt
PKG_BUILD_PARALLEL:=1

ifdef LOCAL_SOURCE_DIR
USE_SOURCE_DIR:=$(LOCAL_SOURCE_DIR)
endif

CMAKE_INSTALL:=1
CMAKE_BINARY_SUBDIR:=openwrt-build

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk

define Package/pn-scanner
  SECTION:=net
  CATEGORY:=Network
  TITLE:=PROFINET device scanner
  URL:=https://github.com/AlbrechtL/profinet_scanner
  DEPENDS:=+libpcap +libpthread
endef

define Package/pn-scanner/description
 A PROFINET scanner for Layer 2 DCP discovery and Layer 3 RPC-based scans.
endef

define Package/pn-scanner/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/pn_scanner $(1)/usr/bin/
endef

$(eval $(call BuildPackage,pn-scanner))