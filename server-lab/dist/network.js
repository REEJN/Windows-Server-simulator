// Serverlab Deterministic Network Simulation Model
// Pure simulation of Router, DHCP, DNS, Wi-Fi, and Link states

export const DEFAULT_ROUTER_CONFIG = {
  lan: {
    ip: '192.168.1.1',
    mask: '255.255.255.0'
  },
  wan: {
    type: 'mobile-data',
    connected: true,
    ip: '10.120.45.67',
    mask: '255.255.255.0',
    gateway: '10.120.45.1',
    dns: '8.8.8.8'
  },
  wlan: {
    enabled: true,
    ssid: 'SERVERLAB-WIFI',
    security: 'WPA2-PSK',
    passphrase: 'Password123!',
    channel: 6,
    broadcast: true
  },
  dhcp: {
    enabled: true,
    start: '192.168.1.100',
    end: '192.168.1.199',
    leaseTimeMinutes: 120,
    gateway: '192.168.1.1',
    dns: '192.168.1.1',
    leases: [] // Array of { ip, mac, hostname, expiresAt }
  },
  admin: {
    user: 'admin',
    password: 'admin',
    loggedIn: false
  },
  status: {
    uptimeSeconds: 3600
  }
};

export const DEFAULT_MOBILE_CONFIG = {
  mac: '02:00:5E:7D:9A:01',
  hostname: 'MOBILE-CLIENT',
  wifi: {
    enabled: true,
    associatedSsid: null,
    ip: null,
    mask: null,
    gateway: null,
    dns: null,
    leaseExpiresAt: null
  }
};

export const DEFAULT_FIREWALL_CONFIG = {
  domainProfile: false,
  privateProfile: false,
  publicProfile: false
};

export function createInitialNetworkState() {
  return {
    router: structuredClone(DEFAULT_ROUTER_CONFIG),
    mobile: structuredClone(DEFAULT_MOBILE_CONFIG),
    firewall: structuredClone(DEFAULT_FIREWALL_CONFIG)
  };
}

export function ipToNumber(ip) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return null;
  const parts = ip.split('.').map(Number);
  if (parts.some(n => n < 0 || n > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function numberToIp(num) {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

export function isIpInSubnet(ip, networkIp, mask) {
  const ipNum = ipToNumber(ip);
  const netNum = ipToNumber(networkIp);
  const maskNum = ipToNumber(mask);
  if (ipNum === null || netNum === null || maskNum === null) return false;
  return (ipNum & maskNum) === (netNum & maskNum);
}

/**
 * Deterministically allocate or renew a DHCP lease from router pool
 */
export function requestDhcpLease(router, clientMac, clientHostname) {
  if (!router?.dhcp?.enabled) {
    return { success: false, reason: 'DHCP server is disabled on the router' };
  }

  const startNum = ipToNumber(router.dhcp.start);
  const endNum = ipToNumber(router.dhcp.end);
  if (startNum === null || endNum === null || startNum > endNum) {
    return { success: false, reason: 'Invalid DHCP pool address range' };
  }

  const leases = router.dhcp.leases || [];
  const existing = leases.find(l => l.mac === clientMac);
  const now = Date.now();
  const leaseDurationMs = (router.dhcp.leaseTimeMinutes || 120) * 60 * 1000;

  if (existing) {
    existing.expiresAt = now + leaseDurationMs;
    existing.hostname = clientHostname || existing.hostname;
    return {
      success: true,
      lease: {
        ip: existing.ip,
        mask: router.lan.mask,
        gateway: router.dhcp.gateway || router.lan.ip,
        dns: router.dhcp.dns || router.lan.ip,
        expiresAt: existing.expiresAt
      }
    };
  }

  const usedIps = new Set(leases.map(l => l.ip));
  usedIps.add(router.lan.ip);

  let allocatedIp = null;
  for (let n = startNum; n <= endNum; n++) {
    const candidate = numberToIp(n);
    if (!usedIps.has(candidate)) {
      allocatedIp = candidate;
      break;
    }
  }

  if (!allocatedIp) {
    return { success: false, reason: 'DHCP pool exhausted' };
  }

  const newLease = {
    ip: allocatedIp,
    mac: clientMac,
    hostname: clientHostname || 'Unknown-Device',
    expiresAt: now + leaseDurationMs
  };
  router.dhcp.leases = [...leases, newLease];

  return {
    success: true,
    lease: {
      ip: newLease.ip,
      mask: router.lan.mask,
      gateway: router.dhcp.gateway || router.lan.ip,
      dns: router.dhcp.dns || router.lan.ip,
      expiresAt: newLease.expiresAt
    }
  };
}

/**
 * Release an active DHCP lease
 */
export function releaseDhcpLease(router, clientMac) {
  if (!router?.dhcp?.leases) return false;
  const initialCount = router.dhcp.leases.length;
  router.dhcp.leases = router.dhcp.leases.filter(l => l.mac !== clientMac);
  return router.dhcp.leases.length < initialCount;
}

/**
 * Associate mobile device to router WLAN
 */
export function connectMobileWifi(mobile, router, targetSsidOrPass, passphrase) {
  let targetSsid, pass;
  if (passphrase === undefined) {
    if (targetSsidOrPass === undefined) {
      targetSsid = router?.wlan?.ssid || 'SERVERLAB-WIFI';
      pass = router?.wlan?.passphrase;
    } else {
      targetSsid = router?.wlan?.ssid || 'SERVERLAB-WIFI';
      pass = targetSsidOrPass;
    }
  } else {
    targetSsid = targetSsidOrPass;
    pass = passphrase;
  }

  if (!mobile?.wifi?.enabled) {
    return { success: false, error: 'Mobile Wi-Fi radio is switched off' };
  }
  if (!router?.wlan?.enabled) {
    return { success: false, error: 'Router Wi-Fi broadcast is disabled' };
  }
  if (targetSsid !== router.wlan.ssid) {
    return { success: false, error: `SSID "${targetSsid}" not found` };
  }
  if (router.wlan.security === 'WPA2-PSK' && pass !== router.wlan.passphrase) {
    return { success: false, error: 'Incorrect Wi-Fi security passphrase' };
  }

  const leaseResult = requestDhcpLease(router, mobile.mac, mobile.hostname);
  if (!leaseResult.success) {
    mobile.wifi.associatedSsid = targetSsid;
    mobile.wifi.ip = null;
    return { success: false, error: `Connected to SSID, but failed to obtain IP: ${leaseResult.reason}` };
  }

  mobile.wifi.connected = true;
  mobile.wifi.associatedSsid = targetSsid;
  mobile.wifi.ip = leaseResult.lease.ip;
  mobile.wifi.mask = leaseResult.lease.mask;
  mobile.wifi.gateway = leaseResult.lease.gateway;
  mobile.wifi.dns = leaseResult.lease.dns;
  mobile.wifi.leaseExpiresAt = leaseResult.lease.expiresAt;

  return { success: true, ip: mobile.wifi.ip };
}

/**
 * Disconnect mobile device from WLAN
 */
export function disconnectMobileWifi(mobile, router) {
  if (!mobile?.wifi) return;
  if (router && mobile.mac) {
    releaseDhcpLease(router, mobile.mac);
  }
  mobile.wifi.connected = false;
  mobile.wifi.associatedSsid = null;
  mobile.wifi.ip = null;
  mobile.wifi.mask = null;
  mobile.wifi.gateway = null;
  mobile.wifi.dns = null;
  mobile.wifi.leaseExpiresAt = null;
}

/**
 * Resolves a hostname deterministically using simulated DNS
 */
export function resolveDns(hostname, state) {
  if (!hostname) return null;
  const lower = hostname.toLowerCase().trim();

  // Local loopbacks
  if (lower === 'localhost' || lower === '127.0.0.1') return '127.0.0.1';

  // Router management domain or IP
  if (lower === 'tplinkwifi.net' || lower === 'router.local') {
    return state.networkEntities?.router?.lan?.ip || '192.168.1.1';
  }

  // Windows Server domain name
  if (state.domain && (lower === state.domain.toLowerCase() || lower.endsWith('.' + state.domain.toLowerCase()))) {
    return state.network?.ip || '192.168.1.10';
  }

  // Windows Server computer name
  if (state.computerName && lower === state.computerName.toLowerCase()) {
    return state.network?.ip || '192.168.1.10';
  }

  // Public internet simulation if WAN uplink is active
  if (state.networkEntities?.router?.wan?.connected) {
    if (lower === 'google.com' || lower === 'www.google.com') return '142.250.190.46';
    if (lower === 'microsoft.com' || lower === 'www.microsoft.com') return '20.112.52.29';
  }

  return null;
}

/**
 * Simulate ping execution with realistic Windows / mobile network diagnostics
 */
export function simulatePing(fromDevice, targetHost, state) {
  if (fromDevice === 'server') {
    if (!state.ethernet) {
      return {
        success: false,
        output: 'PING: transmit failed. General failure.\n(Media disconnected: Ethernet cable is unplugged)'
      };
    }

    const resolvedIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(targetHost)
      ? targetHost
      : resolveDns(targetHost, state);

    if (!resolvedIp) {
      return {
        success: false,
        output: `Ping request could not find host ${targetHost}. Please check the name and try again.`
      };
    }

    const serverIp = state.network?.ip || '192.168.1.10';
    const serverMask = state.network?.mask || '255.255.255.0';
    const routerIp = state.networkEntities?.router?.lan?.ip || '192.168.1.1';

    // Loopback
    if (resolvedIp === '127.0.0.1' || resolvedIp === serverIp) {
      return {
        success: true,
        output: `Pinging ${targetHost} [${resolvedIp}] with 32 bytes of data:\nReply from ${resolvedIp}: bytes=32 time<1ms TTL=128\nReply from ${resolvedIp}: bytes=32 time<1ms TTL=128\nPackets: Sent = 2, Received = 2, Lost = 0 (0% loss)`
      };
    }

    // Direct LAN neighbor (e.g. Router)
    if (resolvedIp === routerIp && isIpInSubnet(resolvedIp, serverIp, serverMask)) {
      return {
        success: true,
        output: `Pinging ${targetHost} [${resolvedIp}] with 32 bytes of data:\nReply from ${resolvedIp}: bytes=32 time=1ms TTL=64\nReply from ${resolvedIp}: bytes=32 time=1ms TTL=64\nPackets: Sent = 2, Received = 2, Lost = 0 (0% loss)`
      };
    }

    // Mobile device over WLAN
    const mobileIp = state.networkEntities?.mobile?.wifi?.ip;
    if (mobileIp && resolvedIp === mobileIp) {
      return {
        success: true,
        output: `Pinging ${targetHost} [${resolvedIp}] with 32 bytes of data:\nReply from ${resolvedIp}: bytes=32 time=3ms TTL=64\nReply from ${resolvedIp}: bytes=32 time=2ms TTL=64\nPackets: Sent = 2, Received = 2, Lost = 0 (0% loss)`
      };
    }

    // If destination is in local subnet but no host responded
    if (isIpInSubnet(resolvedIp, serverIp, serverMask)) {
      return {
        success: false,
        output: `Pinging ${targetHost} [${resolvedIp}] with 32 bytes of data:\nDestination host unreachable.\nDestination host unreachable.\nPackets: Sent = 2, Received = 0, Lost = 2 (100% loss)`
      };
    }

    // Outside subnet requires valid gateway
    const gateway = state.network?.gateway;
    if (gateway === routerIp && state.networkEntities?.router?.wan?.connected) {
      return {
        success: true,
        output: `Pinging ${targetHost} [${resolvedIp}] with 32 bytes of data:\nReply from ${resolvedIp}: bytes=32 time=28ms TTL=115\nReply from ${resolvedIp}: bytes=32 time=27ms TTL=115\nPackets: Sent = 2, Received = 2, Lost = 0 (0% loss)`
      };
    }

    return {
      success: false,
      output: `Pinging ${targetHost} [${resolvedIp}] with 32 bytes of data:\nRequest timed out.\nRequest timed out.\nPackets: Sent = 2, Received = 0, Lost = 2 (100% loss)`
    };
  }

  if (fromDevice === 'mobile') {
    const mobile = state.networkEntities?.mobile;
    if (!mobile?.wifi?.associatedSsid || !mobile?.wifi?.ip) {
      return {
        success: false,
        output: 'connect: Network is unreachable (Wi-Fi not connected)'
      };
    }

    const resolvedIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(targetHost)
      ? targetHost
      : resolveDns(targetHost, state);

    if (!resolvedIp) {
      return {
        success: false,
        output: `ping: unknown host ${targetHost}`
      };
    }

    const routerIp = state.networkEntities?.router?.lan?.ip || '192.168.1.1';
    const serverIp = state.network?.ip || '192.168.1.10';

    if (resolvedIp === routerIp || resolvedIp === mobile.wifi.ip) {
      return {
        success: true,
        output: `PING ${targetHost} (${resolvedIp}) 56(84) bytes of data.\n64 bytes from ${resolvedIp}: icmp_seq=1 ttl=64 time=2.14 ms\n64 bytes from ${resolvedIp}: icmp_seq=2 ttl=64 time=1.89 ms`
      };
    }

    if (resolvedIp === serverIp) {
      if (!state.ethernet) {
        return {
          success: false,
          output: `PING ${targetHost} (${resolvedIp}) 56(84) bytes of data.\nFrom ${routerIp} icmp_seq=1 Destination Host Unreachable`
        };
      }
      return {
        success: true,
        output: `PING ${targetHost} (${resolvedIp}) 56(84) bytes of data.\n64 bytes from ${resolvedIp}: icmp_seq=1 ttl=128 time=3.52 ms\n64 bytes from ${resolvedIp}: icmp_seq=2 ttl=128 time=3.10 ms`
      };
    }

    if (isIpInSubnet(resolvedIp, mobile.wifi.ip, mobile.wifi.mask || '255.255.255.0')) {
      return {
        success: false,
        output: `PING ${targetHost} (${resolvedIp}) 56(84) bytes of data.\nFrom ${mobile.wifi.ip} icmp_seq=1 Destination Host Unreachable`
      };
    }

    return {
      success: false,
      output: `PING ${targetHost} (${resolvedIp}) 56(84) bytes of data.\nRequest timeout for icmp_seq 0\nRequest timeout for icmp_seq 1`
    };
  }

  return { success: false, output: 'Unknown source device.' };
}

/**
 * Router administration helpers
 */
export function loginRouter(router, user, password) {
  if (!router?.admin) return { success: false, error: 'Router admin not configured' };
  if (router.admin.user === user && router.admin.password === password) {
    router.admin.loggedIn = true;
    return { success: true };
  }
  return { success: false, error: 'Invalid username or password' };
}

export function logoutRouter(router) {
  if (router?.admin) router.admin.loggedIn = false;
  return { success: true };
}

export function updateRouterLan(router, ip, mask) {
  if (!router?.lan) return { success: false, error: 'Router LAN not available' };
  if (!ipToNumber(ip) || !ipToNumber(mask)) {
    return { success: false, error: 'Invalid IP address or Subnet Mask' };
  }
  router.lan.ip = ip;
  router.lan.mask = mask;
  if (router.dhcp) {
    router.dhcp.gateway = ip;
    router.dhcp.dns = ip;
  }
  return { success: true };
}

export function updateRouterWan(router, updates) {
  if (!router?.wan) return { success: false, error: 'Router WAN not available' };
  Object.assign(router.wan, updates);
  return { success: true };
}

export function updateRouterWlan(router, updates) {
  if (!router?.wlan) return { success: false, error: 'Router WLAN not available' };
  Object.assign(router.wlan, updates);
  return { success: true };
}

export function updateRouterDhcp(router, updates) {
  if (!router?.dhcp) return { success: false, error: 'Router DHCP not available' };
  Object.assign(router.dhcp, updates);
  return { success: true };
}

export function rebootRouter(router) {
  if (!router?.status) return;
  router.status.uptimeSeconds = 0;
  if (router.admin) router.admin.loggedIn = false;
}

export function resetRouter(router) {
  Object.assign(router, structuredClone(DEFAULT_ROUTER_CONFIG));
}

