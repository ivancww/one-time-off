import data from "../data/official-snapshot.json" with {type:"json"};
const names=["了解目標","資金安排","銀行比較","提取選擇","年度投影","方案比較","總結"];
const state={step:0,capital:500000,term:20,plan:"rollover",bankRate:1.5};
const $=s=>document.querySelector(s);
const money=n=>Number(n).toLocaleString("en-HK",{maximumFractionDigits:0});
const decimal=n=>Number(n).toLocaleString("en-HK",{maximumFractionDigits:6});
// A tab name is a source identifier, not confirmation of withdrawal timing.
const planLabel=p=>p.id==="rollover"?"自動滾存（不提取）":"提取安排（來源分頁："+p.sheet+"）";
const plan=id=>data.plans.find(p=>p.id===id);
const exact=(p,year)=>p.balances.find(r=>r[0]===year)?.[1]??null;
const years=[...new Set(data.plans.flatMap(p=>p.balances.map(r=>r[0])))].sort((a,b)=>a-b);
const amountField=(id,label,val,min=1)=>'<label for="'+id+'">'+label+'</label><input id="'+id+'" inputmode="decimal" type="text" value="'+decimal(val)+'" data-min="'+min+'">';
const metric=(name,value)=>'<div class="metric"><span>'+name+'</span><strong>'+value+'</strong></div>';
function body(){
const p=plan(state.plan),v=exact(p,state.term),project=v===null?null:state.capital*v;
const bank=state.capital*(1+state.bankRate/100)**state.term;
switch(state.step){
case 0:return '<h1>一筆資金，可以有幾種未來？</h1><p>先了解客人想利用一筆現有資金做咩：保留彈性、安排持續現金流，定長線累積？</p><div class="cards"><div class="metric">資金保留與流動性</div><div class="metric">提取現金流</div><div class="metric">長期資產累積</div><div class="metric">風險與回報取捨</div></div>';
case 1:return '<h1>你想點樣安排現有資金？</h1>'+amountField("capital","一次性投入資金（HK$）",state.capital,1)+'<p class="note">一次投入，並非 5Pay 分五年投入。呢個數值係投影計算基數。</p>';
case 2:return '<h1>如果將資金留喺銀行？</h1>'+amountField("bankRate","假設銀行年利率（%）",state.bankRate,0)+'<div class="grid">'+metric("一次性本金","HK$ "+money(state.capital))+metric("假設 "+state.term+" 年後銀行結餘","HK$ "+money(bank))+'</div><p class="note">銀行利率由用戶自行假設，不代表實際銀行報價；此處用複息情境作比較，非產品回報計法。</p>';
case 3:return '<h1>你希望提取現金，還是留低滾存？</h1><div class="cards">'+data.plans.map(q=>'<button class="choice" data-choice="'+q.id+'" aria-pressed="'+(state.plan===q.id)+'"><strong>'+planLabel(q)+'</strong></button>').join("")+'</div><p class="note">提取比例來自 Sheet，但開始提取年份、計算基數及實際付款日仍須正式條款確認。暫不顯示推算的累計提取額。</p>';
case 4:return '<h1>指定年度的結餘投影</h1><label for="term">查看保單年度</label><select id="term">'+years.map(y=>'<option value="'+y+'" '+(y===state.term?"selected":"")+'>'+y+' 年</option>').join("")+'</select><div class="grid">'+metric("官方表格結餘倍數",v===null?"此年度未提供":v.toFixed(6)+"×")+metric("預計結餘",project===null?"無此年度數據":"HK$ "+money(project))+'</div><p class="note">只使用 Google Sheet 指定年份的結餘倍數，不插值、不外推；提取方案之結餘不等同連同歷年提取的總回報。</p>';
case 5:return '<h1>相同本金，不同安排</h1><div class="table-wrap"><table><thead><tr><th>方案</th><th>結餘倍數</th><th>模擬結餘 HK$</th></tr></thead><tbody>'+data.plans.map(q=>{const x=exact(q,state.term);return '<tr><td>'+planLabel(q)+'</td><td>'+(x===null?"—":x.toFixed(6))+'</td><td>'+(x===null?"未有數據":money(x*state.capital))+'</td></tr>'}).join("")+'</tbody></table></div><p class="note">提取方案的累計已提取金額未計入上述比較；不能直接用此表作總收益排名。</p>';
default:return '<h1>下一步：選擇合適安排</h1><div class="grid">'+metric("一次投入","HK$ "+money(state.capital))+metric("所選方案",planLabel(p))+metric("保單年度",state.term+" 年")+metric("該年結餘",project===null?"未有數據":"HK$ "+money(project))+'</div><p>可以同客人討論現金流需求、資金動用時間、承受能力及正式產品限制。</p><button class="secondary" id="print">列印／儲存 PDF</button><p class="note">本展示未包含保證／非保證回報分類、費用、退保限制或利益說明，正式使用前必須確認。</p>';
}}
function render(){
$("#mode").textContent="銷售展示 · 原型";
$("#steps").innerHTML=names.map((n,i)=>'<button data-step="'+i+'" '+(i===state.step?'aria-current="step"':"")+">"+(i+1)+" "+n+"</button>").join("");
$("#app").innerHTML=body()+'<div class="actions"><button class="secondary" id="back" '+(state.step===0?"disabled":"")+'>上一頁</button><button class="primary" id="next" '+(state.step===6?"disabled":"")+'>下一頁</button></div>';
document.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{state.step=+b.dataset.step;render()});
document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{state.plan=b.dataset.choice;render()});
$("#back").onclick=()=>{state.step--;render()};$("#next").onclick=()=>{state.step++;render()};
const cap=$("#capital");if(cap)cap.onchange=()=>{const n=Number(cap.value.replace(/,/g,""));if(Number.isFinite(n)&&n>0)state.capital=n;render()};
const rate=$("#bankRate");if(rate)rate.onchange=()=>{const n=Number(rate.value.replace(/,/g,""));if(Number.isFinite(n)&&n>=0&&n<=100)state.bankRate=n;render()};
const term=$("#term");if(term)term.onchange=()=>{state.term=Number(term.value);render()};
const print=$("#print");if(print)print.onclick=()=>window.print();
}
render();
