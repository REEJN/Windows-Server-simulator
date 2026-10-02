# Serverlab expansion plan

**Plan status:** Draft — waiting for product decisions  
**Plan version:** 0.4.0  
**Product baseline:** 1.0.1  
**Repository:** server-lab/

## Goal

Expand Serverlab from a single simulated Windows Server workstation into a deterministic small network lab while preserving the existing training mission.

The proposed lab will let a learner:

1. Configure the Windows Server computer name, IPv4 settings, firewall, AD DS, DHCP, and DNS.
2. Configure a Wi-Fi router through a simulated web browser at http://192.168.1.1.
3. Configure WAN/uplink, LAN, DHCP, WLAN, and wireless security on the router.
4. Connect a simulated mobile device to the WLAN and use it to reach the router and other simulated services.
5. Verify DHCP leases, DNS resolution, routing/NAT, ping, and browser-based data communication through guided tests.

All networking remains inside the simulation. No real operating-system settings, Wi-Fi radios, router, mobile device, or external network requests will be changed or used.

## What is confirmed vs. what is reference material

### Confirmed by the user

- Add a web browser to the simulator.
- Add a Wi-Fi router with a TP-Link-style administration layout.
- Make router administration accessible through the simulated browser at 192.168.1.1.
- Add a mobile device that can participate in the router configuration and connectivity flow.
- Expand the app's flexibility for future updates.
- Cover the additional Windows Server administration curriculum shown in the second whiteboard attachment.
- Strictly reproduce the selected Windows Server OS UI/UX 1:1; this is a hard acceptance requirement, not an optional visual direction.
- Use proper versioning for the development and releases.
- Resolve the remaining product details through focused questions before implementation.

The Windows Server OS copy is a non-negotiable product requirement. The simulated server must be a faithful 1:1 reproduction of the selected Windows Server release/build, including its desktop shell, Start/taskbar behavior, window chrome, menus, dialogs, typography, spacing, colors, icons, terminology, navigation, keyboard behavior, validation messages, and administrative workflows. It must not become a modern Serverlab redesign or a generic Windows-inspired interface.

The strict 1:1 scope applies to every surface inside the simulated Windows Server environment: the desktop, Server Manager, File Explorer, Network and Sharing Center, adapter properties, Firewall, Active Directory tools, Remote Desktop tools, monitoring tools, PowerShell, and the simulated browser window. The router page itself will follow the selected TP-Link reference, and the mobile device will follow its selected mobile reference, but both must be presented through faithful Windows Server window/application behavior when opened from the server.

The outer Serverlab mission frame remains project chrome unless the user confirms that the entire website—including the mission panel and hardware cards—must also be replaced by the Windows Server shell. Exact pixel and interaction comparison cannot begin until the Windows Server release/build and reference screenshots are confirmed. Recreated local CSS/SVG assets may be used; unlicensed Microsoft or TP-Link source assets will not be copied.

## Strict Windows Server UI/UX acceptance gate

No feature is complete until it passes a reference comparison against the selected Windows Server release/build:

- Match the OS desktop, Start menu, taskbar, system tray, desktop icons, context menus, title bars, window controls, modal dialogs, property sheets, wizards, and focus states.
- Match the information architecture and interaction order of the real administrative workflows, not only the labels or approximate appearance.
- Match native terminology, field labels, button order, keyboard shortcuts, validation behavior, warnings, confirmation prompts, and error recovery.
- Keep the simulated browser, router configuration, Remote Desktop, monitoring, and management tools inside the same Windows Server application/window model.
- Do not introduce rounded modern cards, unrelated color systems, replacement navigation patterns, or custom “dashboard” components into the simulated Windows Server surface.
- Capture before/after screenshots at agreed viewport sizes and record every intentional deviation in the validation report.

### Attached text: classroom reference, not an automatic implementation command

Windows-server-configuration-1.txt describes a Windows Server workflow that should inform the training content:

- Set the computer name.
- Configure IP address, subnet mask, gateway, and DNS.
- Turn Windows Firewall off.
- Install/configure AD DS, DHCP Server, and DNS Server through Server Manager.
- Use 127.0.0.1 as the preferred DNS server in the supplied exercise.

These are source instructions for the simulator's lesson content. They are not treated as permission to alter the host computer or as a final product specification until the questions below are answered. The firewall step will be represented as an explicit, simulated training choice with an explanation of its security implications.

### Attached image: network-lab checklist, not a complete specification

The whiteboard image lists these reference topics:

- 02 — WAN/uplink configuration using mobile data
- 03 — DHCP server configuration
- 04 — Wireless LAN/WLAN setup
- 05 — Security configuration
- 06 — Client connectivity and data communication
- 07 — Verification, testing, and communication

The image establishes useful lesson areas, but it does not specify the topology, IP ranges, credentials, mobile-data behavior, or acceptance criteria. Those choices are deliberately left open below.

### Attached image: broader Windows Server curriculum checklist, not a complete implementation specification

The second whiteboard image expands the requested training coverage. Its legible checklist appears to be:

- 01 — Preparation & Setup
- 02 — Initial OS Configuration
- 03 — User, Group & File Management
- 04 — File Sharing & Protection
- 05 — Remote Desktop Configuration
- 06 — Process & System Monitoring
- 07 — Documentation, Question & Answer
- 08 — Professionalism & Time Management

The wording is handwritten and should be confirmed against the classroom rubric before it becomes exact UI copy. The list is treated as curriculum coverage to build and assess inside the simulator, not as instructions to change the host operating system. “Professionalism & Time Management” may be an instructor-facing assessment criterion rather than a simulated Windows feature; the implementation boundary is an open question.

## Current implementation baseline

The repository currently contains a browser-based Windows Server 2012 R2 training game in server-lab/.

- The public product version is 1.0.1 in package.json, VERSION, the README files, and CHANGELOG.md.
- The simulation is implemented primarily in dist/app.js, dist/engine.js, and dist/os.js.
- The engine currently stores a single workstation/server state and uses engine.js VERSION = 1 for saved-state compatibility.
- The existing mission has 16 tasks covering boot media, Windows installation, AD DS, an OU/user, and a shared folder.
- The existing mission partially covers preparation/setup, initial OS configuration, user/file management, and file sharing/protection, but does not yet provide first-class group management, Remote Desktop, process monitoring, or time/documentation assessment.
- The existing UI already supplies useful Windows-like primitives: draggable windows, title bars, minimize/maximize, context menus, wizards, Server Manager, File Explorer, Network settings, Event Viewer, and simulated PowerShell.
- Progress is stored in browser local storage under serverlab-save.
- The current documentation correctly says that this is a deterministic simulation and not a real operating system or network.

The first implementation task should separate public release versioning from saved-state schema versioning. At present, the engine's VERSION is a save schema number, not the public 1.0.1 release number; keeping those concepts separate will make future updates safer.

## Curriculum coverage map

| Whiteboard area | Planned simulator coverage | Current state |
| --- | --- | --- |
| Preparation & Setup | Hardware checklist, BIOS/boot, prerequisites, lab reset, field guide | Partly covered |
| Initial OS Configuration | Windows installation, computer name, IPv4/DNS, firewall, Server Manager roles | Partly covered; network expansion required |
| User, Group & File Management | AD DS users/OUs, security groups, folders, file operations, permissions | Users/OUs and folders exist; groups are new |
| File Sharing & Protection | Advanced sharing, share permissions, NTFS/Security, firewall/security diagnostics | Sharing and Security tab exist; protection model needs expansion |
| Remote Desktop Configuration | Simulated Remote Desktop role/settings, allowed users, client connection, failure diagnostics | New |
| Process & System Monitoring | Task Manager-like process view, services, Event Viewer, resource/performance signals | Event Viewer exists; process/performance views are new |
| Documentation, Question & Answer | Field guide, task evidence, glossary, review prompts, and optional knowledge checks | Field guide exists; assessment flow is new |
| Professionalism & Time Management | Clear task order, completion history, optional timer and instructor-facing completion evidence | Requires product decision before implementation |

## Proposed product model

### Devices and links

Introduce a small network model instead of embedding every new value directly in the server state:

- Server: existing Windows Server workstation, with Ethernet interface and configurable hostname, IPv4, DNS, firewall, and installed roles.
- Router: simulated Wi-Fi router with WAN, LAN, WLAN, DHCP, DNS-forwarding, NAT, wireless-security, and administrator settings.
- Mobile device: simulated client with Wi-Fi settings, DHCP lease, browser, local network status, and test tools.
- Links: explicit connections and link state, so a disconnected cable, disabled WLAN, invalid password, or stopped DHCP service has observable consequences.
- Services: deterministic DHCP, DNS, router administration HTTP, and selected local test endpoints. These are simulated service responses, never real network traffic.

### Recommended initial topology

Proposed flow:

simulated mobile-data uplink / WAN
  -> Wi-Fi router
  -> LAN: 192.168.1.1/24
  -> Ethernet: Windows Server, proposed 192.168.1.10
  -> WLAN: Mobile device, proposed DHCP client

This topology is a proposal only. It must be confirmed whether the mobile phone is the WAN/uplink source, the WLAN client, or both in the intended exercise.

### Router administration

The browser should treat 192.168.1.1 as a local simulated route. The router UI should expose, at minimum:

- Status / network map
- WAN or uplink setup
- LAN IP and subnet configuration
- DHCP server and lease table
- Wireless SSID and channel/mode settings
- Wireless security and passphrase
- Router firewall/security controls
- System tools such as save/apply, reboot, and reset

The layout should use a period-appropriate TP-Link-inspired information architecture only after the exact reference model is selected. The router should have its own visual identity inside the browser while still respecting the simulator's Windows windowing, dialog, focus, and validation behavior.

### Browser

The browser is a simulated Windows desktop application. The minimum useful slice is:

- Address bar and navigation controls
- Local route resolution for 192.168.1.1
- Router login/session state
- Router configuration pages
- Clear errors for disconnected links, invalid addresses, and unavailable services
- A deterministic page for connectivity/testing results

Tabs, history, bookmarks, downloads, HTTPS, and arbitrary public websites remain optional until confirmed.

### Mobile device

The mobile device should be an explicit client rather than a decorative illustration. The learner should be able to:

- Open network settings.
- Scan/select the router SSID.
- Enter the wireless passphrase.
- Obtain or renew a DHCP lease.
- View IP address, gateway, DNS, and connection state.
- Open the browser and visit 192.168.1.1.
- Run or observe the agreed connectivity/data-communication checks.

The mobile operating-system visual language and device form factor need a decision; “Windows Server UI/UX” applies to the server workstation unless the user says it should also govern the mobile UI.

## Versioning policy

### Public releases

Use Semantic Versioning for the product:

- Major: incompatible saved-progress format, incompatible mission contract, or a fundamental simulator/runtime change requiring a deliberate reset.
- Minor: backward-compatible lessons, devices, services, browser features, and router configuration capabilities.
- Patch: bug fixes, validation corrections, accessibility fixes, documentation corrections, and visual refinements that do not change the training contract.

A sensible staged release train is:

| Release | Scope | Exit condition |
| --- | --- | --- |
| 1.1.0 | Save migration, network model, server network settings, firewall behavior, and AD DS/DHCP/DNS lesson coverage | Existing 1.0.1 progress can be opened or safely migrated; server-side reference workflow passes end-to-end |
| 1.2.0 | Router device, browser shell, 192.168.1.1 administration, WAN/LAN/WLAN/DHCP/security configuration | Router can be configured entirely inside the simulated browser and produces deterministic service state |
| 1.3.0 | Mobile client, WLAN association, DHCP lease, browser access, connectivity/data-communication checks | Mobile device can join the configured WLAN and complete the agreed verification scenario |
| 1.4.0 | Strict Windows Server 1:1 fidelity pass, router fidelity pass, field guide, accessibility, responsive polish, and expanded tests | Pixel/interaction reference comparison, documented deviations, and full regression suite pass |

If the user prefers one bundled release, these milestones can ship together as 1.1.0 only if the saved-state and mission compatibility rules remain backward-compatible. A 2.0.0 should be reserved for a genuinely incompatible contract, not simply because the feature set is large.

### Required release updates

Every release must update the same version in:

- server-lab/package.json
- server-lab/VERSION
- server-lab/README.md
- root README.md
- the About page/version display
- server-lab/CHANGELOG.md
- the Git tag, using the repository's existing vMAJOR.MINOR.PATCH convention if confirmed

Changelog entries should describe learner-visible behavior and include migration notes when saved data is affected.

### Saved-state schema

Create a separate saveSchemaVersion, starting at 1 for the current format and then 2 for the network model. Migrate old saves instead of comparing the save schema to the public release number.

- Preserve the current server mission fields.
- Add defaults for router, mobile, links, services, browser sessions, and new mission tasks.
- Keep cleanState tolerant of missing optional fields.
- Provide a safe migration path from the current serverlab-save format.
- Offer an explicit “start the expanded network lab” or “reset lab” action when a migration cannot be completed.
- Test reload, interrupted setup, reset, old-save migration, and unknown future fields.

## Implementation phases

### Phase 0 — decisions and references

- Select and lock the exact Windows Server release/build; the current simulator is Windows Server 2012 R2, but no “1:1” claim is valid until the target build is confirmed.
- Select a TP-Link model/era or approve a generic TP-Link-inspired layout.
- Confirm the network topology, addressing, credentials, browser scope, mobile OS, and lesson success criteria.
- Capture or provide reference screenshots for every Windows Server surface that must be visually faithful, including desktop, Server Manager, File Explorer, network settings, firewall, AD tools, Remote Desktop, monitoring, PowerShell, and browser chrome.
- Create a UI reference matrix with screenshot, target route, required interactions, and pass/fail notes for each screen.
- Lock the mission vocabulary and the version milestone to implement first.

### Phase 1 — simulation foundation

- Split product metadata from save schema metadata.
- Add a validated network state shape and deterministic service layer.
- Add migration tests for the existing save format.
- Add reusable device, link, interface, DHCP lease, DNS record, and browser-session primitives.
- Keep all transitions observable through the existing mission/event history.

### Phase 2 — Windows Server networking lesson inside the strict OS copy

- Reproduce the selected Windows Server screens for computer name, adapter status, IPv4 properties, DNS, and firewall configuration with the exact reference window/dialog patterns.
- Add Server Manager role installation coverage for AD DS, DHCP, and DNS.
- Extend Active Directory Users and Computers with security-group creation, membership, and validation.
- Expand File Explorer and folder properties to cover file operations, share permissions, NTFS/Security permissions, and protection diagnostics.
- Add a simulated Remote Desktop configuration surface with server enablement, allowed-user policy, credentials, and client connection states.
- Add Task Manager-like process/resource views, Services controls, and Performance Monitor-style signals while preserving the existing Event Viewer.
- Model the difference between a static server address and DHCP assignment.
- Surface safe teaching feedback when the server has an invalid gateway/DNS, an address conflict, a disabled firewall, or a DHCP conflict.
- Extend PowerShell only with deterministic commands that reflect the simulated state, such as ipconfig /all, nslookup, ping, Get-NetIPConfiguration, and Get-DhcpServerv4Lease.

### Phase 3 — browser and router inside the strict Windows Server application model

- Add the browser using the selected Windows Server window chrome, menus, controls, focus rules, and application behavior; do not use a modern custom browser shell.
- Resolve http://192.168.1.1 through the simulated network rather than the host browser.
- Implement router login/session and the agreed configuration pages.
- Make Apply/Save, reboot, reset, and validation behavior affect the shared network model.
- Add router status, lease, WLAN, WAN, and security events to the simulated event history.

### Phase 4 — mobile client and verification

- Add a mobile device to the workspace with the agreed visual reference.
- Implement SSID scan, authentication, association, DHCP, DNS, and browser access.
- Add verification tools for lease acquisition, gateway reachability, DNS resolution, router page access, server reachability, and WAN/uplink behavior.
- Turn the whiteboard items into a guided checklist with explicit pass/fail reasons.

### Phase 5 — strict 1:1 fidelity and usability

- Match the selected Windows Server reference 1:1 for hierarchy, spacing, window chrome, menus, dialogs, typography, icons, terminology, focus behavior, keyboard behavior, validation, and error feedback.
- Run a screen-by-screen visual and interaction comparison for the desktop shell, Server Manager, File Explorer, Network settings, Firewall, AD tools, Remote Desktop, monitoring, PowerShell, and browser chrome.
- Reject any screen that is merely Windows-inspired, modernized, simplified, or structurally different from the approved reference unless the deviation is documented and explicitly approved.
- Keep the existing Serverlab outer shell and mission panel unless the user explicitly wants those replaced.
- Use custom/local assets and document any deliberate deviations from the reference.
- Add documentation and review surfaces for the expanded curriculum, including task explanations, expected answers, and evidence of completed configuration.
- Implement time/professionalism signals only after confirming whether they are learner-facing features, instructor-facing evidence, or external rubric criteria.
- Verify desktop and narrow-screen layouts without allowing the new device panels to create page-level overflow.
- Check keyboard navigation, visible focus, labels, contrast, dialog semantics, and reduced-motion behavior.

### Phase 6 — verification and release

- Run syntax checks and unit tests.
- Add model tests for DHCP, DNS, routing/NAT, WLAN security, firewall behavior, link failures, and state migration.
- Complete fresh-user and migrated-user browser flows.
- Verify no real network requests or host-device changes occur.
- Update README, field guide, validation report, changelog, version files, and release tag.
- Record the tested browser viewport sizes and final mission checklist.

## Multi-agent execution plan

### Purpose and operating rules

The expansion is large enough to divide into specialist workstreams, but the simulator has shared state, shared Windows UI primitives, and a strict 1:1 visual requirement. Multi-agent work must therefore be coordinated through explicit contracts and an integration owner.

The following rules are mandatory:

- One lead agent owns the integration branch, shared contracts, final decisions, and release readiness.
- Specialist agents work in isolated branches or worktrees created from the same approved baseline.
- No specialist edits another specialist's owned files without an explicit handoff.
- No feature agent changes the saved-state schema, global event model, or shared render API privately.
- No feature is complete until it passes both behavioral tests and the strict Windows Server reference comparison.
- The lead agent merges in dependency order and runs the full validation suite after every integration batch.
- Agents must not add real network requests, host OS changes, external device control, or unapproved dependencies.
- If two agents need the same central file, the lead first extracts a stable module boundary or assigns the file to one owner. Agents must not solve conflicts by silently overwriting each other's work.

### Recommended agent roster

#### Agent 0 — Lead architect and integrator

**Mission:** Coordinate the entire expansion and keep the implementation aligned with this plan.

**Owns:**

- Integration branch/worktree and merge order
- Shared architecture decisions and API contracts
- Final changes to app composition and entry points
- Cross-agent conflict resolution
- Release gates and final acceptance report

**Deliverables:**

- Approved implementation brief for each milestone
- Architecture decision record for state, services, and UI boundaries
- Dependency graph and merge queue
- Integration notes after each batch
- Final end-to-end validation result

**Must not:** redesign feature screens unilaterally, bypass the UI reference gate, or merge code that has not passed its agent-level tests.

#### Agent 1 — Windows Server reference and 1:1 UI/UX fidelity

**Mission:** Establish and enforce the exact Windows Server OS visual and interaction target.

**Owns:**

- Reference version/build matrix
- Screenshot and interaction inventory
- Windows desktop shell, Start/taskbar, title bars, dialogs, menus, property sheets, wizards, focus states, and keyboard behavior
- Shared Windows UI tokens and primitives
- Visual comparison report and deviation register

**Deliverables:**

- Reference pack for every required screen
- Screen inventory mapping each screen to a route/action and reference image
- Reusable Windows Server shell components
- Fidelity checklist covering layout, typography, spacing, colors, icons, terminology, controls, validation, and error behavior
- Before/after comparison captures at agreed viewport sizes

**Must not:** modernize, simplify, or replace the Windows Server UI with a new dashboard/card design. If a reference is ambiguous, record the ambiguity and ask the lead rather than inventing a new style.

#### Agent 2 — simulation engine, network model, and state migration

**Mission:** Build the deterministic domain model that all device and service agents use.

**Owns:**

- Product release metadata versus save schema metadata
- State schema and migration from the current save format
- Device, interface, link, address, route, DHCP lease, DNS record, firewall, service, and session entities
- Deterministic DHCP, DNS, routing/NAT, WLAN association, and local HTTP behavior
- Shared selectors, actions, validators, and event types

**Deliverables:**

- Network state contract
- Save schema version 2 and migration tests
- Deterministic service API
- Failure-state model for disconnected links, invalid addresses, DHCP conflicts, DNS failures, blocked ports, and wrong credentials
- Unit tests for every state transition

**Must not:** own final screen layout or introduce feature-specific UI markup into the engine. The engine returns state and results; UI agents render those results.

#### Agent 3 — Windows Server administration and curriculum workflows

**Mission:** Cover the Windows Server lesson areas that run on the simulated server.

**Owns:**

- Computer name and initial OS configuration
- IPv4/DNS/firewall workflows
- Server Manager role installation for AD DS, DHCP, and DNS
- Active Directory users, groups, OUs, and membership
- File and folder management
- File sharing, share permissions, NTFS/Security behavior, and protection diagnostics
- Deterministic PowerShell commands that expose these features

**Deliverables:**

- Windows Server UI flows implemented using Agent 1 primitives
- Curriculum task definitions and completion selectors
- Positive and negative validation cases
- User/group/file/share fixtures for automated tests
- Field-guide content for each workflow

**Must not:** implement router internals, mobile networking, or independent UI chrome.

#### Agent 4 — simulated browser and router administration

**Mission:** Add the browser route to 192.168.1.1 and the selected TP-Link-style router configuration experience.

**Owns:**

- Browser application inside the Windows Server window model
- Address bar, navigation, local route resolution, session/login state, and service errors
- Router status, WAN/uplink, LAN, DHCP, WLAN, security, administration, apply/save, reboot, and reset pages
- Router-specific validation and events

**Deliverables:**

- Browser-to-router route flow
- Router state adapter connected to Agent 2 services
- Configuration page coverage from the approved TP-Link reference
- Router failure scenarios and tests
- Screenshot comparison report for router pages

**Must not:** modify the Windows Server shell or use arbitrary real browser navigation. Router pages must be deterministic and local to the simulation.

#### Agent 5 — mobile device and client connectivity

**Mission:** Add a functional simulated mobile client to the approved topology.

**Owns:**

- Mobile device frame and approved mobile OS interaction model
- Wi-Fi scan, SSID selection, authentication, association, disconnect/reconnect
- DHCP renewal and display of IP, gateway, and DNS
- Mobile browser entry point and local network diagnostics
- Client connectivity and data-communication task completion

**Deliverables:**

- Mobile device state adapter connected to Agent 2
- Correct-password and wrong-password flows
- DHCP lease and link-failure tests
- Mobile-to-router and mobile-to-server verification flow
- Mobile UI reference comparison

**Must not:** implement the router's DHCP or WLAN rules directly; it consumes the network service contract.

#### Agent 6 — Remote Desktop, monitoring, and system administration

**Mission:** Cover the additional Windows Server curriculum items not present in the current mission.

**Owns:**

- Remote Desktop configuration, allowed users, credentials, connection states, and failure diagnostics
- Task Manager-like process/resource view
- Services management
- Performance/resource monitoring signals
- Event Viewer extensions needed for the new workflows
- Monitoring-related PowerShell output

**Deliverables:**

- Remote Desktop configuration and approved client connection scenario
- At least one intentional RDP failure path
- Deterministic process/service/performance fixtures
- Monitoring task selectors and test coverage
- Curriculum documentation for interpreting system state

**Must not:** create a second visual system; all server-side screens must use Agent 1's Windows Server primitives.

#### Agent 7 — curriculum assessment, documentation, and evidence

**Mission:** Turn the two whiteboard checklists and supplied Windows Server instructions into usable learning and assessment flows.

**Owns:**

- Preparation and setup checklist
- Initial OS configuration checklist
- User/group/file and file-sharing/protection learning objectives
- Documentation and question-and-answer flow
- Optional knowledge checks and expected answers
- Completion evidence and instructor-facing report format
- Professionalism and time-management behavior after the lead confirms its scope

**Deliverables:**

- Curriculum-to-feature traceability matrix
- Field guide updates
- Task wording and completion evidence requirements
- Q&A/knowledge-check content
- Decision record stating whether time/professionalism is simulated, reported, or external to the app

**Must not:** turn ambiguous handwritten text into irreversible behavior without confirming the classroom rubric.

#### Agent 8 — tests, browser verification, accessibility, and regression QA

**Mission:** Verify the integrated product rather than only individual functions.

**Owns:**

- Unit and integration tests
- Save migration and reload tests
- Full clean-lab mission flow
- Browser-level interaction verification
- Responsive layout checks
- Accessibility and keyboard checks
- Console/network-request audit
- Final validation report

**Deliverables:**

- Test matrix mapped to acceptance scenarios
- Automated tests for state, services, migrations, and mission completion
- Fresh-user and migrated-user browser runs
- Screenshot set for strict UI comparison
- Defect log with severity, reproduction steps, and owning agent
- Release-candidate validation report

**Must not:** silently change product behavior to make a test pass. Behavioral changes go back to the owning specialist and the lead.

#### Agent 9 — documentation, versioning, and release packaging

**Mission:** Keep every user-facing and release artifact consistent.

**Owns:**

- README files, CHANGELOG.md, VERSION, package.json version, About page version, and release notes
- Migration notes and reset guidance
- Validation and known-limitations documentation
- Git tag and release checklist

**Deliverables:**

- Version-consistency check
- Changelog entry for each milestone
- Updated field guide and setup instructions
- Release notes describing learner-visible changes
- Final repository handoff checklist

**Must not:** bump the public version before the lead approves the corresponding release gate.

### Dependency graph and parallel work

The work should proceed in the following order:

1. Agent 0 confirms scope, exact Windows Server reference, topology, and milestone.
2. Agents 1 and 2 establish the visual reference contract and simulation/state contract in parallel.
3. Agent 8 prepares fixtures and test harnesses against those contracts.
4. Agents 3, 4, 5, 6, and 7 work in parallel after the contracts are frozen:
   - Agent 3 depends on Agents 1 and 2.
   - Agent 4 depends on Agents 1 and 2.
   - Agent 5 depends on Agents 1 and 2 and the router service contract from Agent 4.
   - Agent 6 depends on Agents 1 and 2.
   - Agent 7 can begin content mapping early, but final task selectors depend on Agents 3–6.
5. Agent 0 integrates the feature lanes in this order: engine/migration, Windows Server shell, server administration, browser/router, mobile, Remote Desktop/monitoring, assessment.
6. Agent 8 runs integrated verification after each batch.
7. Agent 9 prepares release artifacts only after Agent 8 signs off and Agent 0 approves the version.

The critical path is:

Exact reference and state contract -> Windows Server shell -> server/network services -> router/browser -> mobile connectivity -> full mission verification -> release.

### Proposed module and file ownership

The current project concentrates behavior in dist/app.js, dist/engine.js, dist/os.js, and dist/styles.css. Before parallel feature work, Agent 0 and Agent 2 should extract stable boundaries while keeping the static deployment model intact.

Proposed ownership after extraction:

| Area | Proposed files | Primary owner | Integration rule |
| --- | --- | --- | --- |
| App composition | dist/app.js | Agent 0 | Specialists expose actions/renderers; only the lead wires them together |
| State and migration | dist/engine.js, dist/network.js | Agent 2 | Contract freeze before feature lanes |
| Windows shell and shared styles | dist/ui/windows-shell.js, dist/ui/windows.css | Agent 1 | All server-side features consume these primitives |
| Server administration | dist/ui/server-admin.js | Agent 3 | No direct edits to router/mobile modules |
| Browser and router | dist/ui/browser.js, dist/ui/router.js | Agent 4 | Browser uses network service API; router pages use approved reference |
| Mobile device | dist/ui/mobile.js, dist/ui/mobile.css | Agent 5 | Consumes device/link/DHCP APIs |
| RDP and monitoring | dist/ui/remote.js, dist/ui/monitoring.js | Agent 6 | Uses Windows shell primitives and engine selectors |
| Curriculum content | dist/content/curriculum.js, field-guide content | Agent 7 | Content keys are stable IDs, not UI text lookups |
| Tests and fixtures | tests/*.test.mjs, tests/fixtures/ | Agent 8 | Feature agents add fixtures through review |
| Release docs | README files, CHANGELOG.md, VERSION, package.json | Agent 9 | Version changes are release-gated |

If the extraction is not approved, Agent 0 must assign exclusive sections of os.js and styles.css before work begins. Two agents must never edit those files concurrently.

### Shared contracts that must be frozen

Before feature agents begin, Agent 0 must publish a short contract containing:

- State shape and saveSchemaVersion behavior
- Migration rules from the existing save format
- Stable device IDs and interface IDs
- Address, subnet, route, DHCP, DNS, firewall, and service result types
- Action names and validation/error result format
- Mission task IDs and completion selectors
- UI render inputs and event dispatch rules
- Event-history message format
- Browser route rules and allowed simulated origins
- Test fixture creation helpers

Any contract change after the freeze requires:

1. A written change note.
2. Impacted-agent acknowledgement.
3. Updated tests and fixtures.
4. A new integration pass by Agent 0 and Agent 8.

### Worktree, branch, and commit protocol

Each specialist should work from an isolated branch or worktree named with the repository's codex prefix and role, for example:

- codex/serverlab-foundation
- codex/serverlab-windows-fidelity
- codex/serverlab-network
- codex/serverlab-router-browser
- codex/serverlab-mobile
- codex/serverlab-rdp-monitoring
- codex/serverlab-qa

Every specialist handoff must include:

- Objective and completed scope
- Branch/worktree and commit identifiers
- Files changed
- Contracts consumed or changed
- Tests run and exact results
- Screenshots or recordings for UI work
- Known limitations and unresolved questions
- Recommended next agent or merge order

Commits should be small, focused, and named by outcome. A specialist must not mix unrelated formatting, dependency upgrades, or broad refactors into a feature handoff.

### Agent handoff template

Use this structure in every handoff:

**Status:** complete, partial, or blocked  
**Scope:** one-sentence description  
**Implementation:** key behavior delivered  
**Files:** exact files changed  
**Contract impact:** none or detailed change  
**Verification:** commands, browser flows, and screenshots  
**Known issues:** reproducible limitations  
**Next action:** merge, review, or follow-up owner

### Integration gates

#### Gate 0 — scope and reference lock

- Exact Windows Server release/build is selected.
- Strict 1:1 reference screenshots and interaction notes exist.
- Router and mobile references are selected.
- Topology, IP plan, DHCP ownership, browser scope, and curriculum rubric are approved.
- Agent roster and file ownership are recorded.

#### Gate 1 — foundation contract

- State schema and migration contract are approved.
- Existing 1.0.1 saves are preserved or safely migrated.
- Deterministic network services have unit tests.
- No feature agent starts against an unstable state shape.

#### Gate 2 — feature lane completion

- Each feature lane passes its own tests.
- Each feature uses shared selectors/actions and Windows UI primitives.
- Each lane includes at least one failure/diagnostic path.
- UI screenshots are compared against the selected reference.

#### Gate 3 — integrated curriculum flow

- Existing 16-task mission still works.
- New server administration, network, router, mobile, Remote Desktop, monitoring, and assessment flows work together.
- DHCP/DNS ownership and firewall behavior are consistent across devices.
- Reload, reset, disconnect, wrong-credential, and migration flows work.

#### Gate 4 — strict visual and interaction review

- Every required Windows Server screen passes the reference matrix.
- No unapproved modern redesign or inconsistent custom UI remains inside the simulated OS.
- Keyboard, focus, dialogs, menus, error messages, and window behavior are verified.
- Intentional deviations are documented and approved.

#### Gate 5 — release candidate

- npm run check passes.
- npm test passes.
- Browser verification passes at agreed desktop and narrow-screen sizes.
- No real network requests or host-device changes occur.
- Version metadata is consistent across all required files.
- CHANGELOG.md, README files, validation report, and migration notes are complete.

### Conflict and failure handling

- A merge conflict in a shared contract file pauses the affected merge; the lead convenes the owning agents and updates the contract before resolving it.
- A visual regression blocks the feature even if automated tests pass.
- A state migration regression blocks all feature merges until fixed or the release is explicitly reclassified as a breaking major release.
- If a specialist is blocked by an unresolved user decision, it should deliver the smallest contract-safe stub, document the decision, and stop at the boundary rather than guessing.
- If an agent changes files outside its ownership, the lead reviews those changes separately and may split or revert them before merge.
- The QA agent owns defect reproduction; the original feature agent owns the fix; the lead owns prioritization and release impact.

### Final multi-agent definition of done

The task is complete only when:

1. Every required whiteboard curriculum area has a mapped feature, task, or documented instructor-facing assessment.
2. The selected Windows Server OS is reproduced 1:1 at the approved scope.
3. Browser, router, mobile, server, Remote Desktop, monitoring, file, security, and assessment flows share one deterministic state model.
4. Existing mission behavior and saved progress remain valid or have an explicitly approved migration/breaking-release path.
5. All specialist handoffs, tests, screenshots, known limitations, and release documentation are archived in the final integration record.

## Acceptance scenarios

The first complete network scenario should be testable from a clean lab:

1. Configure the server hostname and its agreed static IPv4 settings.
2. Configure the router LAN at 192.168.1.1 and enable the agreed DHCP/WLAN settings.
3. Configure wireless security and apply the router changes.
4. Connect the mobile device to the SSID with the correct passphrase.
5. Confirm the mobile device receives an address in the configured pool, the correct gateway, and the correct DNS server.
6. Open the mobile browser and reach 192.168.1.1.
7. Confirm the server and mobile device can perform the agreed local communication tests.
8. Configure the WAN/uplink using the agreed mobile-data behavior and verify the expected simulated result.
9. Demonstrate a failing case — wrong password, DHCP disabled, disconnected link, invalid DNS, or blocked firewall — with an understandable diagnostic.
10. Reload the page and confirm the intended state survives.
11. Complete the approved Preparation & Setup and Initial OS Configuration checklists from a clean lab.
12. Create the required users, groups, folders, shares, and protection settings, then verify the resulting access behavior.
13. Enable the approved Remote Desktop configuration and connect from the approved simulated client, including at least one intentional failure case.
14. Open the approved process, service, event, and performance views and identify the simulated system state.
15. Open the field guide or documentation view and complete the agreed Question & Answer or knowledge-check flow.
16. Record the agreed completion evidence, including elapsed time only if time management is confirmed as an in-app requirement.

## Questions I need answered before implementation

Please answer these in order; the first six determine the architecture.

1. Windows reference: Which exact Windows Server release/build must be copied 1:1? The current simulator is Windows Server 2012 R2. Does the strict copy apply only inside the simulated server OS, or must the outer Serverlab mission frame also become part of the Windows Server shell?
2. Router reference: Which TP-Link model or UI era should be copied? Do you have screenshots, a manual, or a URL? Should it be an exact classroom mock-up or a generic TP-Link-inspired interface?
3. Mobile data: In the whiteboard item “WAN/uplink using mobile data,” is the mobile phone the router's WAN source through tethering/hotspot, is it only the WLAN client, or should the same mobile device play both roles?
4. Topology: Should the first lab contain only one server, one router, and one mobile device, or should it also include a switch, a desktop client, a simulated ISP, or an internet/cloud node?
5. Addresses: Confirm the proposed values: router LAN 192.168.1.1/24, server static 192.168.1.10, and a DHCP pool such as 192.168.1.100–192.168.1.199. What WAN address/range and DNS behavior should be taught?
6. DHCP ownership: Should DHCP initially run on the router, then move to Windows Server, or should both be available as an intentional conflict exercise? Which device should provide DNS to the mobile client?
7. Router pages: Which pages are required for the first release: Status, WAN, LAN, DHCP, Wireless, Wireless Security, Firewall/Security, System Tools, and Administration? What can wait?
8. Router login: Should the router require a simulated admin login? If yes, what default username/password and password-change flow should the exercise use?
9. Wireless settings: What SSID, password, security mode, band, channel, and encryption should the learner configure? Is WPA2-PSK sufficient, or do you need WPA/WPA3 variants?
10. Browser scope: Is the browser only for 192.168.1.1 and local test pages, or should it include tabs, history, bookmarks, downloads, HTTPS, and a simulated public internet?
11. Mobile UI: Should the mobile device resemble Android, iOS, or a neutral training handset? Does it need a touch-first UI, or may it use the same pointer interactions as the simulator?
12. Firewall lesson: Is “turn off Windows Firewall” a required final state, or should the simulator teach safer rule-based access while reproducing the classroom step as an optional legacy path?
13. Mission shape: Should the new network work extend the existing 16-task mission, become a second selectable lab, or be an optional sandbox after the current mission?
14. Verification: Which outcomes count as success: DHCP lease, gateway ping, DNS lookup, router HTTP page, server ping, local HTTP page, WAN access, file sharing, or all of these?
15. Failure depth: Should learners be able to create realistic misconfigurations and diagnose them, or should the first release focus on the happy path with only basic validation?
16. Persistence: Should existing 1.0.1 local saves migrate into the expanded lab automatically? The recommended default is yes, with a separate reset/new-network-lab action.
17. Release shape: Do you want the staged 1.1.0 -> 1.2.0 -> 1.3.0 -> 1.4.0 plan, or one larger release after all features are complete?
18. Asset/branding permission: May the project use provided screenshots as private visual references only, with recreated CSS/SVG assets, or do you have permission/licensed assets for exact brand reproduction?
19. Audience and grading: Is this for a specific classroom rubric? If so, provide the required steps, exact wording, and grading evidence so the mission checklist matches it.
20. Deployment constraints: Must the result remain a static, dependency-light site deployable to the current Vercel configuration, or may the simulator add a build step/backend-like local service?
21. Remote Desktop: Should it be a simulated server-to-client RDP session, a configuration-only lesson, or both? Which client device may connect, and what credentials/security behavior are required?
22. Users, groups, and files: What exact users, security groups, folder names, and permission outcomes should the exercise require?
23. Monitoring: Which tools must be represented—Task Manager, Services, Event Viewer, Performance Monitor, Resource Monitor, or PowerShell only?
24. Documentation and Q&A: Should the simulator provide an in-app guide, quiz/checkpoint, downloadable evidence report, instructor rubric, or all of these?
25. Professionalism and time: Should the app enforce a timer, show completion time, track retries/order, or leave this entirely to an external instructor rubric?
26. Preparation checklist: Are the existing hardware/BIOS/installation tasks sufficient for item 01, or are there additional preparation steps, safety rules, or required evidence?

### Quick reply template

1. Windows reference:
2. Router model/reference:
3. Mobile-data meaning:
4. Devices/topology:
5. IP/DHCP/DNS values:
6. DHCP owner:
7. Required router pages:
8. Router login:
9. Wi-Fi settings:
10. Browser scope:
11. Mobile UI:
12. Firewall behavior:
13. Mission shape:
14. Verification checks:
15. Failure depth:
16. Save migration:
17. Release shape:
18. Asset/branding permission:
19. Classroom rubric:
20. Deployment constraints:
21. Remote Desktop:
22. Users/groups/files:
23. Monitoring tools:
24. Documentation/Q&A:
25. Professionalism/time:
26. Preparation checklist:
