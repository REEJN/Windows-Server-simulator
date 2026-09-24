import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../public/client/engine.js';
import {createSimulator} from '../public/client/os.js';

const bridgeSource = readFileSync(new URL('../public/client/client.js', import.meta.url), 'utf8').replace(/^import .*;\r?$/gm, '');
const origin = 'http://localhost:4173';

function bridge() {
  const messages = [];
  const windowListeners = new Map();
  const elements = new Map();
  const timers = new Map();
  let sequence = 0;
  let api;
  let powers = 0;
  let clears = 0;
  const element = () => ({
    innerHTML:'', textContent:'', disabled:false, clientWidth:1000, clientHeight:625,
    classList:{add(){}, remove(){}, toggle(){}}, style:{setProperty(){}},
    setAttribute(){}, focus(){}, replaceChildren(){},
  });
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
    querySelectorAll:() => [], addEventListener(){}, activeElement:null,
  };
  const parent = {postMessage(message, targetOrigin) {
    assert.equal(targetOrigin, origin);
    messages.push(structuredClone(message));
  }};
  const window = {parent, addEventListener:(name, callback) => windowListeners.set(name, callback)};
  const context = {
    ...engine, document, window, location:{origin},
    crypto:{randomUUID:() => `request-${++sequence}`},
    ResizeObserver:class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } },
    setTimeout:(callback) => { const id = ++sequence; timers.set(id, {callback, interval:false}); return id; },
    clearTimeout:(id) => timers.delete(id),
    setInterval:(callback) => { const id = ++sequence; timers.set(id, {callback, interval:true}); return id; },
    clearInterval:(id) => timers.delete(id),
    createSimulator(simApi) {
      api = simApi;
      return {
        screen:() => `<div>${simApi.get().screen}</div>`,
        clear:() => clears++,
        action(){},
        power() {
          powers++;
          const powered = !simApi.get().power;
          simApi.commit({power:powered, screen:powered ? 'post' : 'off'});
        },
      };
    },
  };
  vm.runInNewContext(bridgeSource, context, {filename:'client.js'});
  const receive = (data, eventOrigin = origin, source = parent) => windowListeners.get('message')({data, origin:eventOrigin, source});
  const init = (extra = {}) => receive({type:'serverlab:init', deviceId:'server-1', name:'DC-01', hardware:{power:true, usb:true, ethernet:true}, network:{ip:'192.168.20.10', mask:'255.255.255.0', gateway:'192.168.20.1', dns:'192.168.20.10'}, ...extra});
  return {
    messages, receive, init, timers,
    get api() { return api; },
    get powers() { return powers; },
    get clears() { return clears; },
    get state() { return api.get(); },
    states:() => messages.filter((message) => message.type === 'serverlab:state'),
  };
}

test('ready handshake retries until initialized and only accepts the same-origin parent', () => {
  const client = bridge();
  assert.equal(client.messages.at(-1).type, 'serverlab:ready');
  const retry = [...client.timers.values()].find((timer) => timer.interval);
  retry.callback();
  assert.equal(client.messages.filter((message) => message.type === 'serverlab:ready').length, 2);
  const init = {type:'serverlab:init', deviceId:'untrusted', hardware:{power:true}};
  client.receive(init, 'https://untrusted.example');
  client.receive(init, origin, {});
  assert.equal(client.states().length, 0);
  client.init();
  assert.equal([...client.timers.values()].some((timer) => timer.interval), false);
  assert.equal(client.states().length, 1);
});

test('a newly powered computer enters POST with topology hardware, address, and name', () => {
  const client = bridge();
  client.init();
  assert.equal(client.powers, 1);
  assert.equal(client.state.screen, 'post');
  assert.equal(client.state.power, true);
  assert.equal(client.state.usb, true);
  assert.equal(client.state.ethernet, true);
  assert.equal(client.state.computerName, 'DC-01');
  assert.equal(client.state.network.ip, '192.168.20.10');
  assert.equal(client.states().at(-1).deviceId, 'server-1');
});

test('consuming the installer switches a configured server to its installed disk', () => {
  const client = bridge();
  client.init({os:{...engine.initialState(),power:true,screen:'desktop',installed:true,adminSet:true,ventoyBooted:true,bootDevice:'usb'}});
  client.receive({type:'serverlab:hardware',deviceId:'server-1',hardware:{power:true,usb:false,ethernet:true}});
  assert.equal(client.state.bootDevice,'disk');
  assert.equal(client.state.installed,true);
  assert.equal(client.state.screen,'desktop');
  assert.equal(client.state.usb,false);
});

test('reopening restores complete OS progress without toggling power or resetting POST', () => {
  const client = bridge();
  const os = {...engine.initialState(), power:true, screen:'desktop', installed:true, adminSet:true, promoted:true, domain:'school.local', folders:[{id:'share-1', name:'Shared', shared:true}]};
  client.init({os});
  assert.equal(client.powers, 0);
  assert.equal(client.state.domain, 'school.local');
  assert.equal(client.states().at(-1).os.folders[0].name, 'Shared');
  assert.equal(client.state.screen, 'desktop');
  client.init({os:engine.initialState()});
  assert.equal(client.state.domain, 'school.local', 'duplicate init must not replace an active session');
  const postClient = bridge();
  postClient.init({os:{...engine.initialState(), power:true, screen:'post'}});
  assert.equal(postClient.state.screen, 'post');
  assert.equal(postClient.powers, 0);
});

test('unchanged or unrelated hardware messages produce no state echo', () => {
  const client = bridge();
  client.init();
  const count = client.states().length;
  client.receive({type:'serverlab:hardware', deviceId:'server-1', hardware:{power:true, usb:true, ethernet:true}, name:'DC-01', network:{ip:'192.168.20.10'}});
  client.receive({type:'serverlab:hardware', deviceId:'another-server', hardware:{power:false}});
  assert.equal(client.states().length, count);
  assert.equal(client.powers, 1);
  client.receive({type:'serverlab:hardware', deviceId:'server-1', hardware:{power:false}});
  assert.equal(client.state.screen, 'off');
  assert.equal(client.state.power, false);
  assert.equal(client.state.usb, true);
  assert.equal(client.powers, 2);
  client.receive({type:'serverlab:hardware', deviceId:'server-1', hardware:{power:true}});
  assert.equal(client.state.screen, 'post');
  assert.equal(client.powers, 3);
});

test('USB removal cancels both first installs and reinstalls before any timer completes', () => {
  for (const installed of [false, true]) {
    const client = bridge();
    client.init();
    client.api.commit({screen:'installing', installed});
    const clearsBefore = client.clears;
    client.receive({type:'serverlab:hardware', deviceId:'server-1', hardware:{usb:false}});
    assert.equal(client.state.screen, 'setup');
    assert.equal(client.state.usb, false);
    assert.equal(client.clears, clearsBefore + 1);
  }
});

test('OS reinstall preserves the topology address and computer name', () => {
  const client = bridge();
  client.init();
  client.api.commit({...engine.initialState(), power:true, usb:true, screen:'installing', installed:true});
  assert.equal(client.state.computerName, 'DC-01');
  assert.equal(client.state.network.ip, '192.168.20.10');
  client.api.commit({network:{...client.state.network, ip:'192.168.20.11'}});
  assert.equal(client.states().at(-1).os.network.ip, '192.168.20.11', 'Windows adapter edits publish back to the lab');
});

test('topology ping responses are correlated and reject messages from foreign frames', async () => {
  const client = bridge();
  client.init();
  const resultPromise = client.api.ping('192.168.20.11');
  const request = client.messages.at(-1);
  assert.equal(request.type, 'serverlab:ping');
  assert.equal(request.target, '192.168.20.11');
  assert.equal(request.deviceId, 'server-1');
  client.receive({type:'serverlab:ping-result', requestId:request.requestId, ok:true, message:'spoofed'}, origin, {});
  client.receive({type:'serverlab:ping-result', requestId:'another-request', ok:true, message:'unrelated'});
  client.receive({type:'serverlab:ping-result', requestId:request.requestId, ok:false, message:'Destination host unreachable: switch is powered off.'});
  const result = await resultPromise;
  assert.equal(result.ok, false);
  assert.match(result.message, /switch is powered off/);
  assert.equal(client.timers.size, 0);
});

test('PowerShell ping renders the actual asynchronous topology result', async () => {
  const previous = {document:globalThis.document, FormData:globalThis.FormData};
  const handlers = new Map();
  globalThis.document = {addEventListener:(name, handler) => handlers.set(name, handler), querySelector:() => null};
  globalThis.FormData = class { get() { return 'ping 10.0.0.12'; } };
  try {
    const state = {...engine.initialState(), installed:true, adminSet:true, power:true, screen:'desktop', ethernet:true};
    let target;
    const simulator = createSimulator({get:() => state, icon:() => '', esc:String, toast(){}, render(){}, commit:(changes) => Object.assign(state, changes), ping:async (host) => { target = host; return {ok:false, message:'No route: LAN cable unplugged.'}; }});
    simulator.action('open', {dataset:{app:'terminal'}});
    handlers.get('submit')({target:{id:'terminal-form'}, preventDefault(){}});
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(target, '10.0.0.12');
    assert.ok(simulator.screen().includes('No route: LAN cable unplugged.'));
    assert.ok(!simulator.screen().includes('External networking is not simulated.'));
  } finally {
    Object.assign(globalThis, previous);
  }
});
