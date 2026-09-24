import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,checks,progress,validDomain,validPassword,validIP,cleanState} from '../public/client/engine.js';

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

test('consumed boot media retains mission credit only after a Ventoy installation',()=>{
 const state=initialState();state.installed=true;state.adminSet=true;state.usb=false;
 assert.equal(checks(state).usb,false);
 state.ventoyBooted=true;assert.equal(checks(state).usb,true);
});
