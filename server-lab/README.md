# Serverlab

Serverlab combines operating systems and data communications in a browser-based network sandbox. Build the physical connections, configure each computer through its console, and see how the network affects the operating system.

**Version:** `2.0.0` · **Developer:** [Jenree Dandan](https://reejn.dev)

## What you can do

The equipment palette contains Windows PCs, Windows Server computers, eight-port switches, routers, and firewalls. Add devices, move them around the canvas, connect available Ethernet ports, and power equipment on or off. Invalid connections, duplicate links, and occupied ports are rejected by the simulation. Each server's Config panel has an **Insert bootable device** button: the Ventoy installer is separate from the topology and is consumed after one completed installation.

The guided mission combines seven objectives:

1. Connect the server and workstation through a switch, then insert the server's boot media from Config.
2. Boot the server through BIOS and Ventoy, install Windows Server 2012 R2 with a GUI, and configure Administrator.
3. Configure reachable IPv4 addresses and point the workstation's DNS to the server.
4. Add AD DS, promote a new forest, and restart the domain controller.
5. Create an organizational unit and a user with the assignment's password options.
6. Create a shared folder, grant Full Control, and inspect its Security tab.
7. Join the preinstalled Windows PC to the domain.

The server console retains the detailed 16-step Windows Server mission, including draggable application windows, context menus, Server Manager, AD Users and Computers, File Explorer, network settings, and a simulated PowerShell command set. Mission help is available inside the client. Every PC already has Windows installed, with a simulated browser, Command Prompt, Control Panel, File Explorer and mission view.

The browser opens reachable routers by their IP address. The TP-Link-style router panel also opens directly from a router's configuration and exposes Status, Internet, Wireless, LAN and System settings. LAN addressing and DNS affect the network engine; saved wireless settings are configuration practice and do not establish radio links.

PC File Explorer supports creating, editing, deleting and sharing text files. Other reachable PCs can discover and open those files, and edit shared files when Full Control is enabled. File content persists with the lab; network or power changes immediately affect remote access. Domain membership is not required for these peer-to-peer shares.

Free sandbox mode keeps the same equipment and configuration tools while making the guided objectives optional. XP, levels, and badges are calculated from the lab's current objective completion; they are not a separate account or permanent reward inventory.

## Run and build

Requirements: **Node.js 22** and npm. From this directory:

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:4174](http://127.0.0.1:4174). The development server uses a fixed port so an occupied port is reported explicitly.

```bash
npm run check    # TypeScript and preserved client JavaScript checks
npm test         # Typed simulation tests plus legacy and iframe bridge tests
npm run build    # Type-check and create the static production build
npm run preview  # Serve the production build at http://127.0.0.1:4173
```

`dist/` is generated output. Edit `src/` or `public/`, then rebuild. The retained `server.mjs` is not the V2 development entry point.

## Controls

- Click an equipment card to add a device, or drag it onto the canvas to choose its position.
- Select a device to inspect its network settings, cables, and power state. Double-click a computer to open its console.
- Use the device selector in Config when the topology is small or crowded. On phones, computer consoles open maximized. The server's **Readable / Fit display** toggle switches between a pannable desktop and an overview.
- Use **Connect cable** to choose endpoints, or drag between compatible port handles on the canvas.
- In the server console, power on and use **F2** or **Delete** for BIOS, **F12** for the boot menu, and **F10** to save BIOS settings. These shortcuts apply while the console is focused and the relevant boot screen is active.
- Open **Simulation** to send a ping and highlight the returned topology path. The server PowerShell and workstation terminal use the same network checks.
- Use **Settings** to reduce motion, export or import the lab, or reset it.

## Architecture

| Area | Implementation |
| --- | --- |
| Main interface | React + TypeScript, built with Vite |
| Topology editor | React Flow (`@xyflow/react`) |
| Application store | Zustand |
| Lab persistence | Dexie / IndexedDB, with a localStorage fallback |
| Simulation rules | DOM-independent TypeScript commands and reducers |
| Windows Server client | Preserved JavaScript simulator in a same-origin iframe |
| Validation | Vitest for the typed core; Node tests for the original mission and client bridge |

The core owns device records, links, port allocation, network validation, objective evaluation, and simulated reachability. UI actions dispatch commands; the resulting lab state drives the canvas, inspector, missions, and consoles.

Each server stores its own complete operating system state. The iframe exchanges initialization, hardware updates, OS state, and ping requests with the parent. Both sides validate the message origin and window source. Ethernet follows the topology, while USB availability follows the server's one-use media state in Config.

Topology and console code load separately. IndexedDB writes are debounced and serialized. The retained Windows Server UI still renders its own simulated screen in JavaScript; this release does not claim that every legacy screen has been rewritten as a React component or benchmarked at a particular frame rate.

```text
server-lab/
  src/
    App.tsx          Game shell, missions, equipment, inspector, settings
    Topology.tsx     Device canvas and cable interactions
    Console.tsx      Server iframe bridge and computer window
    Workstation.tsx  Preinstalled Windows PC applications and file sharing
    RouterPanel.tsx  TP-Link-style router configuration
    store.ts         Application state and local persistence
    core/index.ts    Commands, validation, networking, save migration
  public/
    client/          Preserved Windows Server simulation and bridge
    assets/          Hardware artwork
  tests/             Core, mission, and bridge tests
  dist/              Generated production files
  vite.config.ts     Development, build, and test configuration
  vercel.json        Static deployment configuration
  CHANGELOG.md       Release history
  VERSION            Release number
```

## Networking model

Ping is calculated from the lab graph. It checks device power, Ethernet paths, usable IPv4 addresses, contiguous subnet masks, address conflicts, and the relevant gateways. Same-subnet traffic passes through switches; traffic between subnets requires a compatible router path and gateway configuration in both directions. Hostname and domain lookup require a reachable, configured domain controller with DNS.

Joining a domain requires a powered PC, a promoted and restarted domain controller, client DNS pointing to that server, and successful simulated reachability. Disconnecting cables or powering off intermediate equipment changes the result. Shared text files use the same reachability checks and enforce sharing/Full Control state for remote writes.

## Saves and privacy

The lab is saved in this browser using IndexedDB. A localStorage backup supports fallback and tab-close recovery. Existing V1 progress from `serverlab-save` is migrated into the first server when no V2 lab exists; the old save is retained. Browser storage is tied to the site's origin, so a local development save does not automatically move to the deployed site.

Use **Settings → Export lab** for a JSON backup, and **Import lab** to restore it in another browser or on another device. Imported data is validated before use. Exported files include device configuration, simulated file content, router wireless credentials, domain and user names, folders, and progress. Use fictional practice data and passwords. Password values entered in the server's setup and directory workflows are validated and discarded; simulated router credentials persist as part of its configuration.

No account, cloud save service, multiplayer backend, or real network access is required by the simulator.

## Current limits

- This is an educational state simulation, not a virtual machine, licensed Windows distribution, or 1:1 Windows Server implementation. No real OS binaries or system commands run.
- Windows Server uses the detailed original installation and administration workflows. PCs are preinstalled, and their desktop applications and domain join are intentionally simplified.
- Network calculations model logical reachability. There is no packet capture, wire-level protocol implementation, dynamic routing protocol, VLAN configuration, NAT, DHCP service simulation, or real internet traffic.
- Routers use the lab's simplified address and gateway model. The TP-Link-style interface is a learning simulation, not device firmware. Wireless configuration is saved without simulating radio links. Firewall devices currently forward lab traffic; configurable firewall policies and access-control lists are not implemented.
- File sharing operates on simulated text files (up to 64 KiB each, 250 per computer), with live discovery and remote editing. It does not expose the host filesystem or implement SMB authentication, full NTFS permissions, or arbitrary binary files. Server training folders remain separate records for the AD DS lesson.
- The classroom assignment intentionally uses an unprotected OU, a non-expiring user password, and Full Control share permissions. The supplied folder workflow ends at the Security tab; Group Policy folder redirection is not implemented.
- Guided objectives track the starter server and workstation. Additional computers are available for experimentation but do not combine unrelated partial progress into a mission completion.

## Deployment and CI

For Vercel, select `server-lab` as the project root, install with `npm ci`, build with `npm run build`, and publish `dist`. The output is a static site; no backend environment variables or server functions are required. Keep `/client/` and `/assets/` in the deployed build because the game loads them at runtime.

The GitHub Actions workflow in [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) uses Node.js 22 and runs installation, checks, tests, and a production build from `server-lab`. A passing workflow validates the build and automated tests; it does not itself publish a Vercel deployment.

## Versioning

Releases follow [Semantic Versioning](https://semver.org/). Major releases may change the lab model or save schema, minor releases add compatible lessons and features, and patch releases fix compatible behavior or visual issues.

Keep `package.json`, the lockfile's project version, `VERSION`, the displayed About/footer version, and the changelog consistent. Release tags use the `vMAJOR.MINOR.PATCH` format. V2 introduces save schema 2 and includes migration for supported V1 progress.

## Credits and references

Developed by **[Jenree Dandan](https://reejn.dev)**. Hardware illustrations in `public/assets/` were AI-generated for Serverlab. They are visual game assets, not photographs of specific hardware products.

- [Microsoft: Install a new Active Directory forest](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-)
- [Microsoft: Directory Services changes in Windows Server 2012 R2](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/directory-services-component-updates)
- [Ventoy getting started](https://ventoy.net/en/doc_start.html)

Microsoft Windows and Windows Server are trademarks of Microsoft Corporation. TP-Link is a trademark of its owner. Serverlab is independent and is not affiliated with Microsoft, Ventoy, or TP-Link.
