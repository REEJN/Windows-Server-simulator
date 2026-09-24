import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../public/client/engine.js';
import {createSimulator} from '../public/client/os.js';

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
