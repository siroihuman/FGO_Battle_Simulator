(function (global) {
  'use strict';
  const DATA = global.FGO_SIM_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE || (typeof require !== 'undefined' ? require('./engine.js') : null);
  if (!DATA || !ENGINE || !ENGINE.BattleEngine) throw new Error('grand score core requires data and engine.');

  const Base = ENGINE.BattleEngine;
  const STORAGE_KEY = 'fgoGrandScoreSettingsV1';
  const GROUPS = {
    saber:'saber', archer:'archer', lancer:'lancer', rider:'rider', caster:'caster', assassin:'assassin', berserker:'berserker',
    shielder:'extra1', ruler:'extra1', avenger:'extra1', moonCancer:'extra1',
    alterEgo:'extra2', foreigner:'extra2', pretender:'extra2', beast:'extra2'
  };
  const MASTER_TYPES = new Set(['heal','attackUp','defenseUp','defenseDown','cardUp','cardDown','npPowerUp','critUp','starRateUp','npGainUp','stars','npCharge','damageCut','damagePlus','debuffResist','buffRemovalResist','debuffSuccess','charmSuccessUp','critRateDown','critDamageDown','enemyChargeDown','deathResist','mentalResist','specialResistance']);
  const NAMES = {
    healReceivedUp:'HP回復量アップ', grandArrowAmplify:'鈍の矢弾・攻撃強化増幅', grandArcherInterception:'見敵迎撃',
    grandBoundaryControl:'境域掌握', grandChargeDrain:'毎ターンチャージ減少', grandCriticalCardUp:'クリティカル時カード威力アップ',
    grandPresenceConcealmentEvade:'気配遮断', grandTargetDestruction:'標的破壊状態', grandAttention:'対敵注視',
    grandAmplificationLoad:'増幅負荷', grandAmplificationLoadUp:'増幅負荷・攻撃力アップ変換', grandReleaseResidue:'放出残滓',
    grandNpResist:'宝具攻撃耐性', grandNpDamageCut:'対宝具ダメージカット'
  };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const clamp = (v,min,max) => Math.max(min,Math.min(max,Number(v)||0));
  const active = (s) => Boolean(s) && (s.remaining == null || s.remaining < 0 || s.remaining > 0) && (s.uses == null || s.uses > 0);
  const alive = (u) => Boolean(u && u.alive && Number(u.hp||0)>0);

  function loadSettings(){
    if(typeof localStorage==='undefined') return {enabled:false,slots:[],activeSlots:[]};
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch{return {enabled:false,slots:[],activeSlots:[]};}
  }
  function resolveConfig(config){
    const result=clone(config||{}), saved=loadSettings();
    const enabled=result.grandScoreEnabled!=null?Boolean(result.grandScoreEnabled):Boolean(saved.enabled);
    const flags=Array.isArray(result.grandServantFlags)?result.grandServantFlags:(saved.activeSlots?.length?saved.activeSlots:(saved.slots||[]));
    result.grandScoreEnabled=enabled;
    result.party=(result.party||[]).map((raw,i)=>{
      const slot={...raw};
      const selected=enabled&&Boolean(slot.grandServant||slot.grandScoreEnabled||flags[i]);
      slot.grandServant=slot.grandScoreEnabled=selected;
      if(selected){slot.fouHp=Number(slot.fouHp||0)+1000;slot.fouAtk=Number(slot.fouAtk||0)+1000;slot.grandFouHp=1000;slot.grandFouAtk=1000;}
      return slot;
    });
    return result;
  }
  function status(type,value,opt={}){
    return {type,value:Number(value||0),card:opt.card,source:opt.source||'グランドスコア',sourceType:'grandScore',remaining:opt.duration==null?-1:Number(opt.duration),uses:opt.uses==null?null:Number(opt.uses),debuff:Boolean(opt.debuff),passive:Boolean(opt.passive),unremovable:opt.unremovable!==false,uniqueKey:opt.uniqueKey,label:opt.label||NAMES[type],providerUnitId:opt.providerUnitId,grandConsumeOnAttack:Boolean(opt.grandConsumeOnAttack),grandActionTypes:opt.grandActionTypes};
  }
  function add(unit,type,value,opt={}){
    if(!unit)return null;
    if(opt.uniqueKey){const old=(unit.statuses||[]).find(s=>s.uniqueKey===opt.uniqueKey&&active(s));if(old){if(opt.refreshDuration&&opt.duration!=null)old.remaining=Number(opt.duration);if(opt.addUses)old.uses=Number(old.uses||0)+Number(opt.addUses);return old;}}
    const s=status(type,value,opt);(unit.statuses||(unit.statuses=[])).push(s);return s;
  }
  function find(unit,type,pred){return (unit?.statuses||[]).find(s=>s.type===type&&active(s)&&(!pred||pred(s)))||null;}
  function all(unit,type){return (unit?.statuses||[]).filter(s=>s.type===type&&active(s));}
  function remove(unit,s){if(unit&&s)unit.statuses=(unit.statuses||[]).filter(x=>x!==s);}
  function consume(unit,s,n=1){if(!s||s.uses==null)return;s.uses-=n;if(s.uses<=0)remove(unit,s);}
  function scaleEffect(effect){
    if(!effect||!MASTER_TYPES.has(effect.type))return effect;
    const e={...effect};if(Array.isArray(e.values))e.values=e.values.map(v=>Number(v||0)*1.5);if(e.value!=null)e.value=Number(e.value||0)*1.5;if(Array.isArray(e.ocValues))e.ocValues=e.ocValues.map(v=>Number(v||0)*1.5);return e;
  }

  class GrandScoreEngine extends Base {
    constructor(config){const resolved=resolveConfig(config);super(resolved);this.grandScoreEnabled=Boolean(resolved.grandScoreEnabled);this._grandHandleEntries();}
    _createAlly(slot,index){
      const u=super._createAlly(slot,index);u.grandServant=Boolean(slot?.grandScoreEnabled);u.grandScoreGroup=u.grandServant?(GROUPS[u.classId]||null):null;u.grandFouHp=u.grandServant?1000:0;u.grandFouAtk=u.grandServant?1000:0;u.grandArrowBullets=0;u.grandScoreCooldowns={};u.grandScoreEntered=false;
      if(!u.grandServant)return u;
      add(u,'cardUp',50,{card:'quick',passive:true,uniqueKey:`grandQ:${u.id}`});add(u,'cardUp',50,{card:'arts',passive:true,uniqueKey:`grandA:${u.id}`});add(u,'cardUp',50,{card:'buster',passive:true,uniqueKey:`grandB:${u.id}`});add(u,'cardUp',200,{card:'extra',passive:true,uniqueKey:`grandEX:${u.id}`});add(u,'healReceivedUp',50,{passive:true,uniqueKey:`grandHeal:${u.id}`});add(u,'buffRemovalResist',80,{passive:true,uniqueKey:`grandRemove:${u.id}`});
      u.np=clamp(Number(u.np||0)+10+(u.grandScoreGroup==='caster'?30:0),0,300);return u;
    }
    getGrandServants(opt={}){return (this.state?.allies||[]).filter(u=>u.grandServant&&(!opt.aliveOnly||alive(u))&&(!opt.frontlineOnly||u.frontline));}
    hasActiveGrandServant(){return this.getGrandServants({aliveOnly:true,frontlineOnly:true}).length>0;}
    _grandHandleEntries(){
      this.getGrandServants({aliveOnly:true,frontlineOnly:true}).forEach(u=>{if(u.grandScoreEntered)return;u.grandScoreEntered=true;if(u.grandScoreGroup==='archer'){u.grandArrowBullets=Number(u.grandArrowBullets||0)+4;this._log(`${u.name}は〔鈍の矢弾〕を4回分獲得。`,'skill');}});
      (this.state?.allies||[]).forEach(u=>{if(!u.frontline)u.grandScoreEntered=false;});
    }
    _grandCooldownReady(u,key){return Number(u?.grandScoreCooldowns?.[key]||0)<=0;}
    _grandSetCooldown(u,key,turns){u.grandScoreCooldowns=u.grandScoreCooldowns||{};u.grandScoreCooldowns[key]=Number(turns||0)+1;}
    _grandHeal(target,raw,label){if(!alive(target))return 0;const amount=Math.floor(Math.max(0,Number(raw||0))*(1+this._statusTotal(target,'healReceivedUp')/100));const before=target.hp;target.hp=Math.min(target.maxHp,target.hp+amount);const healed=target.hp-before;if(healed)this._log(`${target.name}のHPを${healed.toLocaleString('ja-JP')}回復。${label?`（${label}）`:''}`,'heal');return healed;}
    _applyEffect(effect,source,targetId,context){
      if(effect?.type==='heal'){const level=clamp(context?.level||10,1,10),oc=clamp(context?.oc||1,1,5);const value=Array.isArray(effect.values)?Number(effect.values[level-1]||0):Array.isArray(effect.ocValues)?Number(effect.ocValues[oc-1]||0):Number(effect.value||0);const targets=this._effectTargets(effect,source,targetId);const results=targets.map(t=>({target:t,healed:this._grandHeal(t,value,source?.name)}));return {applied:results.some(r=>r.healed>0),targets,results};}
      return super._applyEffect(effect,source,targetId,context);
    }
    useMysticSkill(index,targetId){
      const activeGrand=this.hasActiveGrandServant(), skill=this.getMysticCode()?.skills?.[index], original=skill?.effects, before=new Map((this.state.allies||[]).map(u=>[u.id,u.hp]));if(activeGrand&&skill)skill.effects=(skill.effects||[]).map(scaleEffect);let result;try{result=super.useMysticSkill(index,targetId);}finally{if(skill)skill.effects=original;}
      if(result?.ok)this.getGrandServants({aliveOnly:true}).forEach(u=>{const gain=Math.max(0,u.hp-Number(before.get(u.id)||0));if(gain)u.hp=Math.min(u.maxHp,u.hp+Math.floor(gain*.5));});return result;
    }
    _grandProcessResidue(){[...(this.state.allies||[]),...(this.state.enemies||[])].forEach(u=>all(u,'grandReleaseResidue').forEach(s=>{const chance=u.grandScoreGroup==='extra2'?(find(u,'grandExtra2Conversion100')?100:80):0;if(alive(u)&&this.rng()*100<chance)this._grandHeal(u,s.value,'放出残滓変換');else if(alive(u))this._takeDamage(u,s.value,'放出残滓');}));}
    _grandProcessChargeDrain(){(this.state.enemies||[]).forEach(e=>all(e,'grandChargeDrain').slice().forEach(s=>{e.charge=Math.max(0,Number(e.charge||0)-1);consume(e,s);this._log(`${e.name}のチャージを1減少。`,'debuff');}));}
    _finishTurn(){const doubleCt=this.hasActiveGrandServant();this._grandHandleEntries();this.getGrandServants({aliveOnly:true,frontlineOnly:true}).forEach(u=>{this._addNp(u,10,true);if(u.grandScoreGroup==='archer')u.grandArrowBullets=Number(u.grandArrowBullets||0)+1;Object.keys(u.grandScoreCooldowns||{}).forEach(k=>u.grandScoreCooldowns[k]=Math.max(0,u.grandScoreCooldowns[k]-1));});this._grandProcessResidue();this._grandProcessChargeDrain();const r=super._finishTurn.apply(this,arguments);if(doubleCt&&Array.isArray(this.state.mysticCodeCooldowns))this.state.mysticCodeCooldowns=this.state.mysticCodeCooldowns.map(ct=>Math.max(0,ct-1));this._grandHandleEntries();return r;}
    _promoteReserve(){const r=super._promoteReserve.apply(this,arguments);this._grandHandleEntries();return r;}
    orderChange(a,b){const r=super.orderChange(a,b);if(r?.ok)this._grandHandleEntries();return r;}
    getStatusSummary(id){return super.getStatusSummary(id).map(s=>({...s,name:NAMES[s.type]||s.name,sourceType:s.sourceType,unremovable:Boolean(s.unremovable)}));}
  }

  ENGINE.BattleEngine=GrandScoreEngine;
  Object.keys(NAMES).forEach(type=>DATA.statusIcons[type]=DATA.statusIcons[type]||'Statusup.webp');
  const RUNTIME={STORAGE_KEY,GROUPS,MASTER_TYPES,NAMES,active,alive,add,find,all,remove,consume,clamp,resolveConfig,scaleEffect};
  const API={fullyUnlocked:true,maximumValues:true,noPerClassServantLimit:true,storageKey:STORAGE_KEY,grandFouBonus:{hp:1000,atk:1000,treatedAsFouEnhancement:true},masterSkill:{numericEffectMultiplier:1.5,durationAndCountUnaffected:true,cooldownSpeedMultiplier:2,nonStacking:true,scalableTypes:[...MASTER_TYPES]},classGroups:{...GROUPS}};
  DATA.grandScore=API;global.FGO_SIM_GRAND_SCORE=API;global.FGO_SIM_GRAND_SCORE_RUNTIME=RUNTIME;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
