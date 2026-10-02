import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, progress, checks} from '../dist/engine.js';
import {createSimulator} from '../dist/os.js';
import {connectMobileWifi, simulatePing, loginRouter} from '../dist/network.js';
import {renderMobileDevice} from '../dist/mobile.js';

function harness(run){
 const previous={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const callbacks=new Map();let nextTimer=0;let state=initialState();
 globalThis.document={addEventListener(){},querySelector(){return null;}};
 globalThis.setTimeout=fn=>{const id=++nextTimer;callbacks.set(id,fn);return id;};
 globalThis.clearTimeout=id=>callbacks.delete(id);
 const sim=createSimulator({get:()=>state,icon:()=>'',esc:String,toast(){},render(){},commit:changes=>Object.assign(state,changes)});
 try{run({state,sim,tick(){while(callbacks.size){const [id,fn]=callbacks.entries().next().value;callbacks.delete(id);fn();}}});}
 finally{Object.assign(globalThis,previous);}
}

test('discarding BIOS boot priority preserves the saved configuration',()=>harness(({state,sim})=>{
 state.usb=true;sim.power();sim.action('bios');
 sim.action('set-boot',{dataset:{device:'usb'}});assert.equal(state.bootDevice,'disk');
 sim.action('bios-discard');assert.equal(state.bootDevice,'disk');
 sim.action('bios');sim.action('set-boot',{dataset:{device:'usb'}});sim.action('bios-save');
 assert.equal(state.bootDevice,'usb');assert.equal(state.screen,'ventoy');assert.equal(state.ventoyBooted,true);
}));

test('a fresh installation removes the previous domain and disk configuration',()=>harness(({state,sim,tick})=>{
 Object.assign(state,{usb:true,ethernet:true,power:true,screen:'setup',biosVisited:true,ventoyBooted:true,installed:true,adminSet:true,domain:'old.com',promoted:true,restarted:true,roles:['AD DS','DNS'],ous:[{id:'old'}],users:[{id:'old'}],folders:[{id:'old'}]});
 sim.action('install');tick();
 assert.equal(state.screen,'password');assert.equal(state.installed,true);assert.equal(state.adminSet,false);
 assert.equal(state.domain,'');assert.equal(state.promoted,false);assert.equal(state.restarted,false);
 for(const key of ['roles','ous','users','folders'])assert.deepEqual(state[key],[]);
 assert.equal(state.usb,true);assert.equal(state.ethernet,true);assert.equal(state.biosVisited,true);
}));

test('removing installation media prevents a completed installation',()=>harness(({state,sim,tick})=>{
 Object.assign(state,{usb:true,power:true,screen:'setup'});sim.action('install');state.usb=false;tick();
 assert.equal(state.installed,false);assert.equal(state.screen,'setup');
}));

test('folder property rendering preserves local and UNC path separators',()=>harness(({state,sim})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true,folders:[{id:'folder',name:'SharedFiles',shared:true,shareName:'SharedFiles'}]});
 sim.action('properties',{dataset:{id:'folder'}});
 assert.ok(sim.screen().includes('C:\\Users\\Administrator\\Desktop'));
 sim.action('property-tab',{dataset:{tab:'Sharing'}});
 assert.ok(sim.screen().includes('\\\\WIN-SERVER\\SharedFiles'));
}));

test('browser displays TP-Link router login and authenticated 3-column interface with help',()=>harness(({state,sim})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true,ethernet:true});
 sim.action('open',{dataset:{app:'browser'}});
 let html = sim.screen();
 assert.ok(html.includes('TP-LINK'));
 assert.ok(html.includes('TL-WR841N'));
 assert.ok(html.includes('Authentication Required'));
 assert.equal(state.verifiedChecks.routerBrowsed, true);

 // Log in with admin / admin
 loginRouter(state.networkEntities.router, 'admin', 'admin');
 assert.equal(state.networkEntities.router.admin.loggedIn, true);

 html = sim.screen();
 assert.ok(html.includes('Status'));
 assert.ok(html.includes('Help'));
 assert.ok(html.includes("page displays the Router's current status"));

 // Switching tabs
 sim.action('router-tab',{dataset:{tab:'wireless'}});
 html = sim.screen();
 assert.ok(html.includes('Wireless Radio'));
 assert.ok(html.includes('SSID'));

 // Disconnect ethernet
 state.ethernet = false;
 assert.ok(sim.screen().includes('This page can’t be displayed'));
}));

test('Control Panel renders categories and layered popout property sheets',()=>harness(({state,sim})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true,ethernet:true});
 sim.action('open',{dataset:{app:'control'}});
 let html = sim.screen();
 assert.ok(html.includes('Control Panel'));
 assert.ok(html.includes('System and Security'));
 assert.ok(html.includes('Network and Internet'));

 // Popout Ethernet Status
 sim.action('show-ethernet-status');
 html = sim.screen();
 assert.ok(html.includes('Ethernet Status'));
 assert.ok(html.includes('1.0 Gbps'));

 // Layered transition to Ethernet Properties
 sim.action('show-ethernet-props');
 html = sim.screen();
 assert.ok(html.includes('Ethernet Properties'));
 assert.ok(html.includes('Internet Protocol Version 4 (TCP/IPv4)'));

 // Layered transition to TCP/IPv4 Properties
 sim.action('show-ipv4');
 html = sim.screen();
 assert.ok(html.includes('Internet Protocol Version 4 (TCP/IPv4) Properties'));

 // System Properties and Rename Computer
 sim.action('show-sys-properties');
 html = sim.screen();
 assert.ok(html.includes('System Properties'));
 assert.ok(html.includes('Computer Name'));

 sim.action('show-rename-computer');
 html = sim.screen();
 assert.ok(html.includes('Computer Name/Domain Changes'));
}));

test('Server Manager provides DHCP and DNS role views',()=>harness(({state,sim})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true,domain:'serverlab.local',promoted:true,roles:['AD DS','DNS']});
 sim.action('open',{dataset:{app:'manager'}});

 // DHCP role view
 sim.action('manager-view',{dataset:{view:'DHCP'}});
 let html = sim.screen();
 assert.ok(html.includes('Dynamic Host Configuration Protocol'));
 assert.ok(html.includes('DHCP Server (DHCPServer)'));

 // DNS role view
 sim.action('manager-view',{dataset:{view:'DNS'}});
 html = sim.screen();
 assert.ok(html.includes('Domain Name System (DNS) Server Role active'));
 assert.ok(html.includes('serverlab.local'));
}));

test('Mobile client renders authentic smartphone home screen with widgets, app dock, and RD Client',()=>harness(({state})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true});
 
 // Home view with digital clock and network widget
 const homeHtml = renderMobileDevice({state, view: 'home', esc: String, icon: ()=>''});
 assert.ok(homeHtml.includes('mobile-clock-widget'));
 assert.ok(homeHtml.includes('mobile-app-grid'));
 assert.ok(homeHtml.includes('Settings'));
 assert.ok(homeHtml.includes('RD Client'));
 assert.ok(homeHtml.includes('mobile-dock'));

 // RD Client view
 const rdpConnectHtml = renderMobileDevice({state, view: 'rdp', esc: String, icon: ()=>''});
 assert.ok(rdpConnectHtml.includes('Remote Desktop'));
 assert.ok(rdpConnectHtml.includes('PC Name / IP Address'));

 // Active RDP session
 const rdpActiveHtml = renderMobileDevice({state, view: 'rdp', rdpSession: true, esc: String, icon: ()=>''});
 assert.ok(rdpActiveHtml.includes('Connected to Windows Server 2012 R2'));
 assert.ok(rdpActiveHtml.includes('mobile-rdp-disconnect'));

 // RD Client error with recovery button when RDP is disabled
 const rdpErrorHtml = renderMobileDevice({state, view: 'rdp', rdpError: 'Remote Desktop is disabled', esc: String, icon: ()=>''});
 assert.ok(rdpErrorHtml.includes('mobile-enable-rdp'));

 // Mobile browser with collapsible TP-Link header, nav, and help
 connectMobileWifi(state.networkEntities.mobile, state.networkEntities.router);
 loginRouter(state.networkEntities.router, 'admin', 'admin');
 const browserHtml = renderMobileDevice({state, view: 'browser', esc: String, icon: ()=>''});
 assert.ok(browserHtml.includes('tplink-mobile-header'));
 assert.ok(browserHtml.includes('tplink-mobile-nav-toggle'));
 assert.ok(browserHtml.includes('tplink-mobile-help-toggle'));
}));

test('Windows Firewall toggle updates state across all security profiles',()=>harness(({state,sim})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true});
 sim.action('open',{dataset:{app:'firewall'}});
 assert.equal(state.firewall.enabled, false);
 assert.ok(sim.screen().includes('Windows Firewall is OFF'));

 sim.action('toggle-firewall');
 assert.equal(state.firewall.enabled, true);
 assert.equal(state.firewall.domain, true);
 assert.equal(state.firewall.private, true);
 assert.equal(state.firewall.public, true);
 assert.ok(sim.screen().includes('Windows Firewall is ON'));

 sim.action('toggle-firewall');
 assert.equal(state.firewall.enabled, false);
 assert.ok(sim.screen().includes('Windows Firewall is OFF'));
}));

test('Task Manager and Services console verify system monitoring requirements',()=>harness(({state,sim})=>{
 Object.assign(state,{power:true,screen:'desktop',installed:true,adminSet:true});
 sim.action('open',{dataset:{app:'taskmgr'}});
 const procHtml = sim.screen();
 assert.equal(state.verifiedChecks.monitor_proc, true);
 assert.ok(procHtml.includes('Server Manager'));
 assert.ok(procHtml.includes('NTDS'));

 sim.action('taskmgr-tab',{dataset:{tab:'services'}});
 const svcHtml = sim.screen();
 assert.equal(state.verifiedChecks.monitor_svc, true);

 sim.action('open',{dataset:{app:'services'}});
 const servicesHtml = sim.screen();
 assert.ok(servicesHtml.includes('Active Directory Domain Services'));
 assert.ok(servicesHtml.includes('DNS Server'));
}));

test('Lab 02 complete learner journey achieves 100% progress',()=>harness(({state,sim})=>{
 state.activeLab = 'lab2';
 state.ethernet = true;
 const r = state.networkEntities.router;
 const m = state.networkEntities.mobile;

 // Initially 5/10 tasks done (default router configuration ready)
 let p = progress(state, 'lab2');
 assert.equal(p.done, 5);
 assert.equal(p.total, 10);

 // 1. Mobile client associates to Wi-Fi with valid passphrase
 const conn = connectMobileWifi(m, r, 'Password123!');
 assert.equal(conn.success, true);
 assert.equal(m.wifi.associatedSsid, 'SERVERLAB-WIFI');
 assert.ok(m.wifi.ip.startsWith('192.168.1.'));

 // 2. Mobile ping gateway & Windows Server
 const gwPing = simulatePing('mobile', '192.168.1.1', state);
 assert.equal(gwPing.success, true);
 state.verifiedChecks.mobile_ping_gw = true;

 const srvPing = simulatePing('mobile', '192.168.1.10', state);
 assert.equal(srvPing.success, true);
 state.verifiedChecks.mobile_ping_server = true;

 // 3. Mobile browse router admin
 state.verifiedChecks.mobile_browse = true;

 // All 10 tasks now complete (100%)
 p = progress(state, 'lab2');
 assert.equal(p.done, 10);
 assert.equal(p.percent, 100);
}));

test('Lab 03 complete learner journey achieves 100% progress',()=>harness(({state,sim})=>{
 state.activeLab = 'lab3';
 Object.assign(state, {
   power: true,
   screen: 'desktop',
   installed: true,
   adminSet: true,
   domain: 'css.com',
   promoted: true,
   restarted: true,
   roles: ['AD DS', 'DNS']
 });

 // Initially 2/9 tasks done (server_name and firewall_off)
 let p = progress(state, 'lab3');
 assert.equal(p.done, 2);
 assert.equal(p.total, 9);

 // 1. Static IP & DNS configuration
 state.network.dhcp = false;
 state.network.ip = '192.168.1.10';
 state.network.dns = '127.0.0.1';

 // 2. Active Directory Security Group and Membership
 state.users = [{ id: 'user1', name: 'John Doe', logon: 'jdoe', ou: 'ou1' }];
 state.groups = [{ id: 'grp1', name: 'IT Admins', scope: 'Global', type: 'Security', members: ['jdoe'] }];

 // 3. Remote Desktop Configuration & Test Session
 state.remoteDesktop.enabled = true;
 state.remoteDesktop.nla = true;
 sim.action('open', { dataset: { app: 'mstsc' } });
 state.verifiedChecks.rdp_tested = true;

 // 4. Process & Services Monitoring
 sim.action('open', { dataset: { app: 'taskmgr' } });
 sim.screen();
 assert.equal(state.verifiedChecks.monitor_proc, true);

 sim.action('open', { dataset: { app: 'services' } });
 sim.screen();
 assert.equal(state.verifiedChecks.monitor_svc, true);

 // All 9 tasks now complete (100%)
 p = progress(state, 'lab3');
 assert.equal(p.done, 9);
 assert.equal(p.percent, 100);
}));



