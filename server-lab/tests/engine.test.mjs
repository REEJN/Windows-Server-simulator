import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,checks,progress,validDomain,validPassword,validIP,cleanState,SAVE_SCHEMA_VERSION} from '../dist/engine.js';

test('a blank workstation has sixteen incomplete mission tasks',()=>{
 const state=initialState();assert.deepEqual(progress(state),{done:0,total:16,percent:0,phase:0});
 assert.equal(Object.values(checks(state)).some(Boolean),false);
});
test('mission requires the specified OU and user options together',()=>{
 const s=initialState();s.ous=[{id:'a',protected:true},{id:'b',protected:false}];
 s.users=[{ou:'a',mustChange:false,neverExpires:true}];assert.equal(checks(s).password,false);
 s.users.push({ou:'b',mustChange:true,neverExpires:false});assert.equal(checks(s).user,true);assert.equal(checks(s).password,false);
 s.users[1]={ou:'b',mustChange:false,neverExpires:true};assert.equal(checks(s).password,true);
 s.ous=s.ous.filter(o=>o.id!=='b');assert.equal(checks(s).user,false);
});
test('Security must be visited on the folder with sharing and Full Control',()=>{
 const s=initialState();s.folders=[{shared:true,fullControl:true,securityVisited:false},{shared:false,fullControl:false,securityVisited:true}];
 assert.equal(checks(s).full,true);assert.equal(checks(s).security,false);
 s.folders[0].securityVisited=true;assert.equal(checks(s).security,true);
 s.folders[0].shared=false;assert.equal(checks(s).security,false);
});
test('domain and password validation reject common setup mistakes',()=>{
 for(const d of ['css.com','training.example','my-school.local'])assert.equal(validDomain(d),true);
 for(const d of ['css','css..com','-css.com','css-.com','<script>.com','css .com'])assert.equal(validDomain(d),false);
 for(const p of ['Training123!','WindowsLab9'])assert.equal(validPassword(p),true);
 for(const p of ['short1!','alllowercase','123456789','A12345678'])assert.equal(validPassword(p),false);
 assert.equal(validIP('192.168.1.10'),true);assert.equal(validIP('256.10.0.1'),false);assert.equal(validIP('1.2.3'),false);
});
test('recover reloads during install or restart into a usable screen',()=>{
 const s=initialState();s.screen='installing';assert.equal(cleanState(s).screen,'off');
 s.installed=true;assert.equal(cleanState(s).screen,'password');
 s.adminSet=true;s.screen='restarting';assert.equal(cleanState(s).screen,'desktop');
 assert.equal(cleanState({version:-1}).installed,false);
});
test('cleanState migrates schema v1 save data safely to schema v2 with network entities',()=>{
 const legacySave={
  version: 1,
  power: true,
  screen: 'desktop',
  usb: true,
  ethernet: true,
  bootDevice: 'disk',
  biosVisited: true,
  ventoyBooted: true,
  installed: true,
  adminSet: true,
  roles: ['AD DS', 'DNS'],
  domain: 'css.com',
  promoted: true,
  restarted: true,
  functionalLevel: 'Windows Server 2012 R2',
  ous: [{id:'ou-1',name:'Finance',protected:false}],
  users: [{id:'u-1',ou:'ou-1',name:'Alice Admin',logon:'alice',mustChange:false,neverExpires:true}],
  folders: [{id:'f-1',name:'Accounting',shared:true,shareName:'Accounting',fullControl:true,securityVisited:true}],
  securityVisited: true,
  network: {dhcp:false,ip:'192.168.1.10',mask:'255.255.255.0',gateway:'192.168.1.1',dns:'127.0.0.1'},
  computerName: 'WIN-SERVER',
  events: [{message:'Legacy event',time:'12:00:00'}],
  startedAt: 1700000000000
 };
 const migrated = cleanState(legacySave);
 assert.equal(migrated.saveSchemaVersion, SAVE_SCHEMA_VERSION);
 assert.equal(migrated.domain, 'css.com');
 assert.equal(migrated.ous.length, 1);
 assert.equal(migrated.users.length, 1);
 assert.equal(migrated.folders.length, 1);
 assert.equal(migrated.events.length, 1);
 assert.ok(migrated.networkEntities?.router?.lan?.ip === '192.168.1.1');
 assert.ok(migrated.networkEntities?.mobile?.hostname === 'MOBILE-CLIENT');
 const p = progress(migrated);
 assert.equal(p.done, 16);
 assert.equal(p.percent, 100);
});

test('Lab 02 evaluates router and mobile network checklist tasks',()=>{
 const s = initialState();
 s.activeLab = 'lab2';
 const pInitial = progress(s, 'lab2');
 assert.equal(pInitial.done, 5); // Default router config has LAN, WAN, DHCP, WLAN, Security active
 assert.equal(pInitial.total, 10);

 // Connect mobile
 s.networkEntities.mobile.wifi.associatedSsid = 'SERVERLAB-WIFI';
 s.networkEntities.mobile.wifi.ip = '192.168.1.100';
 s.verifiedChecks.mobile_ping_gw = true;
 s.verifiedChecks.mobile_ping_server = true;
 s.verifiedChecks.mobile_browse = true;

 const pComplete = progress(s, 'lab2');
 assert.equal(pComplete.done, 10);
 assert.equal(pComplete.percent, 100);
});

test('Lab 03 evaluates security groups, firewall, and remote desktop checklist tasks',()=>{
 const s = initialState();
 s.activeLab = 'lab3';
 const c1 = checks(s, 'lab3');
 assert.equal(c1.firewall_off, true); // Firewall defaults off per classroom spec
 assert.equal(c1.sec_group, false);

 // Add security group with member
 s.groups = [{ id: 'g1', name: 'IT-Admins', type: 'Security', members: ['Administrator'] }];
 s.network.dhcp = false;
 s.network.ip = '192.168.1.10';
 s.network.dns = '127.0.0.1';
 s.remoteDesktop.enabled = true;
 s.verifiedChecks.rdp_tested = true;
 s.verifiedChecks.monitor_proc = true;
 s.verifiedChecks.monitor_svc = true;

 const pComplete = progress(s, 'lab3');
 assert.equal(pComplete.done, 9);
 assert.equal(pComplete.percent, 100);
});

