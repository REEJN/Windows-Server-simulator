# Validation

Verified on September 23, 2026.

- Nine automated tests pass: initial mission state; OU/user membership and password options; shared-folder/Security requirements; domain/password/IP validation; interrupted-session recovery; BIOS discard/save; clean reinstallation; media removal during setup; Windows path rendering.
- JavaScript syntax checks pass for all three modules.
- Completed the mission through the browser UI from a blank workstation to 16/16 tasks: USB and Ethernet, BIOS, Ventoy, GUI installation, Administrator setup, AD DS installation, new forest promotion, restart, OU creation by context menu, user creation and password flags, desktop folder creation, advanced sharing, Full Control, and Security.
- Invalid edition, mismatched passwords, single-label root domain, and malformed IPv4 address produce validation feedback.
- Mission completion and the configured domain survive a page reload.
- Simulated PowerShell returns the created domain user. Network adapter changes persist in the interface. Maximize and minimize controls work.
- Checked desktop and small-screen layout at 1440px and 390px. Neither produced page-level horizontal overflow. The simulated desktop is best used on a desktop display or in landscape focus mode.
- The read-only mission tool returns current state and rejects unexpected input.
- No browser console errors were reported during the completed mission run.

This verification covers the implemented training workflows; the game does not implement a full Windows operating system.

Private hosting was blocked by automatic approval review pending explicit permission to upload the project source and assets. The local preview remains available while its server process is running.
