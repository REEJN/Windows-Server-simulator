# Validation

Verified on October 1, 2026 for Release **v1.1.0** (Schema Version 2).

- **22 automated tests pass cleanly** across `tests/*.test.mjs`:
  - Lab 01 baseline: initial blank workstation; OU/user membership and password options; shared-folder/Security requirements; domain/password/IP validation; interrupted-session recovery; BIOS discard/save; clean reinstallation; media removal during setup; Windows path rendering.
  - Schema migration: non-destructive migration of schema v1 local storage saves to schema v2 with full network entities.
  - Lab 02: router LAN/WAN, DHCP pool, WLAN SSID `SERVERLAB-WIFI`, WPA2-PSK security passphrase, mobile client association, DHCP lease allocation, gateway ping, server ping, and mobile router web administration.
  - Lab 03: static IPv4 and 127.0.0.1 DNS, classroom Windows Firewall profile toggles, AD DS Security Group creation and user membership, Remote Desktop enablement with NLA, RDP connection testing (`mstsc`), Task Manager process/performance inspection, and Services management console verification.
  - Network domain model: IP conversions, subnet math, DHCP lease allocation/renewal/release, mobile Wi-Fi association, DNS resolution, and deterministic ICMP ping diagnostics.
  - End-to-end journey tests for Lab 02 (100% completion) and Lab 03 (100% completion).
- **JavaScript syntax checks pass for all six ES modules**:
  - `dist/app.js`
  - `dist/os.js`
  - `dist/engine.js`
  - `dist/network.js`
  - `dist/browser.js`
  - `dist/mobile.js`
- **Zero external network requests**: All DHCP, DNS, HTTP router admin, and ping packets operate 100% in-memory and client-side without any real external socket or OS dependencies.
- **Backward compatibility preserved**: Lab 01 16-task mission is preserved exactly, existing bookmarks and local storage data migrate cleanly, and UI responsiveness is validated across desktop and mobile screens.
