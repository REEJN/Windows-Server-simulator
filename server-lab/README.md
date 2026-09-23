# Serverlab

Serverlab is a browser-based Windows Server 2012 R2 training game. Players connect a Ventoy USB drive and Ethernet cable, enter the BIOS, install the operating system, and configure a working Active Directory lab.

**Current release:** `v1.0.0`

## Mission

The guided mission covers:

- Connecting simulated USB, Ethernet, and power hardware
- Selecting Ventoy as the BIOS boot device
- Installing Windows Server 2012 R2 Standard with a GUI
- Installing AD DS and promoting a new forest
- Creating an organizational unit and user account
- Creating a folder, enabling sharing, granting share permissions, and opening the Security tab

Players can also explore Server Manager, File Explorer, network settings, event history, draggable windows, context menus, and a small simulated PowerShell command set.

## Run locally

Requirements: Node.js 18 or later.

```bash
npm start
```

Open `http://127.0.0.1:4173`.

## Validate

```bash
npm run check
npm test
```

## Project structure

- `dist/` — deployable HTML, CSS, and JavaScript
- `tests/` — simulator and mission-flow tests
- `server.mjs` — local static server
- `vercel.json` — Vercel build and static output configuration
- `CHANGELOG.md` — release history
- `VERSION` — canonical release number

## Versioning

Serverlab follows [Semantic Versioning](https://semver.org/):

- Major versions may change saved progress or core mission behavior.
- Minor versions add compatible lessons or simulator features.
- Patch versions contain compatible fixes and visual refinements.

The version in `package.json`, `VERSION`, the About page, the changelog, and Git tags should match for every release.

## Privacy and scope

Progress is stored in the browser's local storage. Password fields are validated and discarded; use fictional practice passwords.

Serverlab is a deterministic educational simulation. It is not a virtual machine, a licensed Windows distribution, or a 1:1 implementation of Windows Server. No real operating system, directory service, external program, or network command runs inside the lab.

The choices for an unprotected OU, a non-expiring practice password, and Full Control share permissions intentionally follow the supplied classroom assignment. Share and NTFS permissions remain separate, and the assignment ends after opening the Security tab.

## Credits

Developed by **[Jenree Dandan](https://reejn.dev)**.

## References

- [Microsoft: Install a new Active Directory forest](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-)
- [Microsoft: Directory Services changes in Windows Server 2012 R2](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/directory-services-component-updates)
- [Ventoy getting started](https://ventoy.net/en/doc_start.html)

Microsoft Windows and Windows Server are trademarks of Microsoft Corporation. This independent training project is not affiliated with Microsoft or Ventoy.
