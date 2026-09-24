# Serverlab

A browser game that combines **operating systems and data communications** in one network sandbox. Add computers and network equipment, connect their ports, install a server, build an Active Directory domain, and bring a client online.

Developed by **[Jenree Dandan](https://reejn.dev)** · Version **2.0.0**

## Build your lab

- Place Windows PCs, servers, switches, routers, and firewalls on a zoomable topology canvas.
- Connect Ethernet ports, configure IPv4 addresses, and test paths with simulated ping. Insert one-use bootable media from a server's Config panel.
- Enter a server console to use BIOS, Ventoy, Windows Setup, Server Manager, AD DS, users, and folder sharing.
- Open any PC's preinstalled Windows desktop with a browser, Command Prompt, Control Panel, and File Explorer.
- Configure a router through a TP-Link-style panel or its IP in a connected PC's browser.
- Create, edit, share, and access simulated text files across reachable PCs, or join an Active Directory domain.
- Follow missions inside the game, earn objective-based XP, or explore in free sandbox mode.
- Save progress locally and export or import a lab backup.

The interface uses React, TypeScript, Vite, Zustand, React Flow, and Dexie. The existing Windows Server training client is preserved in an isolated iframe, with its hardware and networking connected to the new simulation core.

## Run locally

Use Node.js 22 and npm.

```bash
cd server-lab
npm ci
npm run dev
```

Open [localhost:4174](http://127.0.0.1:4174).

```bash
npm run check
npm test
npm run build
```

## Documentation

- [Project setup, architecture, controls, and limitations](./server-lab/README.md)
- [Release history](./server-lab/CHANGELOG.md)
- [Release version](./server-lab/VERSION)
- [Vercel configuration](./server-lab/vercel.json)

Serverlab is an educational simulation, not a virtual machine or a complete Windows implementation. Routing, PC applications, wireless links, and file sharing are simulated; firewall policy editing, real packets, SMB, and external networking are not implemented. Hardware illustrations are AI-generated assets created for the project.

Microsoft Windows and Windows Server are trademarks of Microsoft Corporation. TP-Link is a trademark of its owner. Serverlab is independent and is not affiliated with Microsoft, Ventoy, or TP-Link.
