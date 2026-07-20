from pathlib import Path

engine = Path('js/engine.js')
s = engine.read_text(encoding='utf-8')
s = s.replace(
"""      actor.np = Math.max(0, actor.np - 100);
      this._log(`${actor.name} 宝具「${np.name}」 OC${oc}。`, 'np');
""",
"""      // 宝具発動時は現在のゲージ量にかかわらず必ず0%へ戻す。
      // 宝具攻撃によるリチャージと宝具後効果は、この0%を起点に加算する。
      actor.np = 0;
      this._log(`${actor.name} 宝具「${np.name}」 OC${oc}。NPを0%にリセット。`, 'np');
""")
s = s.replace(
"""      let totalDamage = 0;
      let totalStars = 0;
      targets.forEach((target) => {
        const result = this._resolveAttackOnTarget(actor, target, { ...action, type: 'np', card: np.card, position: 0, critical: false }, chainContext);
        totalDamage += result.damage;
        totalStars += result.stars;
        this._addNp(actor, result.np, false);
        this._log(`${target.name}に${result.damage.toLocaleString('ja-JP')}ダメージ。`, 'damage');
      });
      this.state.nextStars += totalStars;
""",
"""      let totalDamage = 0;
      let totalStars = 0;
      let totalNpGain = 0;
      targets.forEach((target) => {
        const result = this._resolveAttackOnTarget(actor, target, { ...action, type: 'np', card: np.card, position: 0, critical: false }, chainContext);
        totalDamage += result.damage;
        totalStars += result.stars;
        totalNpGain += result.np;
        this._log(`${target.name}に${result.damage.toLocaleString('ja-JP')}ダメージ。`, 'damage');
      });
      totalNpGain = floor2(totalNpGain);
      if (totalNpGain > 0) {
        this._addNp(actor, totalNpGain, false);
        this._log(`${actor.name}の宝具攻撃によるNPリチャージ：+${totalNpGain.toFixed(2)}%。`, 'np');
      }
      this.state.nextStars += totalStars;
""")
old_chain = """      let precedingNps = 0;
      selected.forEach((action) => {
        if (!this.getAliveEnemies().length) return;
        if (action.type === 'np') {
          this._executeNp(action, chainContext, precedingNps);
          precedingNps += 1;
        } else {
          this._executeCard(action, chainContext);
        }
      });

      if (chainContext.artsChain) {
        const participants = [...new Set(selected.map((action) => action.actorId))];
        participants.forEach((id) => {
          const ally = this.getUnit(id);
          if (ally && ally.alive) this._addNp(ally, 20, true);
        });
        this._log('Arts CHAIN効果：参加者のNPが20%増加。', 'chain');
      }
      if (chainContext.quickChain) {
        this.state.nextStars += 20;
        this._log('Quick CHAIN効果：スター20個獲得（次ターン）。', 'chain');
      }
"""
new_chain = """      // Q/A/Bチェインの成立効果は、3枚の攻撃を始める前に適用する。
      // ArtsチェインのNP+20%は宝具発動前に加算され、宝具使用時に0%へリセットされる。
      if (chainContext.artsChain) {
        const participants = [...new Set(selected.map((action) => action.actorId))];
        participants.forEach((id) => {
          const ally = this.getUnit(id);
          if (ally && ally.alive) this._addNp(ally, 20, true);
        });
        this._log('Arts CHAIN効果：攻撃前に参加者のNPが20%増加。', 'chain');
      }
      if (chainContext.quickChain) {
        this.state.nextStars += 20;
        this._log('Quick CHAIN効果：攻撃前にスター20個獲得（次ターン）。', 'chain');
      }

      let precedingNps = 0;
      selected.forEach((action) => {
        if (!this.getAliveEnemies().length) return;
        if (action.type === 'np') {
          this._executeNp(action, chainContext, precedingNps);
          precedingNps += 1;
        } else {
          this._executeCard(action, chainContext);
        }
      });
"""
if old_chain not in s:
    raise SystemExit('engine chain block not found')
s = s.replace(old_chain, new_chain)
engine.write_text(s, encoding='utf-8')

app = Path('js/app.js')
lines = app.read_text(encoding='utf-8').splitlines()
out = []
for line in lines:
    if line.startswith('let config=load(),engine=null,pending=null'):
        line = "let config=load(),engine=null,pending=null,activeWave=0,logOpen=true,resultOpen=false,battleScrollState={};"
    elif line.startswith('function modal(){'):
        line = "function modal(){if(!pending)return'';if(pending.kind==='order'){const front=engine.getUnit(pending.front),back=engine.getUnit(pending.back);return `<div class=\"modal-backdrop\"><div class=\"target-modal-card order-change-modal\"><h2>オーダーチェンジ</h2><p class=\"order-guide\">前衛と控えを1騎ずつ選択し、最後に確定してください。</p><div class=\"order-selection-summary\"><span>前衛：<strong>${front?E(front.name):'未選択'}</strong></span><span>控え：<strong>${back?E(back.name):'未選択'}</strong></span></div><p>前衛を選択</p><div class=\"order-choice-list\">${engine.getAliveAllies().map(u=>`<button class=\"order-choice${pending.front===u.id?' selected':''}\" data-order-front=\"${u.id}\" aria-pressed=\"${pending.front===u.id}\">${E(u.name)}</button>`).join('')}</div><p>控えを選択</p><div class=\"order-choice-list\">${engine.getReserveAllies().map(u=>`<button class=\"order-choice${pending.back===u.id?' selected':''}\" data-order-back=\"${u.id}\" aria-pressed=\"${pending.back===u.id}\">${E(u.name)}</button>`).join('')}</div><div class=\"order-modal-actions\"><button id=\"order-confirm\" class=\"primary-button\" ${pending.front&&pending.back?'':'disabled'}>オーダーチェンジ確定</button><button id=\"cancel\" class=\"secondary-button\">キャンセル</button></div></div></div>`}const units=pending.target==='enemy'?engine.getAliveEnemies():engine.getAliveAllies();return `<div class=\"modal-backdrop\"><div class=\"target-modal-card\"><h2>対象選択</h2>${units.map(u=>`<button data-target=\"${u.id}\">${E(u.name)}</button>`).join('')}<button id=\"cancel\">キャンセル</button></div></div>`}"
    elif line.startswith('function renderBattle(){'):
        line = "function captureBattleScroll(){const selectors=['.ally-row','.enemy-row','.np-row','.command-row','.skills-row'],out={};selectors.forEach(sel=>{out[sel]=[...root.querySelectorAll(sel)].map(el=>el.scrollLeft)});battleScrollState=out}function restoreBattleScroll(){Object.entries(battleScrollState).forEach(([sel,values])=>{[...root.querySelectorAll(sel)].forEach((el,i)=>{el.scrollLeft=values[i]||0})})}function renderBattle(){captureBattleScroll();const s=engine.getState(),displayedAllies=s.allies.slice().sort((a,b)=>Number(b.frontline)-Number(a.frontline)||a.slot-b.slot);root.innerHTML=`<main class=\"battle-screen\"><header class=\"battle-header\"><div class=\"battle-title\"><span>WAVE ${s.wave}/${s.maxWaves}</span><strong>TURN ${s.turn}</strong><small>SEED ${engine.seed}</small></div><div class=\"battle-resources\"><strong>★ ${s.stars}</strong></div><div class=\"header-actions\"><button id=\"back\">編成設定</button></div></header><section class=\"battlefield\"><div class=\"enemy-row\">${s.enemies.map(enemy).join('')}</div></section><section class=\"battlefield\"><div class=\"ally-row\">${displayedAllies.map(ally).join('')}</div></section>${mystic()}<section class=\"command-panel\"><div class=\"np-row\">${engine.getAliveAllies().map(np).join('')}</div><div class=\"command-row\">${s.hand.map(actionCard).join('')}</div><div class=\"command-actions\"><button id=\"clear\">選択解除</button><button id=\"go\" ${s.selectedActions.length===3?'':'disabled'}>攻撃開始</button></div></section><section class=\"battle-log${logOpen?' open':''}\"><button id=\"logtoggle\" class=\"log-toggle\">BATTLE LOG</button><div class=\"log-list\">${logs()}</div></section></main>${modal()}${result()}`;bind();restoreBattleScroll()}"
    elif line.startswith('function bind(){'):
        old = "root.querySelectorAll('[data-order-front]').forEach(b=>b.onclick=()=>{pending.front=b.dataset.orderFront;renderBattle()});root.querySelectorAll('[data-order-back]').forEach(b=>b.onclick=()=>{pending.back=b.dataset.orderBack;if(pending.front&&pending.back){engine.orderChange(pending.front,pending.back);engine.getState().mysticCodeCooldowns[pending.index]=Math.max(1,15-(engine.config.mysticCodeLevel>=6?1:0)-(engine.config.mysticCodeLevel>=10?1:0));pending=null}renderBattle()});"
        new = "root.querySelectorAll('[data-order-front]').forEach(b=>b.onclick=()=>{pending.front=b.dataset.orderFront;renderBattle()});root.querySelectorAll('[data-order-back]').forEach(b=>b.onclick=()=>{pending.back=b.dataset.orderBack;renderBattle()});const oc=root.querySelector('#order-confirm');if(oc)oc.onclick=()=>{if(!pending.front||!pending.back)return;const r=engine.orderChange(pending.front,pending.back);if(!r.ok){alert(r.reason);return}engine.getState().mysticCodeCooldowns[pending.index]=Math.max(1,15-(engine.config.mysticCodeLevel>=6?1:0)-(engine.config.mysticCodeLevel>=10?1:0));pending=null;renderBattle()};"
        if old not in line:
            raise SystemExit('app order bind block not found')
        line = line.replace(old, new)
    out.append(line)
app.write_text('\n'.join(out) + '\n', encoding='utf-8')

css = Path('css/styles.css')
css_text = css.read_text(encoding='utf-8')
marker = '/* v1.3.4 order change selection */'
if marker not in css_text:
    css_text += """

/* v1.3.4 order change selection */
.order-change-modal{max-width:560px}.order-guide{color:var(--muted);margin-bottom:12px}.order-selection-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.04)}.order-selection-summary span{display:block}.order-choice-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.target-modal-card .order-choice{margin:0;border:1px solid var(--line-strong);background:#20283b}.target-modal-card .order-choice.selected,.target-modal-card .order-choice[aria-pressed=true]{outline:3px solid var(--gold-strong);background:#4a3d20;color:#fff;box-shadow:0 0 0 2px rgba(255,221,133,.18)}.order-modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.order-modal-actions button{margin:0}@media(max-width:600px){.order-choice-list{grid-template-columns:1fr}.order-selection-summary,.order-modal-actions{grid-template-columns:1fr}}
"""
css.write_text(css_text, encoding='utf-8')

Path('tests/command-regression.js').write_text(r"""'use strict';
const { BattleEngine } = require('../js/engine.js');
function assert(condition, message) { if (!condition) throw new Error(message); console.log(`PASS ${message}`); }
const config={seed:1,party:[{servantId:'artoriaCaster',startingNp:100,npLevel:1,skillLevel:10,craftEssenceId:'none'},{servantId:'koyanskayaLight',startingNp:0,npLevel:1,skillLevel:10,craftEssenceId:'none'},{servantId:'fenrir',startingNp:0,npLevel:1,skillLevel:10,craftEssenceId:'none'},{servantId:'skadiCaster',startingNp:0,npLevel:1,skillLevel:10,craftEssenceId:'none'}],waves:[{enabled:true,enemies:[{enabled:true,name:'検証用',classId:'saber',attribute:'man',traits:[],hp:9999999,attack:1,dtdr:1,deathRate:0,chargeMax:3,critRate:0}]}]};
const chainEngine=new BattleEngine(config),artsActor=chainEngine.state.allies[0];let npAtExecution=null;
chainEngine.state.selectedActions=[{type:'np',actorId:artsActor.id,card:'arts'},{type:'card',actorId:artsActor.id,card:'arts',cardId:'dummy-1'},{type:'card',actorId:artsActor.id,card:'arts',cardId:'dummy-2'}];
chainEngine._executeNp=function(){npAtExecution=artsActor.np;artsActor.np=0};chainEngine._executeCard=function(){};chainEngine._executeExtra=function(){};chainEngine._performEnemyTurn=function(){};
assert(chainEngine.executeCommandChain().ok,'Artsチェイン検証コマンドが実行できる');assert(npAtExecution===120,'ArtsチェインのNP+20%が宝具攻撃前に適用される');
const npEngine=new BattleEngine(config),npActor=npEngine.state.allies[0];npActor.np=250;npActor.data.np.target='allEnemies';npEngine._calculateOc=()=>2;npEngine._resolveAttackOnTarget=()=>({damage:1000,np:12.34,stars:0});npEngine._executeNp({type:'np',actorId:npActor.id,card:'arts'},{firstBonuses:{arts:false,quick:false,buster:false},artsChain:false,quickChain:false,busterChain:false},0);assert(npActor.np===12.34,'宝具使用時は0%へ戻してリチャージだけ加算する');assert(npEngine.state.logs.some(log=>log.message.includes('宝具攻撃によるNPリチャージ：+12.34%')),'宝具リチャージ量がログへ記録される');
const orderEngine=new BattleEngine(config),outgoing=orderEngine.state.allies[0],incoming=orderEngine.state.allies[3];outgoing.cooldowns=[5,6,7];incoming.cooldowns=[0,0,0];assert(orderEngine.orderChange(outgoing.id,incoming.id).ok,'オーダーチェンジが実行できる');assert(incoming.frontline&&incoming.cooldowns.every(v=>v===0),'控えのスキル状態が独立して維持される');assert(!outgoing.frontline&&outgoing.cooldowns.join(',')==='5,6,7','使用済み状態は本人だけに残る');
""", encoding='utf-8')
