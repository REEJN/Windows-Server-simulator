import {initialState,validDomain,validPassword,validIP} from './engine.js';
import {renderBrowser} from './browser.js';
import {resolveDns,simulatePing,loginRouter,logoutRouter,updateRouterLan,updateRouterWan,updateRouterWlan,updateRouterDhcp,rebootRouter,resetRouter} from './network.js';

export function createSimulator(api){
const {get,icon,esc,toast,render,commit}=api;
let windows=[],nextZ=10,menu=null,context=null,wizard=null,installStep=0,installPercent=0,biosTab='Main',biosDraft=get().bootDevice,biosSelection=0,bootSelection=0,ventoyMode=false,startOpen=false,managerView='Dashboard',selectedOU='',folderView='Desktop',terminalLines=['Windows PowerShell','Copyright (C) Microsoft Corporation. All rights reserved.','','Serverlab simulated shell. Type help for supported commands.'],timers=[];

let browserUrl='http://192.168.1.1',
    browserRouterTab='status',
    taskmgrTab='processes',
    systemTab='General',
    selectedGroup='',
    rdpSessionOpen=false;

const titles={
  manager:'Server Manager',
  aduc:'Active Directory Users and Computers',
  explorer:'File Explorer',
  network:'Network and Sharing Center',
  terminal:'Administrator: Windows PowerShell',
  events:'Event Viewer',
  system:'System',
  browser:'Internet Explorer',
  firewall:'Windows Firewall with Advanced Security',
  taskmgr:'Task Manager',
  services:'Services',
  mstsc:'Remote Desktop Connection',
  control:'Control Panel'
};

const appIcons={
  manager:'server',
  aduc:'network',
  explorer:'folder',
  network:'network',
  terminal:'terminal',
  events:'book',
  system:'monitor',
  browser:'windows',
  firewall:'shield',
  taskmgr:'clock',
  services:'settings',
  mstsc:'monitor',
  control:'settings'
};

const btn=(label,act,extra='')=>`<button type="button" class="win-btn" data-action="os-${act}" ${extra}>${label}</button>`;
const submit=label=>`<button type="submit" class="win-btn primary">${label}</button>`;
const field=(label,name,value='',type='text',extra='')=>`<label class="win-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const check=(label,name,checked=false,extra='')=>`<label class="win-check"><input type="checkbox" name="${name}" ${checked?'checked':''} ${extra}>${label}</label>`;
const select=(label,name,values,current)=>`<label class="win-field"><span>${label}</span><select name="${name}">${values.map(v=>`<option ${v===current?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;

function later(fn,ms){const t=setTimeout(fn,ms);timers.push(t);return t;}

function clear(){
  timers.forEach(clearTimeout);
  timers=[];
  windows=[];
  wizard=menu=context=null;
  startOpen=false;
  installStep=0;
  ventoyMode=false;
  selectedOU='';
  selectedGroup='';
  rdpSessionOpen=false;
  managerView='Dashboard';
  folderView='Desktop';
  terminalLines=['Windows PowerShell','Serverlab simulated shell. Type help for supported commands.'];
  screen.wasOpened=false;
}

function power(){
  if(get().power){
    clear();
    commit({power:false,screen:'off'},'Server powered off.');
    return;
  }
  clear();
  commit({power:true,screen:'post'},'Power-on self-test started.');
}

function boot(device=get().bootDevice){
  if(device==='usb'){
    if(!get().usb){toast('No USB device detected. Connect the Ventoy drive and try again.');return;}
    ventoyMode=false;
    commit({screen:'ventoy',ventoyBooted:true},'Booted UEFI Ventoy USB.');
  }else if(get().installed){
    if(get().adminSet){
      windows=[];
      open('manager',false);
      commit({screen:'desktop',restarted:get().promoted?true:get().restarted},'Windows Server started.');
    }else commit({screen:'password'});
  }else commit({screen:'no-boot'});
}

function restart(){
  clear();
  commit({power:true,screen:'restarting'},'Server restart requested.');
  later(()=>{
    if(get().installed){
      windows=[];
      if(get().adminSet)open('manager',false);
      commit({screen:get().adminSet?'desktop':'password',restarted:get().promoted?true:get().restarted},'Server restart completed.');
    }else commit({screen:'post'});
  },2200);
}

function open(app,redraw=true){
  if(app==='aduc'&&(!get().promoted||!get().restarted)){
    toast('Promote this server and restart before opening Active Directory Users and Computers.');
    return;
  }
  let w=windows.find(w=>w.app===app);
  if(w){
    w.min=false;
    w.z=++nextZ;
  }else{
    w={app,id:app,min:false,max:false,x:90+(windows.length*24)%120,y:35+(windows.length*22)%85,z:++nextZ};
    windows.push(w);
  }
  startOpen=false;
  menu=null;
  if(redraw)render();
}

function screen(){
  const s=get();
  switch(s.screen){
    case'off':return null;
    case'post':return `<div class="post-screen"><div class="post-logo">${icon('server')} SERVERLAB<span>VIRTUAL SYSTEMS</span></div><pre>UEFI Firmware v2.17\nCPU: 4 Virtual Processors\nMemory Test: 8192 MB ... OK\nSATA Port 0: Virtual SSD 120 GB\nUSB Devices: ${s.usb?'1 Mass Storage — Ventoy':'0 detected'}\nNetwork: ${s.ethernet?'Intel Ethernet · Link up':'No cable connected'}\n\nPOST completed successfully.</pre><div class="post-actions">${btn('F2 · Enter BIOS','bios')}${btn('F12 · Boot menu','boot-menu')}${btn('Continue boot →','boot')}</div><p>Press F2 or Delete to enter setup. Your mission begins in BIOS.</p></div>`;
    case'bios':return bios();
    case'boot-menu':return `<div class="boot-menu"><h2>Please select boot device</h2>${[s.installed?'Windows Boot Manager (SATA SSD)':'SATA: Virtual SSD 120 GB',...(s.usb?['UEFI: Ventoy USB 32 GB']:[]),'Enter Setup'].map((name,i)=>`<button class="${i===bootSelection?'selected':''}" data-action="os-boot-choice" data-id="${i}">${name}</button>`).join('')}<p>↑ / ↓ Select · Enter Confirm · Esc Exit</p></div>`;
    case'no-boot':return `<div class="no-boot"><pre>No bootable device found.\n\nInsert boot media and select a valid boot device.\nSATA: Virtual SSD 120 GB — no operating system installed.</pre>${btn('Enter BIOS setup','bios')}${btn('Open boot menu','boot-menu')}</div>`;
    case'ventoy':return ventoy();
    case'setup':return installer();
    case'installing':return `<div class="setup-bg">${setupWindow('Installing Windows',`<h2>Installing Windows</h2><p>Your computer will restart during installation.</p><div class="install-progress"><div style="width:${installPercent}%"></div></div>${['Copying Windows files','Getting files ready for installation','Installing features','Installing updates','Finishing up'].map((t,i)=>`<p class="install-task ${installPercent>=i*20?'done':''}">${installPercent>(i+1)*20?'✓':installPercent>=i*20?'●':'○'} ${t}${installPercent>=i*20&&installPercent<(i+1)*20?` (${Math.min(99,installPercent%20*5)}%)`:''}</p>`).join('')}`,'')}</div>`;
    case'password':return `<div class="setup-bg">${setupWindow('Settings',`<h2>Customize settings</h2><p>You must set an Administrator password before you sign in.</p><form id="sim-form" data-form="admin">${field('User name','username','Administrator','text','disabled')}${field('Password','password','','password','required autocomplete="new-password"')}${field('Reenter password','confirm','','password','required autocomplete="new-password"')}<p class="form-help">Use a fictional password. Minimum 8 characters with 3 character types: uppercase, lowercase, number, symbol.</p><div class="form-error" id="form-error" role="alert"></div><div class="win-footer">${submit('Finish')}</div></form>`,'')}</div>`;
    case'restarting':return `<div class="restart-screen">${icon('windows')}<div class="spinner"></div><h2>Restarting</h2><p>Getting your server ready…</p></div>`;
    case'desktop':
      if(!windows.length&&!screen.wasOpened){open('manager',false);screen.wasOpened=true;}
      return desktop();
    default:return null;
  }
}

function bios(){
  const s=get();
  return `<div class="bios"><header>Aptio Setup Utility <span>Copyright (C) 2013 American Megatrends, Inc.</span></header><nav>${['Main','Advanced','Boot','Security','Save & Exit'].map(t=>`<button class="${biosTab===t?'selected':''}" data-action="os-bios-tab" data-tab="${t}">${t}</button>`).join('')}</nav><div class="bios-main"><section>${biosTab==='Main'?`<h3>BIOS Information</h3><dl><dt>BIOS Vendor</dt><dd>American Megatrends</dd><dt>UEFI Version</dt><dd>2.17.1246</dd><dt>Processor Type</dt><dd>Virtual CPU · 4 cores</dd><dt>Total Memory</dt><dd>8192 MB (DDR4)</dd><dt>System Date</dt><dd>${new Date().toLocaleDateString()}</dd><dt>System Time</dt><dd>${new Date().toLocaleTimeString()}</dd></dl>`:biosTab==='Boot'?`<h3>Boot Configuration</h3><dl><dt>Boot Mode</dt><dd>[UEFI]</dd><dt>Bootup NumLock State</dt><dd>[On]</dd></dl><h3>Boot Option Priorities</h3><button class="bios-option ${biosSelection===0?'selected':''}" data-action="os-set-boot" data-device="disk">Boot Option #1 <span>[${biosDraft==='disk'?'SATA: Virtual SSD':'UEFI: Ventoy USB'}]</span></button><button class="bios-option ${biosSelection===1?'selected':''}" data-action="os-set-boot" data-device="usb" ${s.usb?'':'disabled'}>UEFI: Ventoy USB 32 GB <span>[${s.usb?'Detected':'Not present'}]</span></button><p class="bios-tip">Select Ventoy USB above to make it the first boot device.</p>`:biosTab==='Advanced'?`<h3>System Configuration</h3><dl><dt>Virtualization Technology</dt><dd>[Enabled]</dd><dt>SATA Mode</dt><dd>[AHCI]</dd><dt>USB Controller</dt><dd>[Enabled]</dd><dt>USB Mass Storage</dt><dd>[${s.usb?'Ventoy 32 GB':'Not Detected'}]</dd><dt>Onboard LAN</dt><dd>[Enabled]</dd></dl>`:biosTab==='Security'?`<h3>Secure Boot</h3><dl><dt>Secure Boot</dt><dd>[Disabled for training media]</dd><dt>Administrator Password</dt><dd>[Not Installed]</dd><dt>TPM</dt><dd>[Not Present]</dd></dl>`:`<h3>Save & Exit</h3><button class="bios-option selected" data-action="os-bios-save">Save Changes and Exit</button><button class="bios-option" data-action="os-bios-discard">Discard Changes and Exit</button><button class="bios-option" data-action="os-bios-default">Restore Defaults</button>`}</section><aside><p>${biosTab==='Boot'?'Select the boot device priority. Connect the USB drive to make Ventoy available.':'Use the Boot tab to select the Ventoy USB installer.'}</p><hr><p>← → : Select Screen</p><p>↑ ↓ : Select Item</p><p>Enter : Select</p><p>F10 : Save & Exit</p><p>Esc : Exit</p></aside></div><footer>Version 2.17.1246. Copyright (C) 2013 American Megatrends, Inc. <button data-action="os-bios-save">F10 Save & Exit</button></footer></div>`;
}

function ventoy(){
  return `<div class="ventoy"><header><strong>Ventoy</strong><span>1.0.99 UEFI</span></header><div class="ventoy-list"><div class="ventoy-path">${ventoyMode?'Select boot mode':'/ ISO images'}</div>${ventoyMode?`<button class="selected" data-action="os-setup-start">Boot in normal mode</button><button data-action="os-ventoy-back">Return to previous menu</button>`:`<button class="selected" data-action="os-iso">Windows_Server_2012_R2_x64.iso <span>4.2 GB</span></button>`}</div><p>${get().usb?'↑ / ↓ Select · Enter Boot · Esc Back':'USB removed. Reconnect the Ventoy USB drive to continue.'}</p><footer>Ventoy · A new bootable USB solution</footer></div>`;
}

function setupWindow(title,body,footer){
  return `<section class="setup-window"><div class="setup-title">${icon('windows')} ${title}</div><div class="setup-content">${body}</div>${footer?`<div class="win-footer">${footer}</div>`:''}</section>`;
}

function installer(){
  let content='',foot='';
  switch(installStep){
    case 0:content=`<div class="windows-wordmark">${icon('windows')} <span>Windows <b>Server 2012 R2</b></span></div><form id="sim-form" data-form="setup-language">${select('Language to install','language',['English (United States)','English (United Kingdom)'],'English (United States)')}${select('Time and currency format','locale',['English (United States)','English (Philippines)'],'English (United States)')}${select('Keyboard or input method','keyboard',['US','United Kingdom'],'US')}<p>Enter your language and other preferences and click Next to continue.</p><div class="win-footer">${submit('Next')}</div></form>`;break;
    case 1:content=`<div class="windows-wordmark">${icon('windows')} <span>Windows <b>Server 2012 R2</b></span></div><div class="install-now">${btn('Install now','setup-next')}</div><p class="form-help">Windows Server installation environment · Training simulation</p>`;break;
    case 2:content=`<h2>Select the operating system you want to install</h2><form id="sim-form" data-form="setup-edition"><table class="win-table"><thead><tr><th>Operating system</th><th>Architecture</th></tr></thead><tbody><tr><td><label><input type="radio" name="edition" value="core"> Windows Server 2012 R2 Standard (Server Core Installation)</label></td><td>x64</td></tr><tr class="selected"><td><label><input type="radio" name="edition" value="gui" checked> Windows Server 2012 R2 Standard (Server with a GUI)</label></td><td>x64</td></tr></tbody></table><p class="form-help">This mission uses Server with a GUI, which includes Server Manager and desktop tools.</p><div id="form-error" class="form-error" role="alert"></div><div class="win-footer">${btn('Back','setup-back')}${submit('Next')}</div></form>`;break;
    case 3:content=`<h2>License terms</h2><div class="license"><b>WINDOWS SERVER 2012 R2 — SIMULATED SETUP</b><p>This screen reproduces the license acceptance step for educational practice. It does not install or license Microsoft software.</p><p>Microsoft Windows and Windows Server are trademarks of Microsoft Corporation. Serverlab is an independent training simulator.</p></div><form id="sim-form" data-form="setup-license">${check('I accept the license terms (simulation)','accept',false,'required')}<div class="win-footer">${btn('Back','setup-back')}${submit('Next')}</div></form>`;break;
    case 4:content=`<h2>Which type of installation do you want?</h2><button class="install-choice" data-action="os-upgrade"><b>Upgrade: Install Windows and keep files, settings, and applications</b><span>Available when a supported version of Windows is already installed.</span></button><button class="install-choice" data-action="os-setup-next"><b>Custom: Install Windows only (advanced)</b><span>Install a fresh copy of Windows on this server.</span></button>`;break;
    case 5:content=`<h2>Where do you want to install Windows?</h2><table class="win-table"><thead><tr><th>Name</th><th>Total size</th><th>Free space</th><th>Type</th></tr></thead><tbody><tr class="selected"><td>✓ Drive 0 Unallocated Space</td><td>120.0 GB</td><td>120.0 GB</td><td>Unallocated</td></tr></tbody></table><p>Windows will create the system partitions required for installation.</p><div class="win-footer">${btn('Back','setup-back')}${btn('Next','install')}</div>`;break;
  }
  return `<div class="setup-bg">${setupWindow('Windows Setup',content,foot)}<div class="setup-bottom"><span class="${installStep<5?'active':''}">1 &nbsp; Collecting information</span><span>2 &nbsp; Installing Windows</span></div></div>`;
}

function desktop(){
  const s=get();
  const shortcuts=[
    ['explorer','This PC','monitor'],
    ['manager','Server Manager','server'],
    ['control','Control Panel','settings'],
    ['terminal','Windows PowerShell','terminal'],
    ['browser','Internet Explorer','windows'],
    ['firewall','Windows Firewall','shield'],
    ['taskmgr','Task Manager','clock']
  ];

  return `
    <div class="desktop" id="desktop" data-context="desktop">
      <div class="desktop-shortcuts">
        ${shortcuts.map(([app,label,i])=>`
          <button class="desktop-icon" data-action="os-open" data-app="${app}">
            ${icon(i)}<span>${label}</span>
          </button>
        `).join('')}
        ${s.folders.map(f=>`
          <button class="desktop-icon" data-action="os-folder-open" data-id="${f.id}" data-context="folder" data-folder="${f.id}">
            ${icon('folder')}<span>${esc(f.name)}</span>
          </button>
        `).join('')}
      </div>

      <div class="desktop-brand">
        ${icon('windows')}<div>Windows Server <span>2012 R2</span></div>
      </div>
      <div class="desktop-watermark">
        Windows Server 2012 R2 Standard<br>
        ${s.domain?esc(s.domain):'Workgroup: WORKGROUP'} · ${esc(s.computerName)}
      </div>

      ${windows.filter(w=>!w.min).map(windowView).join('')}
      ${startOpen?startMenu():''}
      ${menu?renderMenu():''}
      ${context?renderContext():''}
      ${wizard?renderWizard():''}

      <div class="taskbar">
        <button class="start-button" data-action="os-start" aria-label="Start">${icon('windows')}</button>
        ${['manager','explorer','terminal'].map(app=>`
          <button class="task-app ${windows.some(w=>w.app===app)?'running':''}" data-action="os-open" data-app="${app}" aria-label="${titles[app]}">
            ${icon(appIcons[app])}
          </button>
        `).join('')}
        ${windows.filter(w=>!['manager','explorer','terminal'].includes(w.app)).map(w=>`
          <button class="task-app running" data-action="os-open" data-app="${w.app}" aria-label="${titles[w.app]}">
            ${icon(appIcons[w.app])}
          </button>
        `).join('')}
        <div class="tray">
          <button data-action="os-open" data-app="network" aria-label="Network status">
            ${icon('network')}${s.ethernet?'':'×'}
          </button>
          <span>${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}<br>${new Date().toLocaleDateString()}</span>
          <button class="show-desktop" data-action="os-show-desktop" aria-label="Show desktop"></button>
        </div>
      </div>
    </div>
  `;
}

function windowView(w){
  return `
    <section class="os-window ${w.max?'maximized':''}" data-window="${w.id}" style="left:${w.x}px;top:${w.y}px;z-index:${w.z}">
      <div class="win-titlebar" data-drag="${w.id}">
        <span>${icon(appIcons[w.app])} ${titles[w.app]}</span>
        <div>
          <button data-action="os-minimize" data-id="${w.id}" aria-label="Minimize ${titles[w.app]}">—</button>
          <button data-action="os-maximize" data-id="${w.id}" aria-label="Maximize ${titles[w.app]}">□</button>
          <button class="close" data-action="os-close" data-id="${w.id}" aria-label="Close ${titles[w.app]}">×</button>
        </div>
      </div>
      <div class="window-body ${w.app}">
        ${({manager,aduc,explorer,network,terminal,events,system,browser,firewall,taskmgr,services,mstsc,control})[w.app]()}
      </div>
    </section>
  `;
}

function startMenu(){
  return `
    <div class="start-menu">
      <h2>Start</h2>
      <p>${get().domain?esc(get().domain.split('.')[0].toUpperCase())+'\\':''}Administrator</p>
      <div>
        ${Object.keys(titles).map(app=>`
          <button data-action="os-open" data-app="${app}">
            ${icon(appIcons[app])}${titles[app].replace('Administrator: ','')}
          </button>
        `).join('')}
      </div>
      <footer>
        ${btn('Restart','restart')}
        ${btn('Shut down','shutdown')}
      </footer>
    </div>
  `;
}

function renderMenu(){
  return `
    <div class="os-menu ${menu==='Tools'?'tools-menu':''}">
      ${(menu==='Tools'?[
        ['Active Directory Users and Computers','open','aduc'],
        ['Control Panel','open','control'],
        ['Windows PowerShell','open','terminal'],
        ['Event Viewer','open','events'],
        ['Task Manager','open','taskmgr'],
        ['Services','open','services'],
        ['Windows Firewall with Advanced Security','open','firewall'],
        ['Remote Desktop Connection','open','mstsc'],
        ['Network and Sharing Center','open','network']
      ]:menu==='Manage'?[
        ['Add Roles and Features','roles',''],
        ['Server Properties','open','system']
      ]:[
        ['Promote this server to a domain controller','promote','']
      ]).map(([t,a,app])=>`
        <button data-action="os-${a}" data-app="${app}">${t}</button>
      `).join('')}
    </div>
  `;
}

function manager(){
  const s=get();
  const navRoles = [
    'Dashboard',
    'Local Server',
    'All Servers',
    ...(s.roles.includes('AD DS') || s.promoted ? ['AD DS'] : []),
    'DHCP',
    'DNS',
    'File and Storage Services'
  ];

  const dashTiles = [
    ...(s.roles.includes('AD DS') || s.promoted ? ['AD DS'] : []),
    'DHCP',
    'DNS',
    'File and Storage Services',
    'Local Server',
    'All Servers'
  ];

  return `
    <div class="manager-header">
      <div class="manager-back">←</div>
      <h2>Server Manager <span>▸ ${managerView}</span></h2>
      <div class="manager-menus">
        <button data-action="os-menu" data-menu="Notifications" title="Notifications" aria-label="Notifications">
          ${icon('flag')}${s.roles.includes('AD DS')&&!s.promoted?'<b>!</b>':''}
        </button>
        <button data-action="os-menu" data-menu="Manage">Manage</button>
        <button data-action="os-menu" data-menu="Tools">Tools</button>
      </div>
    </div>
    <div class="manager-layout">
      <nav>
        ${navRoles.map(v=>`
          <button class="${managerView===v?'active':''}" data-action="os-manager-view" data-view="${v}">
            ${icon(v==='Dashboard'?'monitor':'server')}${v}
          </button>
        `).join('')}
      </nav>
      <main>
        ${managerView==='Dashboard'?`
          <h2>Welcome to Server Manager</h2>
          <div class="manager-welcome">
            <div class="welcome-blue">
              ${icon('server')}<span>Configure this<br>local server</span>
            </div>
            <div>
              <button data-action="os-open" data-app="system"><b>1</b> Configure this local server</button>
              <button data-action="os-roles"><b>2</b> Add roles and features</button>
              <button data-action="os-open" data-app="network"><b>3</b> Configure network settings</button>
              <button data-action="os-open" data-app="aduc"><b>4</b> Manage your domain</button>
            </div>
          </div>
          <h3>ROLES AND SERVER GROUPS</h3>
          <div class="server-tiles">
            ${dashTiles.map(v=>`
              <button data-action="os-manager-view" data-view="${v}">
                <header>${icon('server')} ${v}</header>
                <p class="green">✓ Manageability</p>
                <p>Events <span>0</span></p>
                <p>Services <span>${v === 'AD DS' ? (s.promoted ? '7' : '3') : v === 'DHCP' || v === 'DNS' ? '1' : '3'}</span></p>
                <p>Performance <span>1</span></p>
              </button>
            `).join('')}
          </div>
        `:managerView==='AD DS'?`
          <h2>AD DS</h2>
          ${!s.promoted?`
            <div class="manager-warning">
              ⚑ Configuration required for Active Directory Domain Services at ${esc(s.computerName)}.
              <button data-action="os-more">More…</button>
            </div>
          `:`
            <div class="manager-success">
              ✓ Domain controller configured for ${esc(s.domain)}${s.restarted?'':' · Restart required'}
            </div>
          `}
          <h3>SERVERS</h3>
          <table class="win-table">
            <thead>
              <tr><th>Server Name</th><th>IP Address</th><th>Manageability</th></tr>
            </thead>
            <tbody>
              <tr><td>${esc(s.computerName)}</td><td>${s.ethernet?esc(s.network.ip):'Disconnected'}</td><td>Online</td></tr>
            </tbody>
          </table>
          ${btn('Active Directory Users and Computers','open','data-app="aduc"')}
          ${s.promoted&&!s.restarted?btn('Restart now','restart'):''}
        `:managerView==='DHCP'?`
          <h2>DHCP</h2>
          <div class="manager-success">
            ✓ Dynamic Host Configuration Protocol (DHCP) Server Role configured and operating normally.
          </div>
          <h3>SERVERS</h3>
          <table class="win-table">
            <thead>
              <tr><th>Server Name</th><th>IPv4 Address</th><th>Manageability</th></tr>
            </thead>
            <tbody>
              <tr><td>${esc(s.computerName)}</td><td>${s.ethernet ? esc(s.network.ip) : 'Disconnected'}</td><td>Online · Authorized</td></tr>
            </tbody>
          </table>
          <h3>SERVICES</h3>
          <table class="win-table">
            <thead><tr><th>Service Name</th><th>Status</th><th>Startup Type</th></tr></thead>
            <tbody>
              <tr><td>DHCP Server (DHCPServer)</td><td><b class="green-text">Running</b></td><td>Automatic</td></tr>
            </tbody>
          </table>
          <h3>IPV4 SCOPES</h3>
          <table class="win-table">
            <thead><tr><th>Scope Name</th><th>Subnet</th><th>Pool Range</th><th>State</th></tr></thead>
            <tbody>
              <tr><td>LAN Scope (Classroom)</td><td>192.168.1.0/24</td><td>192.168.1.100 – 192.168.1.199</td><td><b class="green-text">Active</b></td></tr>
            </tbody>
          </table>
          <div style="margin-top:12px;">
            ${btn('Open DHCP Console','open','data-app="services"')}
          </div>
        `:managerView==='DNS'?`
          <h2>DNS</h2>
          <div class="manager-success">
            ✓ Domain Name System (DNS) Server Role active on ${esc(s.computerName)}.
          </div>
          <h3>SERVERS</h3>
          <table class="win-table">
            <thead>
              <tr><th>Server Name</th><th>IPv4 Address</th><th>Manageability</th></tr>
            </thead>
            <tbody>
              <tr><td>${esc(s.computerName)}</td><td>${s.ethernet ? esc(s.network.ip) : 'Disconnected'}</td><td>Online · Active</td></tr>
            </tbody>
          </table>
          <h3>SERVICES</h3>
          <table class="win-table">
            <thead><tr><th>Service Name</th><th>Status</th><th>Startup Type</th></tr></thead>
            <tbody>
              <tr><td>DNS Server (DNS)</td><td><b class="green-text">Running</b></td><td>Automatic</td></tr>
            </tbody>
          </table>
          <h3>FORWARD LOOKUP ZONES</h3>
          <table class="win-table">
            <thead><tr><th>Zone Name</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>${esc(s.domain || 'serverlab.local')}</td><td>Active Directory-Integrated</td><td><b class="green-text">Running</b></td></tr>
              <tr><td>_msdcs.${esc(s.domain || 'serverlab.local')}</td><td>Active Directory-Integrated</td><td><b class="green-text">Running</b></td></tr>
            </tbody>
          </table>
          <div style="margin-top:12px;">
            ${btn('Open DNS Console','open','data-app="services"')}
          </div>
        `:managerView==='File and Storage Services'?`
          <h2>File and Storage Services</h2>
          <h3>VOLUMES & SHARES</h3>
          <table class="win-table">
            <thead><tr><th>Share Name</th><th>Local Path</th><th>Protocol</th><th>Status</th></tr></thead>
            <tbody>
              ${s.folders.filter(f => f.shared).map(f => `
                <tr><td>${esc(f.shareName || f.name)}</td><td>C:\\Users\\Administrator\\Desktop\\${esc(f.name)}</td><td>SMB</td><td>Online</td></tr>
              `).join('') || `<tr><td colspan="4" style="text-align:center;color:#888;padding:12px;">No shared folders created yet.</td></tr>`}
            </tbody>
          </table>
          <div style="margin-top:12px;">
            ${btn('Open File Explorer','open','data-app="explorer"')}
          </div>
        `:managerView==='Local Server'?`
          <h2>PROPERTIES <small>for ${esc(s.computerName)}</small></h2>
          <div class="properties-grid">
            <span>Computer name</span><button data-action="os-open" data-app="system">${esc(s.computerName)}</button>
            <span>Domain</span><span>${esc(s.domain||'WORKGROUP')}</span>
            <span>Ethernet</span><button data-action="os-open" data-app="network">${s.ethernet?esc(s.network.ip):'Network cable unplugged'}</button>
            <span>Windows Firewall</span><button data-action="os-open" data-app="firewall">${s.firewall?.enabled?'Public: On':'Off (Per curriculum)'}</button>
            <span>Remote Desktop</span><button data-action="os-show-sys-properties" data-tab="Remote">${s.remoteDesktop?.enabled?'Enabled':'Disabled'}</button>
            <span>Operating system</span><span>Microsoft Windows Server 2012 R2 Standard</span>
            <span>Installed memory (RAM)</span><span>8.00 GB</span>
            <span>Processor</span><span>4 virtual processors</span>
            <span>Installed roles</span><span>${s.roles.join(', ')||'None'}</span>
          </div>
        `:`
          <h2>ALL SERVERS</h2>
          <table class="win-table">
            <thead><tr><th>Server name</th><th>IPv4 Address</th><th>Operating system</th></tr></thead>
            <tbody><tr><td>${esc(s.computerName)}</td><td>${s.ethernet?esc(s.network.ip):'Disconnected'}</td><td>Windows Server 2012 R2</td></tr></tbody>
          </table>
        `}
      </main>
    </div>
  `;
}

function aduc(){
  const s=get(),ou=s.ous.find(o=>o.id===selectedOU);
  const userRows=ou?s.users.filter(u=>u.ou===ou.id):s.users.filter(u=>!u.ou);
  const groupRows=(s.groups||[]).filter(g=>ou?g.ou===ou.id:!g.ou);
  const rows=ou?[...userRows,...groupRows]:s.ous;

  return `
    <div class="classic-menu">
      <button data-action="os-ad-new">Action</button>
      <button data-action="os-ad-new">New</button>
      <button data-action="os-refresh">Refresh</button>
    </div>
    <div class="ad-toolbar">
      ${btn('New organizational unit','new-ou')}
      ${btn('New user','new-user',ou?'':'disabled')}
      ${btn('New group','new-group',ou?'':'disabled')}
    </div>
    <div class="ad-layout">
      <aside>
        <div>▾ Active Directory Users and Computers</div>
        <button class="${!ou?'selected':''}" data-action="os-select-domain" data-context="domain">
          ${icon('network')} ${esc(s.domain)}
        </button>
        <div class="ad-tree-child">
          <span>▸ Builtin</span>
          <span>▸ Computers</span>
          <span>▸ Domain Controllers</span>
          <span>▸ Users</span>
          ${s.ous.map(o=>`
            <button class="${selectedOU===o.id?'selected':''}" data-action="os-select-ou" data-id="${o.id}" data-context="ou" data-ou="${o.id}">
              ${icon('folder')} ${esc(o.name)}
            </button>
          `).join('')}
        </div>
      </aside>
      <main>
        <div class="ad-location">${esc(s.domain)}${ou?' / '+esc(ou.name):''}</div>
        <table class="win-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            ${rows.map(item=>{
              const isUser = !!item.logon;
              const isGroup = !!item.type && !item.logon;
              const isOu = !isUser && !isGroup;
              return `
                <tr data-action="os-${isUser?'user-properties':isGroup?'group-properties':'select-ou'}"
                    data-id="${item.id}"
                    data-context="${isUser?'user':isGroup?'group':'ou'}"
                    data-ou="${ou?ou.id:item.id}">
                  <td>${icon(isUser?'user':isGroup?'network':'folder')} ${esc(item.name)}</td>
                  <td>${isUser?'User':isGroup?'Security Group':'Organizational Unit'}</td>
                  <td>${isUser?esc(item.logon):isGroup?`${item.scope||'Global'} (${(item.members||[]).length} members)`:item.protected?'Protected':''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${rows.length?'':`<p class="empty-list">${ou?'No objects in this OU. Right-click to create a user or security group.':'Right-click your domain to create an organizational unit.'}</p>`}
      </main>
    </div>
    <div class="win-status">${rows.length} object(s) · ${ou?'Organizational unit: '+esc(ou.name):esc(s.domain)}</div>
  `;
}

function explorer(){
  const s=get(),f=s.folders.find(f=>f.id===folderView);
  return `
    <div class="classic-menu">
      <button data-action="os-new-folder">New folder</button>
      <button data-action="os-explorer-desktop">Desktop</button>
      <button data-action="os-refresh">Refresh</button>
    </div>
    <div class="explorer-address">${icon('folder')} This PC ▸ ${f?'Desktop ▸ '+esc(f.name):'Desktop'}</div>
    <div class="explorer-layout">
      <aside>
        <button data-action="os-explorer-desktop">${icon('folder')} Desktop</button>
        <button data-action="os-explorer-computer">${icon('monitor')} This PC</button>
        <button data-action="os-open" data-app="network">${icon('network')} Network</button>
      </aside>
      <main data-context="desktop">
        ${folderView==='This PC'?`
          <h3>Devices and drives</h3>
          <div class="drive">
            ${icon('disk')}
            <div>Local Disk (C:)<div class="disk-space"><i></i></div><small>105 GB free of 120 GB</small></div>
          </div>
          ${s.usb?`<div class="drive">${icon('usb')}<div>Ventoy (D:)<small>Windows_Server_2012_R2_x64.iso</small></div></div>`:''}
        `:f?`
          <p class="empty-list">This folder is empty.</p>
          <p class="folder-location">C:\\Users\\Administrator\\Desktop\\${esc(f.name)}</p>
          ${btn('Folder properties','properties',`data-id="${f.id}"`)}
        `:s.folders.length?`
          <div class="folder-grid">
            ${s.folders.map(f=>`
              <button data-action="os-folder-open" data-id="${f.id}" data-context="folder" data-folder="${f.id}">
                ${icon('folder')}<span>${esc(f.name)}</span><small>${f.shared?'Shared':'File folder'}</small>
              </button>
            `).join('')}
          </div>
        `:`
          <p class="empty-list">This folder is empty.<br>Use New folder or right-click to create one.</p>
        `}
      </main>
    </div>
    <div class="win-status">${f?0:s.folders.length} item(s)</div>
  `;
}

function network(){
  const s=get();
  return `
    <div class="cpl-explorer-window">
      <div class="cpl-header">
        <div class="cpl-nav-bar">
          <button type="button" class="win-btn b-btn cpl-nav-btn" data-action="os-open" data-app="control" title="Back">←</button>
          <button type="button" class="win-btn b-btn cpl-nav-btn" title="Forward" disabled>→</button>
          <button type="button" class="win-btn b-btn cpl-nav-btn" data-action="os-open" data-app="control" title="Up">↑</button>
          <div class="cpl-breadcrumb">
            <span class="cpl-crumb-icon">${icon('network')}</span>
            <span class="cpl-crumb-seg" data-action="os-open" data-app="control">Control Panel</span>
            <span class="cpl-crumb-sep">›</span>
            <span class="cpl-crumb-seg">Network and Internet</span>
            <span class="cpl-crumb-sep">›</span>
            <span class="cpl-crumb-seg">Network and Sharing Center</span>
          </div>
          <div class="cpl-search">
            <input type="text" placeholder="Search Control Panel" disabled>
            <span class="cpl-search-icon">🔍</span>
          </div>
        </div>
      </div>
      <div class="cpl-explorer-body">
        <aside class="cpl-sidebar">
          <div class="cpl-sidebar-group">
            <button type="button" class="cpl-sidebar-link" data-action="os-open" data-app="control">Control Panel Home</button>
            <button type="button" class="cpl-sidebar-link" data-action="os-show-ethernet-props">Change adapter settings</button>
            <span class="cpl-sidebar-link disabled">Change advanced sharing settings</span>
          </div>
        </aside>
        <main class="network-page">
          <h2>View your basic network information and set up connections</h2>
          <div class="network-map">
            <div>${icon('monitor')}<p>${esc(s.computerName)}</p></div>
            <span class="${s.ethernet?'':'broken'}">${s.ethernet?'────────':'── × ──'}</span>
            <div>${icon('network')}<p>${s.ethernet?'Network':'Disconnected'}</p></div>
          </div>
          <h3>View your active networks</h3>
          <div class="network-info">
            <div class="net-active-row">
              <div class="net-active-icon">${icon('network')}</div>
              <div class="net-active-details">
                <b>${s.ethernet?s.domain||'Network':'Unidentified network'}</b>
                <span>Access type: ${s.ethernet?'Local network (simulation)':'No network access'}</span>
                <span>Connections: <button type="button" class="win-link-btn" data-action="os-show-ethernet-status">Ethernet</button></span>
              </div>
            </div>
          </div>
          <h3>Change your networking settings</h3>
          <div class="cpl-task-grid">
            <div class="cpl-task-item">
              <button type="button" class="win-link-btn" data-action="os-show-ethernet-props">Change adapter settings</button>
              <small>View network adapters and configure IP addresses</small>
            </div>
            <div class="cpl-task-item">
              <button type="button" class="win-link-btn" data-action="os-open" data-app="firewall">Windows Firewall</button>
              <small>Inspect and configure incoming and outgoing packet rules</small>
            </div>
          </div>
          <div class="adapter-config-summary">
            <p>IPv4 address: <b>${s.ethernet?esc(s.network.ip):'Media disconnected'}</b> · Subnet: <b>${esc(s.network.mask)}</b> · Gateway: <b>${esc(s.network.gateway)}</b> · DNS: <b>${esc(s.network.dns)}</b></p>
          </div>
        </main>
      </div>
    </div>
  `;
}

function terminal(){
  return `
    <div class="terminal-content" id="terminal-content">
      <pre>${terminalLines.map(esc).join('\n')}</pre>
      <form id="terminal-form">
        <label>PS C:\\Users\\Administrator&gt; <input name="command" aria-label="PowerShell command" autocomplete="off" spellcheck="false"></label>
      </form>
    </div>
  `;
}

function events(){
  return `
    <div class="event-page">
      <h2>Serverlab system events</h2>
      <table class="win-table">
        <thead><tr><th>Time</th><th>Level</th><th>Event</th></tr></thead>
        <tbody>
          ${get().events.map(e=>`<tr><td>${esc(e.time)}</td><td>Information</td><td>${esc(e.message)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function system(){
  const s=get();
  return `
    <div class="system-page">
      <nav class="property-tabs">
        <button type="button" class="${systemTab==='General'?'active':''}" data-action="os-system-tab" data-tab="General">Computer Name</button>
        <button type="button" class="${systemTab==='Remote'?'active':''}" data-action="os-system-tab" data-tab="Remote">Remote</button>
      </nav>
      ${systemTab==='General'?`
        <h2>View basic information about your computer</h2>
        <h3>Windows edition</h3>
        <p>Windows Server 2012 R2 Standard</p>
        <hr>
        <h3>System</h3>
        <dl>
          <dt>Processor</dt><dd>Virtual CPU · 4 vCPU</dd>
          <dt>Installed memory (RAM)</dt><dd>8.00 GB</dd>
          <dt>System type</dt><dd>64-bit Operating System, x64-based processor</dd>
          <dt>Computer name</dt><dd>${esc(s.computerName)}</dd>
          <dt>Full computer name</dt><dd>${esc(s.computerName)}${s.domain?'.'+esc(s.domain):''}</dd>
          <dt>Domain / Workgroup</dt><dd>${esc(s.domain||'WORKGROUP')}</dd>
        </dl>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button type="button" class="win-btn" data-action="os-show-rename-computer">Change computer name</button>
          <button type="button" class="win-btn" data-action="os-show-sys-properties">System Properties</button>
        </div>
      `:`
        <h2>Remote Settings</h2>
        <h3>Remote Desktop</h3>
        <form data-form="system-remote" class="rdp-settings-form">
          <label class="win-check">
            <input type="radio" name="rdp_enable" value="false" ${s.remoteDesktop?.enabled?'':'checked'}>
            Don't allow remote connections to this computer
          </label>
          <label class="win-check">
            <input type="radio" name="rdp_enable" value="true" ${s.remoteDesktop?.enabled?'checked':''}>
            Allow remote connections to this computer
          </label>
          <div style="margin-left: 24px; margin-top: 10px;">
            <label class="win-check">
              <input type="checkbox" name="nla" ${s.remoteDesktop?.nla?'checked':''} ${s.remoteDesktop?.enabled?'':'disabled'}>
              Allow connections only from computers running Remote Desktop with Network Level Authentication (recommended)
            </label>
            <p class="form-help">Users in the Administrators group can connect even if they are not listed.</p>
            ${btn('Select Users…','rdp-users')}
          </div>
          <div class="win-footer">
            ${submit('Apply')}
          </div>
        </form>
      `}
      <p class="form-help">Serverlab training simulation. No Windows license or activation is required.</p>
    </div>
  `;
}

function browser(){
  const s=get();
  s.verifiedChecks.routerBrowsed=true;
  return renderBrowser({
    state: s,
    url: browserUrl,
    tab: browserRouterTab,
    esc,
    icon,
    source: 'server'
  });
}

function firewall(){
  const s=get();
  const fw=s.firewall||{enabled:false,domain:false,private:false,public:false};
  return `
    <div class="cpl-explorer-window">
      <div class="cpl-header">
        <div class="cpl-nav-bar">
          <button type="button" class="win-btn b-btn cpl-nav-btn" data-action="os-open" data-app="control" title="Back">←</button>
          <button type="button" class="win-btn b-btn cpl-nav-btn" title="Forward" disabled>→</button>
          <button type="button" class="win-btn b-btn cpl-nav-btn" data-action="os-open" data-app="control" title="Up">↑</button>
          <div class="cpl-breadcrumb">
            <span class="cpl-crumb-icon">${icon('shield')}</span>
            <span class="cpl-crumb-seg" data-action="os-open" data-app="control">Control Panel</span>
            <span class="cpl-crumb-sep">›</span>
            <span class="cpl-crumb-seg">System and Security</span>
            <span class="cpl-crumb-sep">›</span>
            <span class="cpl-crumb-seg">Windows Firewall</span>
          </div>
          <div class="cpl-search">
            <input type="text" placeholder="Search Control Panel" disabled>
            <span class="cpl-search-icon">🔍</span>
          </div>
        </div>
      </div>
      <div class="cpl-explorer-body">
        <aside class="cpl-sidebar">
          <div class="cpl-sidebar-group">
            <button type="button" class="cpl-sidebar-link" data-action="os-open" data-app="control">Control Panel Home</button>
            <span class="cpl-sidebar-link disabled">Allow an app through firewall</span>
            <span class="cpl-sidebar-link disabled">Change notification settings</span>
            <button type="button" class="cpl-sidebar-link" data-action="os-toggle-firewall">Turn Windows Firewall on or off</button>
            <span class="cpl-sidebar-link disabled">Restore defaults</span>
            <span class="cpl-sidebar-link disabled">Advanced settings</span>
          </div>
        </aside>
        <main class="firewall-page">
          <div class="firewall-header">
            ${icon('shield')}
            <div>
              <h2>Windows Firewall with Advanced Security</h2>
              <p>Help protect your computer with Windows Firewall</p>
            </div>
          </div>
          <div class="firewall-profiles">
            <div class="profile-card ${fw.enabled?'active':'inactive'}">
              <h4>Domain Profile</h4>
              <p class="profile-status">${fw.enabled?'✓ Windows Firewall is ON':'⚠ Windows Firewall is OFF'}</p>
              <small>Active on domain network (${esc(s.domain||'Not connected')})</small>
            </div>
            <div class="profile-card ${fw.enabled?'active':'inactive'}">
              <h4>Private Profile</h4>
              <p class="profile-status">${fw.enabled?'✓ Windows Firewall is ON':'⚠ Windows Firewall is OFF'}</p>
              <small>Active on home / internal lab network</small>
            </div>
            <div class="profile-card ${fw.enabled?'active':'inactive'}">
              <h4>Public Profile</h4>
              <p class="profile-status">${fw.enabled?'✓ Windows Firewall is ON':'⚠ Windows Firewall is OFF'}</p>
              <small>Active on public / untrusted network</small>
            </div>
          </div>
          <div class="firewall-action-bar">
            <button type="button" class="win-btn primary" data-action="os-toggle-firewall">
              ${fw.enabled?'Turn Windows Firewall Off (Classroom Exercise)':'Turn Windows Firewall On'}
            </button>
            <span class="firewall-caption">
              ${fw.enabled?'Firewall is active and filtering packets.':'Firewall disabled per assignment instructions.'}
            </span>
          </div>
        </main>
      </div>
    </div>
  `;
}

function taskmgr(){
  const s=get();
  s.verifiedChecks.monitor_proc=true;
  if(taskmgrTab==='services')s.verifiedChecks.monitor_svc=true;

  const procs=[
    {name:'Server Manager',pid:1420,cpu:'0.2 %',mem:'48.2 MB'},
    {name:'Active Directory Domain Services (NTDS)',pid:684,cpu:'0.4 %',mem:'112.5 MB'},
    {name:'DNS Server (dns.exe)',pid:912,cpu:'0.1 %',mem:'34.8 MB'},
    {name:'Local Security Authority (lsass.exe)',pid:512,cpu:'0.1 %',mem:'28.1 MB'},
    {name:'Service Host: Local System (svchost.exe)',pid:728,cpu:'0.3 %',mem:'65.4 MB'},
    {name:'Windows Explorer (explorer.exe)',pid:1840,cpu:'0.1 %',mem:'52.0 MB'},
    {name:'Windows PowerShell (powershell.exe)',pid:2180,cpu:'0.0 %',mem:'41.3 MB'}
  ];

  return `
    <div class="taskmgr-page">
      <nav class="property-tabs">
        ${['processes','performance','services'].map(t=>`
          <button type="button" class="${taskmgrTab===t?'active':''}" data-action="os-taskmgr-tab" data-tab="${t}">
            ${t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        `).join('')}
      </nav>
      ${taskmgrTab==='processes'?`
        <table class="win-table">
          <thead><tr><th>Process Name</th><th>PID</th><th>CPU</th><th>Memory</th></tr></thead>
          <tbody>
            ${procs.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${p.pid}</td><td>${p.cpu}</td><td>${p.mem}</td></tr>`).join('')}
          </tbody>
        </table>
      `:taskmgrTab==='performance'?`
        <div class="perf-layout">
          <div class="perf-stat"><h3>CPU</h3><div class="perf-value">2 % <small>2.40 GHz</small></div><p>4 Virtual Processors · 64-bit</p></div>
          <div class="perf-stat"><h3>Memory</h3><div class="perf-value">1.8 / 8.0 GB <small>(22 %)</small></div><p>Speed: DDR4 · In use: 1,840 MB</p></div>
          <div class="perf-stat"><h3>Ethernet</h3><div class="perf-value">${s.ethernet?'1 Gbps':'Disconnected'}</div><p>IPv4: ${s.ethernet?esc(s.network.ip):'Unplugged'}</p></div>
        </div>
      `:`
        <table class="win-table">
          <thead><tr><th>Name</th><th>PID</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            ${(s.services||[]).map((svc,i)=>`<tr><td>${esc(svc.name)}</td><td>${svc.status==='Running'?1000+i*84:'—'}</td><td>${esc(svc.displayName)}</td><td><b class="${svc.status==='Running'?'green-text':'red-text'}">${esc(svc.status)}</b></td></tr>`).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function services(){
  const s=get();
  s.verifiedChecks.monitor_svc=true;
  return `
    <div class="services-console">
      <div class="classic-menu"><button data-action="os-refresh">Refresh</button></div>
      <div class="services-layout">
        <aside class="services-sidebar">
          <h3>Services (Local)</h3>
          <p>Select a service to view its description and current status.</p>
        </aside>
        <main class="services-main">
          <table class="win-table">
            <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Startup Type</th></tr></thead>
            <tbody>
              ${(s.services||[]).map(svc=>`
                <tr>
                  <td><b>${esc(svc.displayName)}</b></td>
                  <td>${esc(svc.name)}</td>
                  <td><b class="${svc.status==='Running'?'green-text':'red-text'}">${esc(svc.status)}</b></td>
                  <td>${esc(svc.startup||'Automatic')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  `;
}

function mstsc(){
  const s=get();
  if(rdpSessionOpen){
    s.verifiedChecks.rdp_tested=true;
    return `
      <div class="rdp-session">
        <div class="rdp-bar">
          <span>🖥 192.168.1.10 - Remote Desktop Connection</span>
          <button type="button" class="win-btn b-btn" data-action="os-rdp-disconnect">Disconnect</button>
        </div>
        <div class="rdp-screen-preview">
          <h3>Connected to ${esc(s.computerName)} via RDP</h3>
          <p>User: Administrator &nbsp;·&nbsp; Encryption: CredSSP (NLA) &nbsp;·&nbsp; Speed: Local LAN</p>
          <div class="rdp-box">✓ Active RDP session authenticated. Remote Desktop management verified.</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="mstsc-dialog">
      <h2>Remote Desktop Connection</h2>
      <form id="sim-form" data-form="mstsc-connect" class="mstsc-form">
        ${field('Computer:','computer','192.168.1.10','text','required')}
        ${field('User name:','username','Administrator','text','required')}
        <p class="form-help">You will be asked for credentials when you connect.</p>
        <div class="win-footer">
          ${submit('Connect')}
          ${btn('Cancel','close','data-id="mstsc"')}
        </div>
      </form>
    </div>
  `;
}

function control(){
  const s = get();
  return `
    <div class="control-panel-app">
      <div class="cpl-header">
        <div class="cpl-nav-bar">
          <button type="button" class="win-btn b-btn cpl-nav-btn" data-action="os-cpl-home" title="Back">←</button>
          <button type="button" class="win-btn b-btn cpl-nav-btn" title="Forward" disabled>→</button>
          <button type="button" class="win-btn b-btn cpl-nav-btn" data-action="os-cpl-home" title="Up">↑</button>
          <div class="cpl-breadcrumb">
            <span class="cpl-crumb-icon">${icon('settings')}</span>
            <span class="cpl-crumb-seg" data-action="os-cpl-home">Control Panel</span>
            <span class="cpl-crumb-sep">›</span>
            <span class="cpl-crumb-seg">All Control Panel Items</span>
          </div>
          <div class="cpl-search">
            <input type="text" placeholder="Search Control Panel" disabled>
            <span class="cpl-search-icon">🔍</span>
          </div>
        </div>
        <div class="cpl-view-by">
          <span class="cpl-view-title">Adjust your computer's settings</span>
          <span class="cpl-view-select">View by: <b>Category ▾</b></span>
        </div>
      </div>
      <div class="cpl-grid">
        <!-- 1. System and Security -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-security">${icon('shield')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title"><a href="#" data-action="os-open" data-app="system">System and Security</a></h3>
            <ul class="cpl-links">
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="system">Review your computer's status</button></li>
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="firewall">Check firewall status</button></li>
              <li><button type="button" class="cpl-link" data-action="os-show-sys-properties">View amount of RAM and processor speed</button></li>
              <li><button type="button" class="cpl-link" data-action="os-show-sys-properties" data-tab="Remote">Allow remote access</button></li>
              <li><button type="button" class="cpl-link" data-action="os-show-rename-computer">See the name of this computer</button></li>
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="manager">Administrative Tools</button></li>
            </ul>
          </div>
        </div>

        <!-- 2. Network and Internet -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-network">${icon('network')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title"><a href="#" data-action="os-open" data-app="network">Network and Internet</a></h3>
            <ul class="cpl-links">
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="network">View network status and tasks</button></li>
              <li><button type="button" class="cpl-link" data-action="os-show-ethernet-status">View network connections</button></li>
              <li><button type="button" class="cpl-link" data-action="os-show-ethernet-props">Change adapter settings</button></li>
            </ul>
          </div>
        </div>

        <!-- 3. Hardware -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-hardware">${icon('monitor')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title">Hardware</h3>
            <ul class="cpl-links">
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="system">Device Manager</button></li>
              <li><span class="cpl-disabled-link">Devices and Printers</span></li>
            </ul>
          </div>
        </div>

        <!-- 4. Programs -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-programs">${icon('disk')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title">Programs</h3>
            <ul class="cpl-links">
              <li><button type="button" class="cpl-link" data-action="os-roles">Turn Windows features on or off</button></li>
              <li><span class="cpl-disabled-link">Uninstall a program</span></li>
            </ul>
          </div>
        </div>

        <!-- 5. User Accounts -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-users">${icon('user')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title"><a href="#" data-action="os-open" data-app="aduc">User Accounts</a></h3>
            <ul class="cpl-links">
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="aduc">Change account type</button></li>
              <li><button type="button" class="cpl-link" data-action="os-open" data-app="aduc">Manage Active Directory users</button></li>
            </ul>
          </div>
        </div>

        <!-- 6. Appearance and Personalization -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-appearance">${icon('windows')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title">Appearance and Personalization</h3>
            <ul class="cpl-links">
              <li><span class="cpl-disabled-link">Change the theme</span></li>
              <li><span class="cpl-disabled-link">Adjust screen resolution</span></li>
            </ul>
          </div>
        </div>

        <!-- 7. Clock, Language, and Region -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-clock">${icon('clock')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title">Clock, Language, and Region</h3>
            <ul class="cpl-links">
              <li><span class="cpl-disabled-link">Set the time and date</span></li>
              <li><span class="cpl-disabled-link">Change date, time, or number formats</span></li>
            </ul>
          </div>
        </div>

        <!-- 8. Ease of Access -->
        <div class="cpl-category">
          <div class="cpl-cat-icon cpl-icon-access">${icon('monitor')}</div>
          <div class="cpl-cat-details">
            <h3 class="cpl-cat-title">Ease of Access</h3>
            <ul class="cpl-links">
              <li><span class="cpl-disabled-link">Let Windows suggest settings</span></li>
              <li><span class="cpl-disabled-link">Optimize visual display</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderContext(){
  const c=context;
  let items=c.type==='desktop'?[['New ▸ Folder','new-folder','']]:
    c.type==='domain'?[['New ▸ Organizational Unit','new-ou',''],['New ▸ Group','new-group','']]:
    c.type==='ou'?[['New ▸ User','new-user',''],['New ▸ Group','new-group',''],['Properties','ou-properties',c.id],['Delete','delete-ou',c.id]]:
    c.type==='user'?[['Properties','user-properties',c.id],['Delete','delete-user',c.id]]:
    c.type==='group'?[['Properties','group-properties',c.id],['Delete','delete-group',c.id]]:
    [['Open','folder-open',c.id],['Rename','rename-folder',c.id],['Delete','delete-folder',c.id],['Properties','properties',c.id]];
  return `<div class="context-menu" style="left:${c.x}px;top:${c.y}px">${items.map(([label,a,id])=>`<button data-action="os-${a}" data-id="${id}">${label}</button>`).join('')}</div>`;
}

const roleSteps=['Before you begin','Installation Type','Server Selection','Server Roles','Features','Confirmation','Results'];
const domainSteps=['Deployment Configuration','Domain Controller Options','DNS Options','Additional Options','Paths','Review Options','Prerequisites Check','Results'];

function renderWizard(){
  const w=wizard;let title='',body='',footer='',steps=null;
  if(w.type==='roles'){
    title='Add Roles and Features Wizard';steps=roleSteps;const step=w.step;
    body=step===0?`<h2>Before you begin</h2><p>This wizard helps you install roles, role services, and features.</p><p>Before you continue, verify that the Administrator account has a strong password and that network settings are configured.</p>`:
      step===1?`<h2>Select installation type</h2><label class="win-check"><input type="radio" name="type" checked>Role-based or feature-based installation</label><p class="form-help">Configure this server by adding roles, role services, and features.</p>`:
      step===2?`<h2>Select destination server</h2><p>Select a server from the server pool.</p><table class="win-table"><thead><tr><th>Name</th><th>IP Address</th><th>Operating System</th></tr></thead><tbody><tr class="selected"><td>${esc(get().computerName)}</td><td>${get().ethernet?esc(get().network.ip):'Disconnected'}</td><td>Windows Server 2012 R2</td></tr></tbody></table>`:
      step===3?`<h2>Select server roles</h2><p>Select the roles to install on the selected server.</p>${check('Active Directory Domain Services','adds',!!w.data.adds)}${check('DHCP Server','dhcp',!!w.data.dhcp)}${check('DNS Server','dns',!!w.data.dns)}<p class="feature-note">Required management features: Group Policy Management and AD DS administration tools will be included.</p>`:
      step===4?`<h2>Select features</h2>${check('Group Policy Management','gpm',true,'disabled')}${check('Remote Server Administration Tools','rsat',true,'disabled')}<p>The required Active Directory management tools will be installed.</p>`:
      step===5?`<h2>Confirm installation selections</h2><p>Destination server: ${esc(get().computerName)}</p><ul><li>Active Directory Domain Services</li><li>Group Policy Management</li><li>AD DS and AD LDS Tools</li></ul><p>Role installation does not require a restart. You must promote this server after installation.</p>`:
      `<h2>${w.busy?'Feature installation':'Installation succeeded'}</h2>${w.busy?'<div class="install-progress indeterminate"><div></div></div><p>Installing Active Directory Domain Services…</p>':'<p class="success-text">✓ Active Directory Domain Services installed successfully.</p><p>Configuration is required. Promote this server to a domain controller.</p>'+btn('Promote this server to a domain controller','promote')}`;
    footer=step===6?btn('Close','wizard-close',w.busy?'disabled':''):`${step?btn('< Previous','wizard-back'):''}${submit(step===5?'Install':'Next >')}${btn('Cancel','wizard-close')}`;
  }else if(w.type==='promote'){
    title='Active Directory Domain Services Configuration Wizard';steps=domainSteps;const d=w.data;
    body=w.step===0?`<h2>Deployment Configuration</h2><p>Select the deployment operation</p><label class="win-check"><input type="radio" checked>Add a new forest</label>${field('Root domain name:','domain',d.domain||'','text','placeholder="e.g. css.com" required')}<p class="form-help">Use a fully qualified domain name with at least two labels.</p>`:
      w.step===1?`<h2>Domain Controller Options</h2><p>Select functional levels of the new forest and root domain.</p>${select('Forest functional level:','forest',['Windows Server 2012 R2','Windows Server 2012','Windows Server 2008 R2'],d.forest||'Windows Server 2012 R2')}${select('Domain functional level:','level',['Windows Server 2012 R2','Windows Server 2012','Windows Server 2008 R2'],d.level||'Windows Server 2012 R2')}${check('Domain Name System (DNS) server','dns',true,'disabled')}${check('Global Catalog (GC)','gc',true,'disabled')}<h3>Directory Services Restore Mode (DSRM) password</h3>${d.dsrmSet?'<p class="success-text">✓ DSRM password validated. Leave blank to keep it.</p>':''}${field('Password:','password','','password',`${d.dsrmSet?'':'required'} autocomplete="new-password"`)}${field('Confirm password:','confirm','','password',`${d.dsrmSet?'':'required'} autocomplete="new-password"`)}`:
      w.step===2?`<h2>DNS Options</h2><p>⚠ A delegation for this DNS server cannot be created because the authoritative parent zone cannot be found.</p><p class="form-help">This is expected when creating a new forest in this isolated lab. Continue to the next page.</p>${check('Create DNS delegation','delegation',false,'disabled')}`:
      w.step===3?`<h2>Additional Options</h2><p>Verify the NetBIOS name assigned to the domain.</p>${field('NetBIOS domain name:','netbios',d.netbios||d.domain.split('.')[0].toUpperCase().slice(0,15),'text','maxlength="15" required')}`:
      w.step===4?`<h2>Paths</h2><p>Specify the location of the AD DS database, log files, and SYSVOL.</p>${field('Database folder:','database',d.database||'C:\\Windows\\NTDS')}${field('Log files folder:','logs',d.logs||'C:\\Windows\\NTDS')}${field('SYSVOL folder:','sysvol',d.sysvol||'C:\\Windows\\SYSVOL')}`:
      w.step===5?`<h2>Review Options</h2><p>Review your selections before installing Active Directory Domain Services.</p><div class="review-box">Create a new forest: <b>${esc(d.domain)}</b><br>NetBIOS domain name: ${esc(d.netbios)}<br>Forest functional level: ${esc(d.forest)}<br>Domain functional level: ${esc(d.level)}<br>DNS server: Yes · Global Catalog: Yes<br>Database: ${esc(d.database)}<br>SYSVOL: ${esc(d.sysvol)}</div>`:
      w.step===6?`<h2>Prerequisites Check</h2><p class="${get().ethernet?'success-text':'form-error'}">${get().ethernet?'✓ All prerequisite checks passed successfully.':'× Ethernet is disconnected. Connect the cable before installation.'}</p>${get().network.dhcp?'<p>⚠ This adapter uses DHCP. A static IP is recommended for a domain controller; this training lab also supports DHCP.</p>':''}<p>The server will need to restart after Active Directory Domain Services is installed.</p>`:
      `<h2>${w.busy?'Installation':'Results'}</h2>${w.busy?'<div class="install-progress indeterminate"><div></div></div><p>Configuring Active Directory Domain Services and DNS…</p>':`<p class="success-text">✓ This server was successfully configured as a domain controller.</p><p>Domain: ${esc(get().domain)}</p><p>Restart to complete configuration.</p>`}`;
    footer=w.step===7?(w.busy?'':btn('Restart now','restart')+btn('Close','wizard-close')):`${w.step?btn('< Previous','wizard-back'):''}${submit(w.step===6?'Install':'Next >')}${btn('Cancel','wizard-close')}`;
  }else if(w.type==='more'){
    title='All Servers Task Details';body=`<h2>Post-deployment Configuration</h2><p>Configuration required for Active Directory Domain Services on ${esc(get().computerName)}.</p>${btn('Promote this server to a domain controller','promote')}`;footer=btn('Close','wizard-close');
  }else if(w.type==='ou'){
    title='New Object – Organizational Unit';body=`<p>Create in: ${esc(get().domain)}</p>${field('Name:','name',w.data.name||'','text','required maxlength="64"')}${check('Protect container from accidental deletion','protected',w.data.protected??true)}`;footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='ou-properties'){
    title=esc(w.data.name)+' Properties';body=`${field('Name:','name',w.data.name,'text','required maxlength="64"')}${check('Protect container from accidental deletion','protected',w.data.protected)}<p>Object class: Organizational Unit</p>`;footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='user'){
    title='New Object – User';const d=w.data;const ou=get().ous.find(o=>o.id===d.ou);
    body=w.step===0?`<p>Create in: ${esc(get().domain)}/${esc(ou?.name)}</p>${field('First name:','first',d.first||'')}${field('Last name:','last',d.last||'')}${field('Full name:','name',d.name||'','text','required maxlength="64"')}${field('User logon name:','logon',d.logon||'','text','required maxlength="20"')}<p class="form-help">@${esc(get().domain)}</p>`:
      w.step===1?`${field('Password:','password','','password',`${d.passwordSet?'':'required'} autocomplete="new-password"`)}${field('Confirm password:','confirm','','password',`${d.passwordSet?'':'required'} autocomplete="new-password"`)}${check('User must change password at next logon','mustChange',d.mustChange??true)}${check('Password never expires','neverExpires',d.neverExpires??false)}<p class="form-help">Use a fictional password with at least 8 characters and 3 character types.</p>`:
      `<p>You are about to create the following user:</p><div class="review-box">Full name: ${esc(d.name)}<br>User logon name: ${esc(d.logon)}@${esc(get().domain)}<br>Organizational unit: ${esc(ou?.name)}<br>${d.mustChange?'User must change password at next logon':'User is not required to change password'}<br>${d.neverExpires?'Password never expires':'Password expiration enabled'}</div>`;
    footer=(w.step?btn('< Back','wizard-back'):'')+submit(w.step===2?'Finish':'Next >')+btn('Cancel','wizard-close');
  }else if(w.type==='user-properties'){
    title=esc(w.data.name)+' Properties';body=`${field('Full name:','name',w.data.name,'text','required')}${field('User logon name:','logon',w.data.logon,'text','required maxlength="20"')}${check('User must change password at next logon','mustChange',w.data.mustChange)}${check('Password never expires','neverExpires',w.data.neverExpires)}<p>Member of: Domain Users</p>`;footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='group'){
    title='New Object – Group';
    body=`<p>Create in: ${esc(get().domain)}</p>
      ${field('Group name:','name',w.data.name||'','text','required maxlength="64"')}
      <h3>Group scope</h3>
      <label class="win-check"><input type="radio" name="scope" value="Domain local"> Domain local</label>
      <label class="win-check"><input type="radio" name="scope" value="Global" checked> Global</label>
      <label class="win-check"><input type="radio" name="scope" value="Universal"> Universal</label>
      <h3>Group type</h3>
      <label class="win-check"><input type="radio" name="type" value="Security" checked> Security</label>
      <label class="win-check"><input type="radio" name="type" value="Distribution"> Distribution</label>`;
    footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='group-properties'){
    const g=w.data;
    title=esc(g.name)+' Properties';
    body=`<nav class="property-tabs">
        <button type="button" class="${(w.tab||'General')==='General'?'active':''}" data-action="os-property-tab" data-tab="General">General</button>
        <button type="button" class="${w.tab==='Members'?'active':''}" data-action="os-property-tab" data-tab="Members">Members</button>
      </nav>
      ${(w.tab||'General')==='General'?`
        ${field('Group name:','name',g.name,'text','disabled')}
        <p>Group scope: <b>${esc(g.scope||'Global')}</b></p>
        <p>Group type: <b>${esc(g.type||'Security')}</b></p>
      `:`
        <h3>Members</h3>
        <table class="win-table">
          <thead><tr><th>Name</th><th>Folder / OU</th></tr></thead>
          <tbody>
            ${(g.members||[]).map(m=>`<tr><td>${icon('user')} ${esc(m)}</td><td>${esc(get().domain)}</td></tr>`).join('')}
          </tbody>
        </table>
        ${!(g.members||[]).length?'<p class="empty-list">No members in this group. Click Add Member below.</p>':''}
        <div style="margin-top:10px;">
          ${btn('Add Member…','add-group-member',`data-id="${g.id}"`)}
        </div>
      `}`;
    footer=btn('OK','wizard-close');
  }else if(w.type==='add-member'){
    const g=w.data;
    title='Select Users – '+esc(g.name);
    body=`<p>Select a user from this domain to add to <b>${esc(g.name)}</b>:</p>
      <select name="memberLogon" style="width:100%;padding:8px;">
        ${get().users.map(u=>`<option value="${esc(u.logon)}">${esc(u.name)} (${esc(u.logon)})</option>`).join('')}
      </select>`;
    footer=submit('Add')+btn('Cancel','wizard-close');
  }else if(w.type==='folder'||w.type==='rename-folder'){
    title=w.type==='folder'?'New Folder':'Rename Folder';body=field('Folder name:','name',w.data.name||'','text','required maxlength="80"');footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='properties'){
    const f=get().folders.find(f=>f.id===w.data.id);title=esc(f.name)+' Properties';
    body=`<nav class="property-tabs">${['General','Sharing','Security'].map(t=>`<button type="button" class="${w.tab===t?'active':''}" data-action="os-property-tab" data-tab="${t}">${t}</button>`).join('')}</nav>${w.tab==='General'?`<div class="folder-property-name">${icon('folder')}<b>${esc(f.name)}</b></div><hr><p>Type: File folder</p><p>Location: C:\\Users\\Administrator\\Desktop</p><p>Size: 0 bytes</p><p>Contains: 0 files, 0 folders</p>`:w.tab==='Sharing'?`<h3>Network File and Folder Sharing</h3><p>${icon('folder')} ${esc(f.name)}</p><p>${f.shared?'Shared':'Not shared'}</p><p>Network Path: <b>${f.shared?'\\\\'+esc(get().computerName)+'\\'+esc(f.shareName||f.name):'Not Shared'}</b></p><hr><h3>Advanced Sharing</h3><p>Set custom permissions and share options.</p>${btn('Advanced Sharing…','advanced-sharing')}`:`<p>Object name: C:\\Users\\Administrator\\Desktop\\${esc(f.name)}</p><p>Group or user names:</p><div class="principal-list">SYSTEM<br>Administrators (${esc(get().computerName)}\\Administrators)<br>Users (${esc(get().computerName)}\\Users)</div><p>Permissions for Users</p><table class="win-table permission-table"><thead><tr><th>NTFS permissions</th><th>Allow</th></tr></thead><tbody>${['Full control','Modify','Read & execute','List folder contents','Read','Write'].map((t,i)=>`<tr><td>${t}</td><td>${i>=2&&i<=4?'✓':'—'}</td></tr>`).join('')}</tbody></table><p class="form-help">NTFS permissions and share permissions are separate. Your mission ends at this Security tab.</p>`}`;
    footer=btn('OK','wizard-close')+btn('Cancel','wizard-close');
  }else if(w.type==='sharing'){
    title='Advanced Sharing';body=`${check('Share this folder','shared',w.data.shared)}${field('Share name:','shareName',w.data.shareName||w.data.name,'text','required maxlength="80"')}<p>Limit the number of simultaneous users to: <b>16777216</b></p><p>Comments:</p><textarea name="comments" rows="2">${esc(w.data.comments||'')}</textarea><p>To specify permissions for users who access this folder over the network, click Permissions.</p>${btn('Permissions','permissions')}<p class="form-help">Current share permission for Everyone: ${w.data.fullControl?'Full Control':'Read'}</p>`;footer=submit('OK')+btn('Cancel','properties-return');
  }else if(w.type==='permissions'){
    title='Permissions for '+esc(w.data.shareName||w.data.name);body=`<p>Group or user names:</p><div class="principal-list selected">${icon('user')} Everyone</div><p>Permissions for Everyone</p><table class="win-table permission-table"><thead><tr><th></th><th>Allow</th><th>Deny</th></tr></thead><tbody><tr><td>Full Control</td><td><input aria-label="Allow Full Control" type="checkbox" name="fullControl" ${(w.data.allowFull??w.data.fullControl)?'checked':''}></td><td><input aria-label="Deny Full Control" type="checkbox" name="denyFull" ${w.data.denyFull?'checked':''}></td></tr><tr><td>Change</td><td><input aria-label="Allow Change" type="checkbox" name="change" ${(w.data.allowChange??(w.data.fullControl||w.data.change))?'checked':''}></td><td><input aria-label="Deny Change" type="checkbox" name="denyChange" ${w.data.denyChange?'checked':''}></td></tr><tr><td>Read</td><td><input aria-label="Allow Read" type="checkbox" name="read" ${(w.data.allowRead??w.data.read!==false)?'checked':''}></td><td><input aria-label="Deny Read" type="checkbox" name="denyRead" ${w.data.denyRead?'checked':''}></td></tr></tbody></table><p class="form-help">Deny takes precedence over Allow for the same permission.</p>`;footer=submit('OK')+btn('Cancel','sharing-return');
  }else if(w.type==='ipv4'){
    title='Internet Protocol Version 4 (TCP/IPv4) Properties';
    body=`
      <div class="cpl-dialog-body ipv4-dialog">
        <p style="margin:0 0 10px;font-size:11px;">You can get IP settings assigned automatically if your network supports this capability. Otherwise, you need to ask your network administrator for the appropriate IP settings.</p>
        <div class="ipv4-group">
          <label class="win-check"><input type="radio" name="assignment" value="dhcp" ${get().network.dhcp?'checked':''}> Obtain an IP address automatically</label>
          <label class="win-check"><input type="radio" name="assignment" value="static" ${get().network.dhcp?'':'checked'}> Use the following IP address:</label>
          <div style="padding-left:18px;">
            ${field('IP address:','ip',get().network.ip)}
            ${field('Subnet mask:','mask',get().network.mask)}
            ${field('Default gateway:','gateway',get().network.gateway)}
          </div>
        </div>
        <hr style="border:0;border-top:1px solid #dcdcdc;margin:12px 0;">
        <div class="ipv4-group">
          <label class="win-check"><input type="radio" name="dns_assignment" value="auto" ${get().network.dhcp?'checked':''} disabled> Obtain DNS server address automatically</label>
          <label class="win-check"><input type="radio" name="dns_assignment" value="manual" ${get().network.dhcp?'':'checked'} disabled> Use the following DNS server addresses:</label>
          <div style="padding-left:18px;">
            ${field('Preferred DNS server:','dns',get().network.dns)}
            ${field('Alternate DNS server:','alt_dns','','text','placeholder="8.8.8.8" disabled')}
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button type="button" class="win-btn" disabled>Advanced...</button>
        </div>
      </div>
    `;
    footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='ethernet-status'){
    const s = get();
    title = 'Ethernet Status';
    body = `
      <div class="cpl-dialog-body ethernet-status-dialog">
        <fieldset class="cpl-fieldset">
          <legend>Connection</legend>
          <table class="win-table dialog-table">
            <tr><td width="150">IPv4 Connectivity:</td><td><b>${s.ethernet ? 'Internet' : 'No network access'}</b></td></tr>
            <tr><td>IPv6 Connectivity:</td><td>No network access</td></tr>
            <tr><td>Media State:</td><td><b class="${s.ethernet ? 'green-text' : 'red-text'}">${s.ethernet ? 'Enabled' : 'Disconnected'}</b></td></tr>
            <tr><td>Duration:</td><td>02:45:12</td></tr>
            <tr><td>Speed:</td><td><b>1.0 Gbps</b></td></tr>
          </table>
        </fieldset>
        <fieldset class="cpl-fieldset">
          <legend>Activity</legend>
          <table class="win-table dialog-table">
            <thead><tr><th></th><th>Sent</th><th>Received</th></tr></thead>
            <tbody>
              <tr><td>Bytes:</td><td>142,504</td><td>984,120</td></tr>
            </tbody>
          </table>
        </fieldset>
        <div class="status-actions-row">
          <button type="button" class="win-btn primary" data-action="os-show-ethernet-props">Properties</button>
          <button type="button" class="win-btn" data-action="os-toggle-ethernet">${s.ethernet ? 'Disable' : 'Enable'}</button>
          <button type="button" class="win-btn" data-action="os-diagnose-net">Diagnose</button>
        </div>
      </div>
    `;
    footer = btn('Close', 'wizard-close');
  }else if(w.type==='ethernet-props'){
    const s = get();
    title = 'Ethernet Properties';
    body = `
      <div class="cpl-dialog-body ethernet-props-dialog">
        <nav class="property-tabs">
          <button type="button" class="active">Networking</button>
          <button type="button" disabled>Sharing</button>
        </nav>
        <div class="adapter-connect-row">
          <span>Connect using:</span>
          <b>Intel(R) 82574L Gigabit Network Connection</b>
          <button type="button" class="win-btn sm" disabled>Configure...</button>
        </div>
        <p style="margin:8px 0 4px;font-size:11px;">This connection uses the following items:</p>
        <div class="adapter-items-list">
          <label class="adapter-item"><input type="checkbox" checked disabled> Client for Microsoft Networks</label>
          <label class="adapter-item"><input type="checkbox" checked disabled> File and Printer Sharing for Microsoft Networks</label>
          <label class="adapter-item"><input type="checkbox" checked disabled> QoS Packet Scheduler</label>
          <label class="adapter-item selected-item" data-action="os-show-ipv4"><input type="checkbox" checked> <b>Internet Protocol Version 4 (TCP/IPv4)</b></label>
          <label class="adapter-item"><input type="checkbox" checked disabled> Microsoft Network Adapter Multiplexor Protocol</label>
          <label class="adapter-item"><input type="checkbox" checked disabled> Microsoft LLDP Protocol Driver</label>
          <label class="adapter-item"><input type="checkbox" checked disabled> Internet Protocol Version 6 (TCP/IPv6)</label>
          <label class="adapter-item"><input type="checkbox" checked disabled> Link-Layer Topology Discovery Responder</label>
        </div>
        <div class="adapter-desc-box">
          <p><b>Description:</b> Transmission Control Protocol/Internet Protocol. The default wide area network protocol that provides communication across diverse interconnected networks.</p>
        </div>
        <div class="adapter-actions-row">
          <button type="button" class="win-btn" disabled>Install...</button>
          <button type="button" class="win-btn" disabled>Uninstall</button>
          <button type="button" class="win-btn primary" data-action="os-show-ipv4">Properties</button>
        </div>
      </div>
    `;
    footer = btn('OK', 'wizard-close') + btn('Cancel', 'wizard-close');
  }else if(w.type==='sys-properties'){
    const s = get();
    title = 'System Properties';
    const activeTab = w.tab || 'Computer Name';
    body = `
      <nav class="property-tabs">
        <button type="button" class="${activeTab==='Computer Name'?'active':''}" data-action="os-property-tab" data-tab="Computer Name">Computer Name</button>
        <button type="button" class="${activeTab==='Hardware'?'active':''}" data-action="os-property-tab" data-tab="Hardware">Hardware</button>
        <button type="button" class="${activeTab==='Advanced'?'active':''}" data-action="os-property-tab" data-tab="Advanced">Advanced</button>
        <button type="button" class="${activeTab==='System Protection'?'active':''}" data-action="os-property-tab" data-tab="System Protection">System Protection</button>
        <button type="button" class="${activeTab==='Remote'?'active':''}" data-action="os-property-tab" data-tab="Remote">Remote</button>
      </nav>
      ${activeTab==='Computer Name'?`
        <div class="cpl-dialog-body">
          <p>Windows uses the following information to identify your computer on the network.</p>
          <dl class="sys-dl">
            <dt>Computer description:</dt><dd>Domain Server and Infrastructure Host</dd>
            <dt>Full computer name:</dt><dd><b>${esc(s.computerName)}${s.domain?'.'+esc(s.domain):''}</b></dd>
            <dt>Domain / Workgroup:</dt><dd><b>${esc(s.domain||'WORKGROUP')}</b></dd>
          </dl>
          <div class="sys-rename-box">
            <p>To rename this computer or change its domain or workgroup, click Change.</p>
            <div style="display:flex;gap:8px;">
              <button type="button" class="win-btn" disabled title="Use Server Manager to promote this server">Network ID...</button>
              <button type="button" class="win-btn" data-action="os-show-rename-computer">Change…</button>
            </div>
          </div>
        </div>
      `:activeTab==='Hardware'?`
        <div class="cpl-dialog-body">
          <h4>Device Manager</h4>
          <p>The Device Manager lists all the hardware devices installed on your computer.</p>
          <button type="button" class="win-btn" data-action="os-open" data-app="system">Device Manager...</button>
          <hr style="border:0;border-top:1px solid #dcdcdc;margin:16px 0;">
          <h4>Device Installation Settings</h4>
          <p>Choose whether Windows should download manufacturer apps and custom icons for your devices.</p>
          <button type="button" class="win-btn" disabled>Device Installation Settings</button>
        </div>
      `:activeTab==='Advanced'?`
        <div class="cpl-dialog-body">
          <p style="font-size:11px;color:#555;">You must be logged on as an Administrator to make most of these changes.</p>
          <div class="sys-advanced-group">
            <h4>Performance</h4>
            <p>Visual effects, processor scheduling, memory usage, and virtual memory</p>
            <button type="button" class="win-btn sm" disabled>Settings...</button>
          </div>
          <div class="sys-advanced-group">
            <h4>User Profiles</h4>
            <p>Desktop settings related to your sign-in</p>
            <button type="button" class="win-btn sm" disabled>Settings...</button>
          </div>
          <div class="sys-advanced-group">
            <h4>Startup and Recovery</h4>
            <p>System startup, system failure, and debugging information</p>
            <button type="button" class="win-btn sm" disabled>Settings...</button>
          </div>
          <div style="margin-top:12px;">
            <button type="button" class="win-btn" disabled>Environment Variables...</button>
          </div>
        </div>
      `:activeTab==='System Protection'?`
        <div class="cpl-dialog-body">
          <h4>System Protection</h4>
          <p>You can use system protection to undo unwanted system changes.</p>
          <p style="color:#666;font-size:11px;">System restore points and shadow copies are managed by Windows Server Backup in this edition.</p>
        </div>
      `:activeTab==='Remote'?`
        <div class="cpl-dialog-body">
          <h4>Remote Assistance</h4>
          <label class="win-check"><input type="checkbox" checked disabled> Allow Remote Assistance connections to this computer</label>
          <hr style="border:0;border-top:1px solid #dcdcdc;margin:14px 0;">
          <h4>Remote Desktop</h4>
          <p>Choose an option, and then specify who can connect.</p>
          <div class="rdp-options-group">
            ${(()=>{
              const rdpActive = w.data?.rdp_enable !== undefined ? (w.data.rdp_enable === 'true' || w.data.rdp_enable === true) : !!s.remoteDesktop?.enabled;
              const nlaActive = w.data?.nla !== undefined ? (w.data.nla === true || w.data.nla === 'on') : (s.remoteDesktop?.nla !== false);
              return `
                <label class="win-check">
                  <input type="radio" name="rdp_enable" value="false" ${rdpActive ? '' : 'checked'}>
                  Don't allow remote connections to this computer
                </label>
                <label class="win-check">
                  <input type="radio" name="rdp_enable" value="true" ${rdpActive ? 'checked' : ''}>
                  Allow remote connections to this computer
                </label>
                <div style="margin-left:22px;margin-top:6px;">
                  <label class="win-check">
                    <input type="checkbox" name="nla" ${nlaActive ? 'checked' : ''}>
                    Allow connections only from computers running Remote Desktop with Network Level Authentication (recommended)
                  </label>
                </div>
              `;
            })()}
            <div style="margin-top:12px;margin-left:22px;">
              <button type="button" class="win-btn" disabled>Select Users...</button>
            </div>
          </div>
        </div>
      `:''}
    `;
    footer = submit('OK') + btn('Cancel', 'wizard-close') + btn('Apply', 'apply-sys-properties');
  }else if(w.type==='rename-computer'){
    title='Computer Name/Domain Changes';
    body=`
      <div class="cpl-dialog-body rename-dialog">
        <p style="font-size:11px;margin:0 0 10px;">You can change the name and the membership of this computer. Changes might affect access to network resources.</p>
        ${field('Computer name:','name',get().computerName,'text','required maxlength="15"')}
        <fieldset class="cpl-fieldset" style="margin-top:14px;">
          <legend>Member of</legend>
          <label class="win-check"><input type="radio" name="member_of" value="domain" ${get().domain?'checked':''} disabled> Domain: <b>${esc(get().domain||'Not domain joined')}</b></label>
          <label class="win-check"><input type="radio" name="member_of" value="workgroup" ${get().domain?'':'checked'} disabled> Workgroup: <b>WORKGROUP</b></label>
        </fieldset>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button type="button" class="win-btn" disabled>More...</button>
        </div>
      </div>
    `;
    footer=submit('OK')+btn('Cancel','wizard-close');
  }else if(w.type==='delete'){
    const {kind,id,name}=w.data;title='Confirm deletion';body=`<p>Delete <b>${esc(w.data.name)}</b> from the simulated server?</p><p>${w.data.kind==='ou'?'Any users in this organizational unit will also be deleted.':'This changes your mission progress.'}</p>`;footer=submit('Delete')+btn('Cancel','wizard-close');
  }
  return `<div class="os-modal-shade"><section class="os-dialog ${steps?'wide':''}" role="dialog" aria-modal="true" aria-label="${title}"><div class="win-titlebar"><span>${icon('server')} ${title}</span><button class="close" data-action="os-wizard-close" aria-label="Close dialog" ${w.busy?'disabled':''}>×</button></div><form id="sim-form" data-form="wizard"><div class="wizard-body">${steps?`<nav class="wizard-steps">${steps.map((s,i)=>`<div class="${w.step===i?'current':''} ${w.step>i?'passed':''}">${esc(s)}</div>`).join('')}</nav>`:''}<main>${body}<div class="form-error" id="form-error" role="alert"></div></main></div><div class="win-footer">${footer}</div></form></section></div>`;
}

function error(message){const e=document.querySelector('#form-error');if(e)e.textContent=message;else toast(message);}
function data(){const f=document.querySelector('#sim-form');return f?Object.fromEntries(new FormData(f)):{};}

function show(type,d={},step=0,tab='General'){
  wizard={type,data:{...d},step,tab};
  menu=context=null;
  render();
  later(()=>document.querySelector('#sim-form input:not([disabled]):not([type=checkbox]):not([type=radio])')?.focus(),30);
}

function passwordCheck(d,existing=false){
  if(existing&&!d.password&&!d.confirm)return true;
  if(d.password!==d.confirm){error('The passwords do not match. Please reenter them.');return false;}
  if(!validPassword(d.password||'')){error('Use at least 8 characters and 3 of: uppercase, lowercase, numbers, symbols.');return false;}
  return true;
}

function addFolder(name){
  if(!name.trim()||/[\\/:*?"<>|]/.test(name)||/[. ]$/.test(name)){error('Enter a valid folder name without \\ / : * ? " < > | or a trailing dot.');return false;}
  if(get().folders.some(f=>f.name.toLowerCase()===name.trim().toLowerCase())){error('A folder with that name already exists.');return false;}
  commit({folders:[...get().folders,{id:crypto.randomUUID(),name:name.trim(),shared:false,fullControl:false,securityVisited:false}]},'Created folder '+name.trim()+'.');
  return true;
}

function handleWizard(d){
  const w=wizard,s=get();if(!w||w.busy)return;
  if(w.type==='roles'){
    if(w.step===3&&!d.adds){error('Select Active Directory Domain Services to continue this mission.');return;}
    if(w.step===3)w.data.adds=true;
    if(w.step===5){
      w.step=6;w.busy=true;render();
      later(()=>{
        if(wizard!==w)return;
        w.busy=false;
        commit({roles:[...new Set([...get().roles,'AD DS'])]},'Installed the Active Directory Domain Services role.');
      },1800);
      return;
    }
    w.step++;render();return;
  }
  if(w.type==='promote'){
    if(w.step===0){if(!validDomain(d.domain.trim())){error('Enter a valid root domain name, such as css.com.');return;}w.data.domain=d.domain.trim().toLowerCase();}
    if(w.step===1){if(d.forest!=='Windows Server 2012 R2'||d.level!=='Windows Server 2012 R2'){error('This assignment requires Windows Server 2012 R2 for both functional levels.');return;}if(!passwordCheck(d,w.data.dsrmSet))return;Object.assign(w.data,{forest:d.forest,level:d.level,dsrmSet:true});}
    if(w.step===3){if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,14}$/.test(d.netbios)){error('Use 1–15 letters, numbers, or hyphens for the NetBIOS name.');return;}w.data.netbios=d.netbios.toUpperCase();}
    if(w.step===4){if(!['database','logs','sysvol'].every(k=>/^[A-Za-z]:\\/.test(d[k]))){error('Use absolute local Windows paths, such as C:\\Windows\\NTDS.');return;}Object.assign(w.data,d);}
    if(w.step===6){if(!s.ethernet){error('Connect the Ethernet cable before promoting this server.');return;}w.step=7;w.busy=true;render();later(()=>{if(wizard!==w)return;w.busy=false;commit({roles:[...new Set([...get().roles,'DNS'])],domain:w.data.domain,netbios:w.data.netbios,promoted:true,restarted:false,functionalLevel:w.data.forest},'Promoted '+get().computerName+' into new forest '+w.data.domain+'.');},2200);return;}
    w.step++;render();return;
  }
  if(w.type==='ou'||w.type==='ou-properties'){
    const name=d.name.trim();if(!name||/[,=+<>#;"\\]/.test(name)){error('Enter an OU name without directory special characters.');return;}
    if(s.ous.some(o=>o.id!==w.data.id&&o.name.toLowerCase()===name.toLowerCase())){error('An organizational unit with that name already exists.');return;}
    const ou={id:w.data.id||crypto.randomUUID(),name,protected:!!d.protected};selectedOU=ou.id;wizard=null;
    commit({ous:w.type==='ou'?[...s.ous,ou]:s.ous.map(o=>o.id===ou.id?ou:o)},'Saved organizational unit '+name+'.');
    return;
  }
  if(w.type==='user'){
    if(!s.ous.some(o=>o.id===w.data.ou)){error('The selected organizational unit no longer exists. Close this dialog and select an OU.');return;}
    if(w.step===0){if(!d.name.trim()||!d.logon.trim()||/["/\\[\]:;|=,+*?<>@\s]/.test(d.logon)){error('Enter a full name and a logon name without spaces or special characters.');return;}if(s.users.some(u=>u.logon.toLowerCase()===d.logon.toLowerCase())){error('That user logon name already exists in this domain.');return;}Object.assign(w.data,{...d,name:d.name.trim(),logon:d.logon.trim()});}
    if(w.step===1){if(!passwordCheck(d,w.data.passwordSet))return;if(d.mustChange&&d.neverExpires){error('Clear User must change password before selecting Password never expires.');return;}Object.assign(w.data,{passwordSet:true,mustChange:!!d.mustChange,neverExpires:!!d.neverExpires});}
    if(w.step===2){const user={...w.data,id:crypto.randomUUID()};wizard=null;commit({users:[...s.users,user]},'Created domain user '+user.logon+'.');return;}
    w.step++;render();return;
  }
  if(w.type==='user-properties'){
    if(d.mustChange&&d.neverExpires){error('User must change password and Password never expires cannot both be selected.');return;}
    if(!d.name.trim()||!d.logon.trim()||/["/\\[\]:;|=,+*?<>@\s]/.test(d.logon)){error('Enter a valid name and logon name.');return;}
    if(s.users.some(u=>u.id!==w.data.id&&u.logon.toLowerCase()===d.logon.toLowerCase())){error('That logon name already exists.');return;}
    const id=w.data.id;wizard=null;
    commit({users:s.users.map(u=>u.id===id?{...u,name:d.name.trim(),logon:d.logon.trim(),mustChange:!!d.mustChange,neverExpires:!!d.neverExpires}:u)},'Updated domain user properties.');
    return;
  }
  if(w.type==='group'){
    const name=d.name?.trim();
    if(!name){error('Enter a group name.');return;}
    if((s.groups||[]).some(g=>g.name.toLowerCase()===name.toLowerCase())){error('A group with that name already exists.');return;}
    const grp={id:crypto.randomUUID(),name,ou:selectedOU,scope:d.scope||'Global',type:d.type||'Security',members:[]};
    wizard=null;
    commit({groups:[...(s.groups||[]),grp]},'Created AD Security Group '+name+'.');
    return;
  }
  if(w.type==='add-member'){
    const grpId=w.data.id;
    const memberLogon=d.memberLogon;
    if(!memberLogon){wizard=null;render();return;}
    const updated=(s.groups||[]).map(g=>g.id===grpId?{...g,members:[...new Set([...(g.members||[]),memberLogon])]}:g);
    wizard=null;
    commit({groups:updated},'Added '+memberLogon+' to group '+w.data.name+'.');
    return;
  }
  if(w.type==='folder'){if(addFolder(d.name)){wizard=null;render();}return;}
  if(w.type==='rename-folder'){
    const name=d.name.trim();if(!name||/[\\/:*?"<>|]/.test(name)||s.folders.some(f=>f.id!==w.data.id&&f.name.toLowerCase()===name.toLowerCase())){error('Enter a valid, unique folder name.');return;}
    const id=w.data.id;wizard=null;commit({folders:s.folders.map(f=>f.id===id?{...f,name}:f)},'Renamed folder to '+name+'.');return;
  }
  if(w.type==='sharing'){
    if(!d.shareName.trim()||/[\\/:*?"<>|]/.test(d.shareName)){error('Enter a valid share name.');return;}
    if(s.folders.some(f=>f.id!==w.data.id&&f.shared&&(f.shareName||f.name).toLowerCase()===d.shareName.trim().toLowerCase())){error('That share name is already in use.');return;}
    const f={...w.data,shared:!!d.shared,shareName:d.shareName.trim(),comments:d.comments};
    wizard={type:'properties',data:{id:f.id},tab:'Sharing',step:0};
    commit({folders:s.folders.map(o=>o.id===f.id?f:o)},'Updated sharing settings for '+f.name+'.');return;
  }
  if(w.type==='permissions'){
    Object.assign(w.data,{allowFull:!!d.fullControl,allowChange:!!d.change,allowRead:!!d.read,denyFull:!!d.denyFull,denyChange:!!d.denyChange,denyRead:!!d.denyRead,fullControl:!!d.fullControl&&!d.denyFull&&!d.denyRead&&!d.denyChange,change:(!!d.change||!!d.fullControl)&&!d.denyFull&&!d.denyChange,read:(!!d.read||!!d.fullControl)&&!d.denyFull&&!d.denyRead});
    w.type='sharing';render();return;
  }
  if(w.type==='ipv4'){
    if(!['ip','mask','gateway','dns'].every(k=>validIP(d[k]))){error('Enter valid IPv4 addresses, such as 192.168.1.10.');return;}
    wizard=null;commit({network:{...d,dhcp:d.assignment==='dhcp'}},'Updated IPv4 adapter settings.');return;
  }
  if(w.type==='sys-properties'){
    const rdpVal = d.rdp_enable !== undefined ? d.rdp_enable : w.data?.rdp_enable;
    if(rdpVal !== undefined){
      const isEnabled = rdpVal === 'true' || rdpVal === true;
      const isNla = (d.nla !== undefined ? d.nla === 'on' : (w.data?.nla === true || w.data?.nla === 'on' || get().remoteDesktop?.nla !== false));
      commit({
        remoteDesktop: {
          enabled: isEnabled,
          nla: isNla,
          allowedUsers: ['Administrator']
        }
      }, 'Updated Remote Desktop settings.');
      toast('System settings applied.');
    }
    wizard=null;render();return;
  }
  if(w.type==='rename-computer'){
    if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,14}$/.test(d.name)){error('Use 1–15 letters, numbers, or hyphens.');return;}
    wizard=null;commit({computerName:d.name.toUpperCase()},'Changed computer name.');return;
  }
  if(w.type==='delete'){
    const {kind,id,name}=w.data;wizard=null;
    if(kind==='folder')commit({folders:s.folders.filter(f=>f.id!==id)},'Deleted folder '+name+'.');
    if(kind==='user')commit({users:s.users.filter(u=>u.id!==id)},'Deleted user '+name+'.');
    if(kind==='group')commit({groups:(s.groups||[]).filter(g=>g.id!==id)},'Deleted group '+name+'.');
    if(kind==='ou'){selectedOU='';commit({ous:s.ous.filter(o=>o.id!==id),users:s.users.filter(u=>u.ou!==id)},'Deleted organizational unit '+name+'.');}
    return;
  }
}

function action(a,b,e){
  const s=get();const id=b?.dataset.id;context=null;
  switch(a){
    case'bios':biosTab='Main';biosDraft=s.bootDevice;biosSelection=0;commit({screen:'bios',biosVisited:true},'Entered UEFI BIOS setup.');break;
    case'bios-tab':biosTab=b.dataset.tab;render();break;
    case'set-boot':if(b.dataset.device==='usb'&&!s.usb)return;biosDraft=b.dataset.device;biosSelection=b.dataset.device==='usb'?1:0;render();break;
    case'bios-default':biosDraft='disk';render();toast('BIOS defaults restored.');break;
    case'bios-save':commit({bootDevice:biosDraft});boot(biosDraft);break;
    case'bios-discard':commit({screen:'post'});break;
    case'boot':boot();break;
    case'boot-menu':bootSelection=0;commit({screen:'boot-menu'});break;
    case'boot-choice':{const i=+id;if(i===(s.usb?2:1))action('bios');else boot(i===1?'usb':'disk');break;}
    case'iso':if(!s.usb){toast('Reconnect the Ventoy USB drive.');break;}ventoyMode=true;render();break;
    case'ventoy-back':ventoyMode=false;render();break;
    case'setup-start':if(!s.usb){toast('Reconnect the Ventoy USB drive.');break;}installStep=0;commit({screen:'setup'},'Windows Setup started.');break;
    case'setup-next':installStep++;render();break;
    case'setup-back':installStep=Math.max(0,installStep-1);render();break;
    case'upgrade':toast('This blank disk requires a Custom installation.');break;
    case'install':
      if(!s.usb){toast('Reconnect the USB installation media.');break;}
      installPercent=0;commit({screen:'installing'},'Windows Server installation started.');
      for(let i=1;i<=10;i++)later(()=>{
        if(get().screen!=='installing')return;
        if(!get().usb){timers.forEach(clearTimeout);commit({screen:'setup'});toast('Installation interrupted: USB media disconnected. Reconnect it and retry.');return;}
        installPercent=i*10;render();
        if(i===10){
          const fresh=initialState();
          commit({...fresh,power:true,screen:'installing',usb:get().usb,ethernet:get().ethernet,biosVisited:get().biosVisited,ventoyBooted:get().ventoyBooted,events:get().events,startedAt:get().startedAt,installed:true,bootDevice:'disk'},'Windows Server 2012 R2 installed on Drive 0.');
          restart();
        }
      },i*450);
      break;
    case'restart':restart();break;
    case'shutdown':power();break;
    case'open':open(b.dataset.app);break;
    case'start':startOpen=!startOpen;menu=null;render();break;
    case'show-desktop':windows.forEach(w=>w.min=true);render();break;
    case'minimize':windows.find(w=>w.id===id).min=true;render();break;
    case'maximize':{const w=windows.find(w=>w.id===id);w.max=!w.max;render();break;}
    case'close':windows=windows.filter(w=>w.id!==id);screen.wasOpened=true;menu=null;render();break;
    case'menu':menu=menu===b.dataset.menu?null:b.dataset.menu;render();break;
    case'manager-view':managerView=b.dataset.view;menu=null;render();break;
    case'roles':if(s.roles.includes('AD DS')){toast('Active Directory Domain Services is already installed.');break;}show('roles');break;
    case'more':show('more');break;
    case'promote':if(!s.roles.includes('AD DS')){toast('Install the Active Directory Domain Services role first.');break;}if(s.promoted){toast('This server is already a domain controller.');break;}show('promote');break;
    case'wizard-close':if(wizard?.busy)return;wizard=null;render();break;
    case'wizard-back':wizard.step=Math.max(0,wizard.step-1);render();break;
    case'new-ou':show('ou');break;
    case'ou-properties':show('ou-properties',s.ous.find(o=>o.id===id));break;
    case'select-domain':selectedOU='';render();break;
    case'select-ou':selectedOU=id;render();break;
    case'new-user':if(!s.ous.some(o=>o.id===selectedOU)){toast('Select or right-click an organizational unit first.');break;}show('user',{ou:selectedOU});break;
    case'user-properties':show('user-properties',s.users.find(u=>u.id===id));break;
    case'new-group':if(!s.ous.some(o=>o.id===selectedOU)){toast('Select or right-click an organizational unit first.');break;}show('group',{ou:selectedOU});break;
    case'group-properties':show('group-properties',(s.groups||[]).find(g=>g.id===id));break;
    case'add-group-member':show('add-member',(s.groups||[]).find(g=>g.id===b.dataset.id));break;
    case'ad-new':if(s.ous.some(o=>o.id===selectedOU))show('user',{ou:selectedOU});else show('ou');break;
    case'new-folder':show('folder');break;
    case'folder-open':folderView=id;open('explorer');break;
    case'explorer-desktop':folderView='Desktop';render();break;
    case'explorer-computer':folderView='This PC';render();break;
    case'properties':show('properties',{id});break;
    case'property-tab':
      if(wizard?.type==='sys-properties'){
        const curData = data();
        if(curData.rdp_enable !== undefined) wizard.data.rdp_enable = curData.rdp_enable;
        if(curData.nla !== undefined) wizard.data.nla = curData.nla === 'on';
      }
      wizard.tab=b.dataset.tab;
      if(wizard.tab==='Security'){
        const fid=wizard.data.id;
        commit({folders:s.folders.map(f=>f.id===fid?{...f,securityVisited:true}:f)},'Opened folder Security properties.');
      }else render();
      break;
    case'apply-sys-properties':{
      const d=data();
      const rdpVal = d.rdp_enable !== undefined ? d.rdp_enable : wizard?.data?.rdp_enable;
      if(rdpVal !== undefined){
        const isEnabled = rdpVal === 'true' || rdpVal === true;
        const isNla = (d.nla !== undefined ? d.nla === 'on' : (wizard?.data?.nla === true || wizard?.data?.nla === 'on' || s.remoteDesktop?.nla !== false));
        if(wizard?.data){
          wizard.data.rdp_enable = String(isEnabled);
          wizard.data.nla = isNla;
        }
        commit({
          remoteDesktop: {
            enabled: isEnabled,
            nla: isNla,
            allowedUsers: ['Administrator']
          }
        }, 'Updated Remote Desktop settings.');
        toast('Remote Desktop settings applied.');
      }
      render();
      break;
    }
    case'advanced-sharing':show('sharing',s.folders.find(f=>f.id===wizard.data.id));break;
    case'permissions':Object.assign(wizard.data,data(),{shared:!!data().shared});wizard.type='permissions';render();break;
    case'sharing-return':wizard.type='sharing';render();break;
    case'properties-return':show('properties',{id:wizard.data.id});wizard.tab='Sharing';render();break;
    case'ipv4':case'show-ipv4':show('ipv4');break;
    case'ethernet-status':case'show-ethernet-status':show('ethernet-status');break;
    case'ethernet-props':case'show-ethernet-props':show('ethernet-props');break;
    case'sys-properties':case'show-sys-properties':show('sys-properties',{},0,b?.dataset?.tab||'Computer Name');break;
    case'rename-computer':case'show-rename-computer':show('rename-computer');break;
    case'toggle-ethernet':
      commit({ethernet:!s.ethernet}, s.ethernet?'Disconnected Ethernet cable.':'Connected Ethernet cable.');
      toast(s.ethernet?'Ethernet disabled.':'Ethernet enabled.');
      render();
      break;
    case'diagnose-net':
      toast('Windows Network Diagnostics did not find any problems.');
      break;
    case'cpl-home':
      open('control');
      break;
    case'rename-folder':show('rename-folder',s.folders.find(f=>f.id===id));break;
    case'delete-folder':case'delete-user':case'delete-ou':case'delete-group':{
      const kind=a.split('-')[1];
      const list = kind==='folder'?s.folders:kind==='user'?s.users:kind==='group'?(s.groups||[]):s.ous;
      const o=list.find(o=>o.id===id);
      if(kind==='ou'&&o.protected){toast('This OU is protected from accidental deletion. Clear protection in Properties first.');break;}
      show('delete',{kind,id,name:o.name});
      break;
    }
    case'refresh':render();break;

    // Browser & Router actions
    case'browser-back':case'browser-forward':case'browser-refresh':case'browser-home':
      browserUrl='http://192.168.1.1';render();break;
    case'router-tab':
      browserRouterTab=b.dataset.tab||'status';render();break;
    case'router-reboot':
      rebootRouter(s.networkEntities.router);
      toast('Router rebooted successfully.');
      render();
      break;
    case'router-logout':
      logoutRouter(s.networkEntities.router);
      toast('Logged out of router.');
      render();
      break;

    // Firewall & System actions
    case'toggle-firewall':
      const newEnabled = !s.firewall?.enabled;
      commit({
        firewall: {
          enabled: newEnabled,
          domain: newEnabled,
          private: newEnabled,
          public: newEnabled
        }
      }, newEnabled ? 'Windows Firewall enabled.' : 'Windows Firewall disabled per classroom instructions.');
      toast(newEnabled ? 'Windows Firewall enabled.' : 'Windows Firewall turned off for all profiles.');
      break;
    case'taskmgr-tab':
      taskmgrTab=b.dataset.tab||'processes';render();break;
    case'system-tab':
      systemTab=b.dataset.tab||'General';render();break;
    case'rdp-disconnect':
      rdpSessionOpen=false;render();break;
  }
}

document.addEventListener('submit',e=>{
  const s=get();
  if(e.target.id==='sim-form'){
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    switch(e.target.dataset.form){
      case'setup-language':case'setup-license':installStep++;render();break;
      case'setup-edition':if(d.edition!=='gui'){error('Choose Server with a GUI for this desktop training mission.');return;}installStep++;render();break;
      case'admin':if(!passwordCheck(d))return;windows=[];open('manager',false);screen.wasOpened=true;commit({adminSet:true,screen:'desktop'},'Administrator configured. Windows Server is ready.');break;
      case'wizard':handleWizard(d);break;
      case'mstsc-connect':
        if(s.remoteDesktop?.enabled){
          rdpSessionOpen=true;
          commit({verifiedChecks:{...(s.verifiedChecks||{}),rdp_tested:true}},'Connected via Remote Desktop.');
          render();
        }else{
          toast("Remote Desktop can't connect: Remote access to the server is not enabled.");
        }
        break;
    }
  }

  // Browser navigation
  if(e.target.dataset.form==='browser-navigate'){
    e.preventDefault();
    const val=new FormData(e.target).get('url');
    if(val){
      browserUrl=val.startsWith('http://')||val.startsWith('https://')?val:'http://'+val;
      render();
    }
  }

  // Router config forms inside browser
  if(e.target.dataset.form?.startsWith('router-')){
    e.preventDefault();
    const formType=e.target.dataset.form.replace('router-','');
    const d=Object.fromEntries(new FormData(e.target));
    const r=s.networkEntities.router;
    if(formType==='login'){
      const res=loginRouter(r, d.username, d.password);
      if(res.success){
        commit({networkEntities:s.networkEntities},'Logged in to TP-LINK router.');
        toast('Logged in to TP-LINK Router.');
      }else{
        toast('Login failed: Invalid credentials. Default is admin / admin.');
      }
      render();
      return;
    }
    if(formType==='wan')updateRouterWan(r,d);
    if(formType==='lan')updateRouterLan(r,d.ip,d.mask);
    if(formType==='wireless')updateRouterWlan(r,{enabled:d.enabled==='on',ssid:d.ssid,channel:+d.channel});
    if(formType==='security')updateRouterWlan(r,{security:d.security,passphrase:d.passphrase});
    if(formType==='dhcp')updateRouterDhcp(r,{enabled:d.enabled==='true',start:d.start,end:d.end,leaseTimeMinutes:+d.leaseTimeMinutes,gateway:d.gateway,dns:d.dns});
    commit({networkEntities:s.networkEntities},`Updated router ${formType} settings.`);
    toast(`Router ${formType.toUpperCase()} settings saved.`);
    render();
  }

  // System remote desktop form
  if(e.target.dataset.form==='system-remote'){
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    commit({
      remoteDesktop: {
        enabled: d.rdp_enable==='true',
        nla: d.nla==='on',
        allowedUsers: ['Administrator']
      }
    }, 'Updated Remote Desktop settings.');
    toast('Remote settings applied.');
    render();
  }

  if(e.target.id==='terminal-form'){
    e.preventDefault();
    const command=new FormData(e.target).get('command').trim();
    runCommand(command);
  }
});

function runCommand(command){
  const s=get(),cmd=command.toLowerCase().trim();
  terminalLines.push('PS C:\\Users\\Administrator> '+command);
  let output='';

  if(cmd==='help'){
    output='Supported simulated commands:\n  help, cls, hostname, whoami, ipconfig, ipconfig /all, nslookup <host>\n  ping <host>, dir, mkdir <name>, net share, net user, net group\n  Get-ADUser -Filter *, Get-ADOrganizationalUnit -Filter *, Get-ADGroup -Filter *\n  Get-WindowsFeature, systeminfo, Get-Service, Get-Process, Get-NetIPConfiguration\n  Get-DhcpServerv4Lease, mstsc, taskmgr, services.msc, firewall.cpl, Restart-Computer\n\nNo real commands or network requests are executed.';
  }else if(cmd==='cls'||cmd==='clear'){
    terminalLines=[];render();return;
  }else if(cmd==='hostname'){
    output=s.computerName;
  }else if(cmd==='whoami'){
    output=(s.netbios||s.computerName)+'\\administrator';
  }else if(cmd==='ipconfig'){
    output=s.ethernet?`Windows IP Configuration\n\nEthernet adapter Ethernet:\n   IPv4 Address. . . . . . . : ${s.network.ip}\n   Subnet Mask . . . . . . . : ${s.network.mask}\n   Default Gateway . . . .  : ${s.network.gateway}\n   DNS Servers . . . . . .  : ${s.network.dns}\n   DHCP Enabled. . . . . .  : ${s.network.dhcp?'Yes':'No'}`:'Ethernet adapter Ethernet:\n   Media State . . . . . . . : Media disconnected';
  }else if(cmd==='ipconfig /all'||cmd==='ipconfig -all'){
    output=s.ethernet?`Windows IP Configuration\n\n   Host Name . . . . . . . . . . . . : ${s.computerName}\n   Primary Dns Suffix  . . . . . . . : ${s.domain||''}\n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . . : No\n\nEthernet adapter Ethernet:\n   Connection-specific DNS Suffix  . : ${s.domain||'local'}\n   Description . . . . . . . . . . . : Intel(R) 82574L Gigabit Network Connection\n   Physical Address. . . . . . . . . : 00-15-5D-02-12-AA\n   DHCP Enabled. . . . . . . . . . . : ${s.network.dhcp?'Yes':'No'}\n   IPv4 Address. . . . . . . . . . . : ${s.network.ip}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${s.network.mask}\n   Default Gateway . . . . . . . . . : ${s.network.gateway}\n   DHCP Server . . . . . . . . . . . : ${s.networkEntities?.router?.lan?.ip||'192.168.1.1'}\n   DNS Servers . . . . . . . . . . . : ${s.network.dns}`:'Ethernet adapter Ethernet:\n   Media State . . . . . . . : Media disconnected';
  }else if(cmd.startsWith('nslookup')){
    const target=cmd.replace('nslookup','').trim();
    if(!target)output='Default Server:  '+(s.network.dns==='127.0.0.1'?s.computerName:'router.local')+'\nAddress:  '+s.network.dns;
    else{
      const res=resolveDns(target,s);
      output=res?`Server:  ${s.network.dns==='127.0.0.1'?s.computerName:'router.local'}\nAddress:  ${s.network.dns}\n\nName:    ${target}\nAddress:  ${res}`:`Server:  ${s.network.dns}\nAddress:  ${s.network.dns}\n\n*** ${s.network.dns} can't find ${target}: Non-existent domain`;
    }
  }else if(cmd.startsWith('ping ')){
    const host=command.slice(5).trim();
    output=simulatePing('server',host,s).output;
    if(host==='192.168.1.1'&&s.ethernet)s.verifiedChecks.mobile_ping_gw=true;
  }else if(cmd==='get-service'){
    output='Status   Name               DisplayName\n------   ----               -----------\n'+(s.services||[]).map(svc=>(svc.status==='Running'?'Running  ':'Stopped  ')+svc.name.padEnd(18)+' '+svc.displayName).join('\n');
    s.verifiedChecks.monitor_svc=true;
  }else if(cmd==='get-process'){
    output='Handles  NPM(K)    PM(K)      WS(K) VM(M)   CPU(s)     Id ProcessName\n-------  ------    -----      ----- -----   ------     -- -----------\n    184      12    18240      24100   142     0.24   1420 ServerManager\n    312      24    38400      49200   285     0.48    684 ntds\n    145       9    12400      18200    98     0.12    912 dns\n    420      18    22100      32000   180     0.18    512 lsass\n    210      14    16500      22800   110     0.08   1840 explorer\n    380      20    28400      39500   220     0.15   2180 powershell';
    s.verifiedChecks.monitor_proc=true;
  }else if(cmd.startsWith('get-adgroup')){
    output=s.promoted?(s.groups?.length?'DistinguishedName               GroupCategory GroupScope Name\n-----------------               ------------- ---------- ----\n'+s.groups.map(g=>`CN=${g.name},CN=Users,DC=${s.domain.split('.').join(',DC=')}  ${g.type||'Security'}      ${g.scope||'Global'}     ${g.name}`).join('\n'):'CN=Domain Admins,CN=Users,DC='+s.domain.split('.').join(',DC=')+'  Security  Global  Domain Admins'):'Active Directory is not configured.';
  }else if(cmd==='get-netipconfiguration'){
    output=`InterfaceAlias       : Ethernet\nInterfaceIndex       : 12\nInterfaceDescription : Intel(R) 82574L Gigabit Network Connection\nNetIPv4Addresses     : {${s.network.ip}/24}\nIPv4DefaultGateway   : {${s.network.gateway}}\nDNSServer            : {${s.network.dns}}`;
  }else if(cmd==='get-dhcpserverv4lease'){
    const leases=s.networkEntities?.router?.dhcp?.leases||[];
    output='IPAddress       ScopeId         ClientId           HostName         AddressState\n---------       -------         --------           --------         ------------\n'+(leases.map(l=>`${l.ip.padEnd(15)} 192.168.1.0     ${l.mac.padEnd(18)} ${l.hostname.padEnd(16)} Active`).join('\n')||'No active leases in scope.');
  }else if(cmd==='dir'||cmd==='ls'||cmd==='get-childitem'){
    output='Directory: C:\\Users\\Administrator\\Desktop\n\n'+s.folders.map(f=>'d-----  '+f.name).join('\n');
  }else if(cmd.startsWith('mkdir ')){
    const name=command.slice(6).replace(/^"|"$/g,'');
    output=addFolder(name)?'Directory created: '+name:'Cannot create directory. Use a valid, unique folder name.';
  }else if(cmd==='net share'){
    output='Share name     Resource\n'+s.folders.filter(f=>f.shared).map(f=>`${f.shareName||f.name}     C:\\Users\\Administrator\\Desktop\\${f.name}`).join('\n');
  }else if(cmd==='net user'){
    output='User accounts\nAdministrator\n'+s.users.map(u=>u.logon).join('\n');
  }else if(cmd==='net group'){
    output='Group Accounts for \\\\'+s.computerName+'\n---------------------------------------\n*Domain Admins  *Domain Users\n'+(s.groups||[]).map(g=>'*'+g.name).join('\n');
  }else if(cmd.startsWith('get-aduser')){
    output=s.promoted?'Name        SamAccountName\n'+s.users.map(u=>u.name+'        '+u.logon).join('\n'):'Active Directory is not configured.';
  }else if(cmd.startsWith('get-adorganizationalunit')){
    output=s.promoted?s.ous.map(o=>`OU=${o.name},DC=${s.domain.split('.').join(',DC=')}`).join('\n'):'Active Directory is not configured.';
  }else if(cmd==='get-windowsfeature'){
    output='Install State   Name\n'+['AD DS','DNS'].map(r=>`${s.roles.includes(r)?'[X] Installed':'[ ] Available'}   ${r}`).join('\n');
  }else if(cmd==='systeminfo'){
    output=`Host Name: ${s.computerName}\nOS Name: Microsoft Windows Server 2012 R2 Standard\nOS Version: 6.3.9600\nSystem Type: x64-based PC\nTotal Physical Memory: 8,192 MB\nDomain: ${s.domain||'WORKGROUP'}`;
  }else if(cmd==='mstsc'){
    open('mstsc');render();return;
  }else if(cmd==='taskmgr'){
    open('taskmgr');render();return;
  }else if(cmd==='services.msc'){
    open('services');render();return;
  }else if(cmd==='control'||cmd==='control.exe'){
    open('control');render();return;
  }else if(cmd==='ncpa.cpl'){
    show('ethernet-props');render();return;
  }else if(cmd==='sysdm.cpl'){
    show('sys-properties');render();return;
  }else if(cmd==='firewall.cpl'){
    open('firewall');render();return;
  }else if(cmd==='restart-computer'){
    restart();return;
  }else if(cmd){
    output=`${command.split(' ')[0]} : This command is not implemented in the training simulator. Type help.`;
  }

  terminalLines.push(output,'');
  render();
  const input=document.querySelector('#terminal-form input');
  input?.focus();
  document.querySelector('#terminal-content')?.scrollTo(0,99999);
}

document.addEventListener('contextmenu',e=>{
  const target=e.target.closest('[data-context]');
  if(!target||get().screen!=='desktop'||wizard)return;
  e.preventDefault();
  const rect=document.querySelector('#screen')?.getBoundingClientRect();
  if(!rect)return;
  const scale=rect.width/1000;
  const type=target.dataset.context;
  const id=target.dataset.folder||target.dataset.id||target.dataset.ou;
  if(type==='ou')selectedOU=target.dataset.ou||id;
  context={type,id,x:Math.min(765,(e.clientX-rect.left)/scale),y:Math.min(425,(e.clientY-rect.top)/scale)};
  menu=null;
  render();
});

document.addEventListener('pointerdown',e=>{
  if(context&&!e.target.closest('.context-menu')&&!e.target.closest('[data-context]')){
    context=null;render();
  }
  const bar=e.target.closest('[data-drag]');
  if(!bar||e.target.closest('button'))return;
  const w=windows.find(w=>w.id===bar.dataset.drag);
  if(w?.max)return;
  const el=bar.closest('.os-window');
  const screenEl=document.querySelector('#screen');
  if(!el||!screenEl)return;
  const scale=screenEl.getBoundingClientRect().width/1000;
  const x=e.clientX,y=e.clientY,ox=w.x,oy=w.y;
  w.z=++nextZ;
  el.style.zIndex=w.z;
  bar.setPointerCapture(e.pointerId);
  const move=ev=>{
    w.x=Math.max(0,Math.min(900,(ev.clientX-x)/scale+ox));
    w.y=Math.max(0,Math.min(540,(ev.clientY-y)/scale+oy));
    el.style.left=w.x+'px';el.style.top=w.y+'px';
  };
  const up=()=>{
    bar.removeEventListener('pointermove',move);
    bar.removeEventListener('pointerup',up);
  };
  bar.addEventListener('pointermove',move);
  bar.addEventListener('pointerup',up);
});

document.addEventListener('change',e=>{
  if(e.target.name==='fullControl'&&e.target.checked){
    const change=document.querySelector('[name=change]');
    const read=document.querySelector('[name=read]');
    if(change)change.checked=true;
    if(read)read.checked=true;
  }
});

document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  const s=get();
  if(!s.power)return;
  if(['F2','Delete','F12','F10','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&['post','bios','boot-menu','ventoy','no-boot'].includes(s.screen))e.preventDefault();
  if((e.key==='F2'||e.key==='Delete')&&['post','no-boot'].includes(s.screen))action('bios');
  else if(e.key==='F12'&&['post','no-boot','bios'].includes(s.screen))action('boot-menu');
  else if(s.screen==='bios'){
    if(e.key==='F10')action('bios-save');
    if(e.key==='Escape')action('bios-discard');
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      const tabs=['Main','Advanced','Boot','Security','Save & Exit'];
      biosTab=tabs[(tabs.indexOf(biosTab)+(e.key==='ArrowRight'?1:4))%5];
      render();
    }
    if(biosTab==='Boot'&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
      biosSelection=1-biosSelection;
      render();
    }
    if(e.key==='Enter'&&biosTab==='Boot')action('set-boot',{dataset:{device:biosSelection?'usb':'disk'}});
    if(e.key==='Enter'&&biosTab==='Save & Exit')action('bios-save');
  }else if(s.screen==='boot-menu'){
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      const total=s.usb?3:2;
      bootSelection=(bootSelection+(e.key==='ArrowDown'?1:total-1))%total;
      render();
    }
    if(e.key==='Enter')action('boot-choice',{dataset:{id:bootSelection}});
    if(e.key==='Escape')commit({screen:'post'});
  }else if(s.screen==='ventoy'){
    if(e.key==='Enter')action(ventoyMode?'setup-start':'iso');
    if(e.key==='Escape'){
      if(ventoyMode){ventoyMode=false;render();}else action('boot-menu');
    }
  }else if(s.screen==='post'&&e.key==='Enter')boot();
  else if(e.key==='Escape'){
    if(wizard&&!wizard.busy)wizard=null;
    menu=context=null;
    startOpen=false;
    render();
  }
});

return {screen,action,power,clear};
}
