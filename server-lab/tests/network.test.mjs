import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialNetworkState,
  ipToNumber,
  numberToIp,
  isIpInSubnet,
  requestDhcpLease,
  releaseDhcpLease,
  connectMobileWifi,
  disconnectMobileWifi,
  resolveDns,
  simulatePing
} from '../dist/network.js';
import { initialState } from '../dist/engine.js';

test('IP conversions and subnet calculations are accurate', () => {
  assert.equal(ipToNumber('192.168.1.1'), 3232235777);
  assert.equal(numberToIp(3232235777), '192.168.1.1');
  assert.equal(ipToNumber('256.0.0.1'), null);
  assert.equal(ipToNumber('bad.ip'), null);

  assert.equal(isIpInSubnet('192.168.1.50', '192.168.1.1', '255.255.255.0'), true);
  assert.equal(isIpInSubnet('192.168.2.50', '192.168.1.1', '255.255.255.0'), false);
  assert.equal(isIpInSubnet('10.0.0.15', '10.0.0.1', '255.0.0.0'), true);
});

test('DHCP server allocates, renews, and releases leases deterministically', () => {
  const net = createInitialNetworkState();
  const router = net.router;

  // First allocation
  const res1 = requestDhcpLease(router, '00:11:22:33:44:55', 'Client-1');
  assert.equal(res1.success, true);
  assert.equal(res1.lease.ip, '192.168.1.100');
  assert.equal(res1.lease.gateway, '192.168.1.1');
  assert.equal(res1.lease.dns, '192.168.1.1');

  // Second allocation from different MAC
  const res2 = requestDhcpLease(router, '00:11:22:33:44:66', 'Client-2');
  assert.equal(res2.success, true);
  assert.equal(res2.lease.ip, '192.168.1.101');

  // Renewal from same MAC returns same IP
  const resRenew = requestDhcpLease(router, '00:11:22:33:44:55', 'Client-1');
  assert.equal(resRenew.success, true);
  assert.equal(resRenew.lease.ip, '192.168.1.100');

  // Release lease
  const released = releaseDhcpLease(router, '00:11:22:33:44:55');
  assert.equal(released, true);
  assert.equal(router.dhcp.leases.length, 1);

  // When DHCP is disabled
  router.dhcp.enabled = false;
  const resDisabled = requestDhcpLease(router, '00:11:22:33:44:77', 'Client-3');
  assert.equal(resDisabled.success, false);
  assert.ok(resDisabled.reason.includes('disabled'));
});

test('Mobile client associates to router Wi-Fi with valid credentials', () => {
  const net = createInitialNetworkState();
  const mobile = net.mobile;
  const router = net.router;

  // Wrong password
  const failPass = connectMobileWifi(mobile, router, 'SERVERLAB-WIFI', 'WrongPassword');
  assert.equal(failPass.success, false);
  assert.equal(mobile.wifi.associatedSsid, null);

  // Unknown SSID
  const failSsid = connectMobileWifi(mobile, router, 'UNKNOWN-SSID', 'Password123!');
  assert.equal(failSsid.success, false);

  // Correct credentials
  const success = connectMobileWifi(mobile, router, 'SERVERLAB-WIFI', 'Password123!');
  assert.equal(success.success, true);
  assert.equal(mobile.wifi.associatedSsid, 'SERVERLAB-WIFI');
  assert.equal(mobile.wifi.ip, '192.168.1.100');
  assert.equal(mobile.wifi.gateway, '192.168.1.1');

  // Disconnect
  disconnectMobileWifi(mobile, router);
  assert.equal(mobile.wifi.associatedSsid, null);
  assert.equal(mobile.wifi.ip, null);
  assert.equal(router.dhcp.leases.length, 0);
});

test('DNS resolution resolves router, server domain, and internet endpoints', () => {
  const state = initialState();
  state.domain = 'css.com';
  state.computerName = 'WIN-SERVER';

  assert.equal(resolveDns('localhost', state), '127.0.0.1');
  assert.equal(resolveDns('tplinkwifi.net', state), '192.168.1.1');
  assert.equal(resolveDns('router.local', state), '192.168.1.1');
  assert.equal(resolveDns('css.com', state), '192.168.1.10');
  assert.equal(resolveDns('win-server.css.com', state), '192.168.1.10');
  assert.equal(resolveDns('WIN-SERVER', state), '192.168.1.10');
  assert.equal(resolveDns('google.com', state), '142.250.190.46');
  assert.equal(resolveDns('nonexistent.local', state), null);
});

test('Simulated ping verifies reachability and diagnostics on server and mobile', () => {
  const state = initialState();

  // Server ping with media disconnected
  state.ethernet = false;
  const pingDisconnected = simulatePing('server', '192.168.1.1', state);
  assert.equal(pingDisconnected.success, false);
  assert.ok(pingDisconnected.output.includes('Media disconnected'));

  // Server ping with Ethernet connected
  state.ethernet = true;
  const pingRouter = simulatePing('server', '192.168.1.1', state);
  assert.equal(pingRouter.success, true);
  assert.ok(pingRouter.output.includes('bytes=32 time=1ms'));

  // Ping unassigned local subnet IP before mobile associates
  const pingMobileBefore = simulatePing('server', '192.168.1.100', state);
  assert.equal(pingMobileBefore.success, false);
  assert.ok(pingMobileBefore.output.includes('Destination host unreachable'));

  // Connect mobile client
  connectMobileWifi(state.networkEntities.mobile, state.networkEntities.router, 'SERVERLAB-WIFI', 'Password123!');
  const pingMobileAfter = simulatePing('server', '192.168.1.100', state);
  assert.equal(pingMobileAfter.success, true);
  assert.ok(pingMobileAfter.output.includes('bytes=32'));

  // Mobile ping to server
  const mobilePingServer = simulatePing('mobile', '192.168.1.10', state);
  assert.equal(mobilePingServer.success, true);
  assert.ok(mobilePingServer.output.includes('64 bytes from 192.168.1.10'));
});
