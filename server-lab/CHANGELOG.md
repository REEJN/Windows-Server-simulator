# Changelog

All notable changes to Serverlab are recorded here. Releases follow [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-01

### Added

- **Multi-Lab Curriculum Architecture**:
  - Expanded from single workstation to three structured curriculum labs:
    - **Lab 01: System Administration & AD DS** (16 original tasks preserved 100% backward-compatible).
    - **Lab 02: Network & Router Lab** (10 tasks: TP-Link TL-WR841N management interface at `192.168.1.1`, simulated mobile data WAN uplink, LAN/DHCP pool, WLAN `SERVERLAB-WIFI`, WPA2-PSK security, mobile device client, and ping diagnostics).
    - **Lab 03: Security & Monitoring** (9 tasks: static IPv4/DNS configuration, classroom Windows Firewall profiles, Active Directory Security Groups and user membership, Remote Desktop Connection enablement & client testing, Task Manager processes/performance, and Services management console).
- **Deterministic In-Memory Network Domain Model (`dist/network.js`)**:
  - Router management state (`loginRouter`, `updateRouterLan`, `updateRouterWan`, `updateRouterWlan`, `updateRouterDhcp`, `rebootRouter`, `resetRouter`).
  - Mobile client Wi-Fi association and release (`connectMobileWifi`, `disconnectMobileWifi`).
  - Deterministic in-memory DHCP lease allocation and pool exhaustion handling (`requestDhcpLease`, `releaseDhcpLease`).
  - Realistic DNS resolution and ICMP ping diagnostics (`simulatePing`, `resolveDns`).
- **Web Browser & TP-Link Router Web Admin (`dist/browser.js`)**:
  - Simulated Internet Explorer application on the server desktop.
  - Authentic TP-Link TL-WR841N web management interface supporting Status, Network WAN/LAN, Wireless Settings/Security, DHCP Settings/Clients List, System Tools Reboot/Password.
  - Realistic disconnected states and simulated WAN uplink internet page.
- **Client Mobile Device Handset (`dist/mobile.js`)**:
  - Interactive smartphone device frame with Wi-Fi Settings, mobile web browser accessing `192.168.1.1`, and diagnostic Ping Test utility.
- **Windows Server 2012 R2 Enhancements (`dist/os.js`)**:
  - Windows Firewall with Advanced Security (`firewall.cpl`).
  - Task Manager (`taskmgr`) with Processes, Performance, and Services tabs.
  - Services management console (`services.msc`).
  - Remote Desktop Connection dialog and authenticated session view (`mstsc`).
  - ADUC Group creation wizard and member assignment.
  - System Properties Remote tab with Network Level Authentication (NLA).
  - Extended simulated PowerShell commands: `ipconfig /all`, `nslookup`, `ping`, `Get-NetIPConfiguration`, `Get-DhcpServerv4Lease`, `Get-Service`, `Get-Process`, `Get-ADGroup`, `mstsc`, `taskmgr`, `services.msc`, `firewall.cpl`.
- **Saved State Schema Migration (v1 → v2)**:
  - Automatic, non-destructive migration of existing `localStorage['serverlab-save']` records to schema version 2 with default network entities and verified check trackers.

### Changed

- Updated Field Guide with comprehensive walkthrough instructions for Labs 01, 02, and 03.
- Hardware equipment rack expanded to show Ventoy USB, Ethernet cable, TP-Link Router, Mobile Client Handset, and Power controls.

## [1.0.1] - 2026-09-23

### Fixed

- Configured Vercel to serve the browser game as static files so the production homepage loads correctly.

## [1.0.0] - 2026-09-23

### Added

- Interactive hardware controls for the Ventoy USB drive, Ethernet cable, and server power.
- BIOS, Ventoy, and Windows Server 2012 R2 installation simulation.
- Server Manager, AD DS forest promotion, organizational unit, user, and shared-folder workflows.
- Mission tracking, field guide, local progress saving, simulated desktop apps, and PowerShell commands.
- Responsive workspace header and a simple About page with developer credit.
- Static-site configuration for Vercel deployment.
