"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {calculateDeal} from "@/src/lib/financial";
import {fetchJson} from "@/src/lib/client";
type Payout={id:string;amountRub:string;clientRate:string;actualRate:string;payoutUsdt:string;tariffProfit:string;exchangeProfit:string;totalProfit:string;date:string};
type Op={id:string;number:number;date:string;status:string;receivedAmount:string;tariffPercent:string;clientRate:string|null;actualExchangeRate:string|null;expenses:string;purchaseAmountRub:string|null;purchasedUsdt:string|null;sentAmount:string;expectedCommission:string;exchangeProfit:string|null;totalProfit:string|null;actualResult:string;requisiteId:string|null;payouts?:Payout[];author?:{name:string;email:string}};
type F={receivedAmount:number;tariffPercent:number;clientRate:number;actualExchangeRate:number;expenses:number;purchaseAmountRub:number};
type PayoutF={amountRub:number;clientRate:number;actualRate:number};
type Tariff={id:string;name:string;percent:string|number};
type Requisite={id:string;name:string;active:boolean;availableToday:number};type Rate={id:string;name:string;clientRate:string|number;actualRate:string|number};
const initial:F={receivedAmount:0,tariffPercent:0,clientRate:92,actualExchangeRate:86.15,expenses:0,purchaseAmountRub:0};
const statusName=(v:string)=>({DRAFT:"Черновик",PROCESSING:"В работе",COMPLETED:"Завершена",CANCELLED:"Отменена"}[v]??v);
const paidOf=(x:Op)=>(x.payouts??[]).reduce((a,p)=>a+Number(p.amountRub),0);
const remainingOf=(x:Op)=>Math.max(0,Number(x.receivedAmount)-paidOf(x));
export default function Operations(){
 const [f,setF]=useState<F>(initial),[tariffs,setTariffs]=useState<Tariff[]>([]),[rates,setRates]=useState<Rate[]>([]),[requisites,setRequisites]=useState<Requisite[]>([]),[requisiteId,setRequisiteId]=useState(""),[choice,setChoice]=useState("0");
 const [ef,setEf]=useState<F>(initial),[editRequisiteId,setEditRequisiteId]=useState("");
 const [pf,setPf]=useState<PayoutF>({amountRub:0,clientRate:92,actualRate:86.15});
 const [rows,setRows]=useState<Op[]>([]),[meta,setMeta]=useState({page:1,totalPages:1,total:0});
 const [canCustom,setCanCustom]=useState(false);
 const [status,setStatus]=useState(""),[search,setSearch]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
 const [selected,setSelected]=useState<Op|null>(null),[mode,setMode]=useState<"view"|"edit"|"payout">("view"),[message,setMessage]=useState(""),[loadError,setLoadError]=useState("");
 const c=useMemo(()=>calculateDeal({amountRub:f.receivedAmount,tariffPercent:f.tariffPercent,clientRate:f.clientRate,actualRate:f.actualExchangeRate,expenses:f.expenses}),[f]);
 const ec=useMemo(()=>calculateDeal({amountRub:ef.receivedAmount,tariffPercent:ef.tariffPercent,clientRate:ef.clientRate,actualRate:ef.actualExchangeRate,expenses:ef.expenses}),[ef]);
 const pc=useMemo(()=>selected?calculateDeal({amountRub:pf.amountRub,tariffPercent:Number(selected.tariffPercent),clientRate:pf.clientRate,actualRate:pf.actualRate}):null,[pf,selected]);
 const load=async(page=1)=>{
  const q=new URLSearchParams();q.set("page",String(page));q.set("pageSize","25");
  if(status)q.set("status",status);if(search)q.set("search",search);if(from)q.set("from",from);if(to)q.set("to",to);
  const {data,error}=await fetchJson<{items:Op[];page:number;totalPages:number;total:number}>(`/api/operations?${q}`,{items:[],page:1,totalPages:1,total:0});
  setRows(Array.isArray(data.items)?data.items:[]);
  setMeta({page:data.page||1,totalPages:data.totalPages||1,total:data.total||0});
  setLoadError(error);
 };
 const loadRefs=async()=>{
  const [s,r,rateData]=await Promise.all([
   fetchJson<{tariffs:Tariff[]}>("/api/settings",{tariffs:[]}),
   fetchJson<Requisite[]>("/api/requisites",[]),
   fetchJson<Rate[]>("/api/rates",[])
  ]);
  setTariffs(Array.isArray(s.data.tariffs)?s.data.tariffs:[]);
  setRequisites(Array.isArray(r.data)?r.data:[]);setRates(Array.isArray(rateData.data)?rateData.data:[]);
 };
 /* eslint-disable react-hooks/exhaustive-deps */
 useEffect(()=>{loadRefs();load();fetchJson<{canUseCustomTariff:boolean}>("/api/auth/me",{canUseCustomTariff:false}).then(r=>setCanCustom(r.data.canUseCustomTariff))},[]);
 const set=(k:keyof F,v:string)=>setF(x=>({...x,[k]:Number(v)}));
 const setE=(k:keyof F,v:string)=>setEf(x=>({...x,[k]:Number(v)}));
 const setP=(k:keyof PayoutF,v:string)=>setPf(x=>({...x,[k]:Number(v)}));
 async function refreshOne(id:string){
  const {data}=await fetchJson<Op|null>(`/api/operations/${id}`,null);
  if(data&&data.id){setRows(a=>a.map(v=>v.id===id?data:v));setSelected(s=>s&&s.id===id?data:s)}
 }
 async function save(e:FormEvent){
  e.preventDefault();
  if(f.receivedAmount<=0)return setMessage("Введите сумму приёма");
  const body={...f,requisiteId:requisiteId||undefined};
  const r=await fetch("/api/operations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).catch(()=>null);
  if(r?.ok){setMessage("Операция сохранена.");setF(initial);setRequisiteId("");setChoice("0");load();loadRefs()}
  else setMessage(r?(await r.json().catch(()=>({})))?.error??"Проверьте данные":"Нет связи с сервером");
 }
 async function action(id:string,data:Record<string,unknown>){
  const r=await fetch(`/api/operations/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data)}).catch(()=>null);
  if(r?.ok){setMessage("");await refreshOne(id);loadRefs();return true}
  setMessage(r?(await r.json().catch(()=>({})))?.error??"Не удалось обновить операцию":"Нет связи с сервером");
  return false;
 }
 async function addPayout(){
  if(!selected)return;
  if(pf.amountRub<=0)return setMessage("Введите сумму обмена");
  const r=await fetch(`/api/operations/${selected.id}/payouts`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(pf)}).catch(()=>null);
  if(r?.ok){setMessage("Обмен записан");setPf(x=>({...x,amountRub:0}));await refreshOne(selected.id);load(meta.page)}
  else setMessage(r?(await r.json().catch(()=>({})))?.error??"Не удалось записать обмен":"Нет связи с сервером");
 }
 async function removePayout(payoutId:string){
  if(!selected||!confirm("Удалить эту часть обмена?"))return;
  const r=await fetch(`/api/operations/${selected.id}/payouts?payoutId=${payoutId}`,{method:"DELETE"}).catch(()=>null);
  if(r?.ok){await refreshOne(selected.id);load(meta.page)}else setMessage("Не удалось удалить обмен");
 }
 async function remove(id:string){
  if(!confirm("Удалить операцию без возможности восстановления?"))return;
  const r=await fetch(`/api/operations/${id}`,{method:"DELETE"}).catch(()=>null);
  if(r?.ok){setRows(a=>a.filter(x=>x.id!==id));setSelected(null);loadRefs()}else setMessage("Не удалось удалить операцию");
 }
 function openEdit(x:Op){
  setSelected(x);
  setEf({receivedAmount:Number(x.receivedAmount),tariffPercent:Number(x.tariffPercent),clientRate:Number(x.clientRate??92),actualExchangeRate:Number(x.actualExchangeRate??86.15),expenses:Number(x.expenses),purchaseAmountRub:0});
  setEditRequisiteId(x.requisiteId??"");
  setMode("edit");
 }
 function openPayout(x:Op){
  setSelected(x);
  setPf({amountRub:remainingOf(x),clientRate:Number(x.clientRate??92),actualRate:Number(x.actualExchangeRate??86.15)});
  setMode("payout");
 }
 const requisiteOptions=(current:string)=>requisites.filter(r=>r.active||r.id===current).map(r=><option key={r.id} value={r.id}>{r.name} · доступно {Number(r.availableToday).toFixed(0)} ₽</option>);
 const closeModal=()=>{setSelected(null);setMode("view");setMessage("")};
 return <><h2>Операции</h2>
 {loadError&&<p className="error">{loadError}</p>}
 <form onSubmit={save}><div className="grid">
  <Num label="Получено, ₽" value={f.receivedAmount} set={v=>set("receivedAmount",v)}/>
  <label>Схема расчёта<select value={choice} onChange={e=>{const value=e.target.value;setChoice(value);if(value!=="manual")set("tariffPercent",value)}}><option value="0">По курсу (без тарифа)</option>{tariffs.map(t=><option key={t.id} value={t.percent}>По тарифу — {Number(t.percent)}%</option>)}{canCustom&&<option value="manual">Свой процент</option>}</select></label>{choice!=="0"&&canCustom&&<Num label="Тариф, %" value={f.tariffPercent} set={v=>{set("tariffPercent",v);setChoice("manual")}}/>}
  {rates.length>0&&<label>Пара курсов<select defaultValue="" onChange={e=>{const rate=rates.find(x=>x.id===e.target.value);if(rate){set("clientRate",String(rate.clientRate));set("actualExchangeRate",String(rate.actualRate))}}}><option value="">Выберите курс</option>{rates.map(rate=><option value={rate.id} key={rate.id}>{rate.name}: {rate.clientRate} / {rate.actualRate}</option>)}</select></label>}
  <label>Карта / SIM приёма<select value={requisiteId} onChange={e=>setRequisiteId(e.target.value)}><option value="">Без привязки</option>{requisiteOptions(requisiteId)}</select></label>
  <Num label="Курс заливки на карту, ₽ за 1 USDT" value={f.clientRate} set={v=>set("clientRate",v)}/>
  <Num label="Курс покупки USDT, ₽ за 1 USDT" value={f.actualExchangeRate} set={v=>set("actualExchangeRate",v)}/><Num label="Потрачено на покупку USDT, ₽" value={f.purchaseAmountRub} set={v=>set("purchaseAmountRub",v)}/>
  <Num label="Расходы, ₽" value={f.expenses} set={v=>set("expenses",v)}/>
 </div><Summary c={c}/>{f.purchaseAmountRub>0&&<p className="notice">Куплено: {(f.purchaseAmountRub/f.actualExchangeRate).toFixed(4)} USDT · Осталось отдать: {Math.max(0,c.payoutUsdt-f.purchaseAmountRub/f.actualExchangeRate).toFixed(4)} USDT</p>}<button>Сохранить новую операцию</button></form>
 <p>{message}</p>
 <h3>Журнал операций ({meta.total})</h3>
 <section className="filter">
  <input placeholder="Номер операции" value={search} onChange={e=>setSearch(e.target.value)}/>
  <select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Все статусы</option><option value="DRAFT">Черновик</option><option value="PROCESSING">В работе</option><option value="COMPLETED">Завершена</option><option value="CANCELLED">Отменена</option></select>
  <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
  <input type="date" value={to} onChange={e=>setTo(e.target.value)}/>
  <button type="button" onClick={()=>load()}>Применить</button>
 </section>
 <div className="pager">
  <button type="button" disabled={meta.page<=1} onClick={()=>load(meta.page-1)}>← Назад</button>
  <span>Страница {meta.page} из {meta.totalPages||1}</span>
  <button type="button" disabled={meta.page>=meta.totalPages} onClick={()=>load(meta.page+1)}>Вперёд →</button>
 </div>
 <table><thead><tr><th>№</th><th>Дата</th><th>Трейдер</th><th>Сумма</th><th>Обменяно</th><th>USDT</th><th>Доход</th><th>Статус</th><th></th></tr></thead><tbody>
 {rows.map(x=>{const paid=paidOf(x),remaining=remainingOf(x),open=x.status!=="COMPLETED"&&x.status!=="CANCELLED";return <tr key={x.id}>
  <td>{x.number}</td><td>{new Date(x.date).toLocaleDateString("ru-RU")}</td><td>{x.author?.name??"—"}</td><td>{Number(x.receivedAmount).toFixed(2)} ₽</td>
  <td>{(x.payouts?.length??0)>0?`${paid.toFixed(0)} ₽${remaining>0?` (ост. ${remaining.toFixed(0)})`:" ✓"}`:"—"}</td>
  <td>{Number(x.sentAmount).toFixed(4)}</td><td>{Number(x.totalProfit??x.actualResult).toFixed(2)} ₽</td><td>{statusName(x.status)}</td>
  <td>
   {open&&<button className="small done" onClick={()=>openPayout(x)}>Обмен</button>}
   {open&&remaining<=0.01&&(x.payouts?.length??0)>0&&<button className="small done" onClick={()=>action(x.id,{status:"COMPLETED"})}>Завершить</button>}
   <button className="small" onClick={()=>{setMode("view");setSelected(x)}}>Детали</button>
   <button className="small" onClick={()=>openEdit(x)}>Изменить</button>
   <button className="small cancel" onClick={()=>remove(x.id)}>Удалить</button>
  </td>
 </tr>})}
 </tbody></table>
 {selected&&<div className="modal-backdrop" onClick={closeModal}><section className="modal wide" onClick={e=>e.stopPropagation()}>
 {mode==="edit"&&<>
  <h3>Редактирование операции №{selected.number}</h3>
  {(selected.payouts?.length??0)>0&&<p className="notice">По операции уже есть частичные обмены — курсы и итоги считаются по ним. Здесь можно поменять сумму приёма, расходы и карту.</p>}
  <div className="grid">
   <Num label="Получено, ₽" value={ef.receivedAmount} set={v=>setE("receivedAmount",v)}/>
   {rates.length>0&&<label>Пара курсов<select defaultValue="" onChange={e=>{const rate=rates.find(x=>x.id===e.target.value);if(rate){set("clientRate",String(rate.clientRate));set("actualExchangeRate",String(rate.actualRate))}}}><option value="">Выберите курс</option>{rates.map(rate=><option value={rate.id} key={rate.id}>{rate.name}: {rate.clientRate} / {rate.actualRate}</option>)}</select></label>}
  <label>Карта / SIM приёма<select value={editRequisiteId} onChange={e=>setEditRequisiteId(e.target.value)}><option value="">Без привязки</option>{requisiteOptions(editRequisiteId)}</select></label>
   <Num label="Тариф, % (0 — по курсу)" value={ef.tariffPercent} set={v=>setE("tariffPercent",v)}/>
   {(selected.payouts?.length??0)===0&&<>
    <Num label="Курс заливки на карту, ₽ за 1 USDT" value={ef.clientRate} set={v=>setE("clientRate",v)}/>
    <Num label="Курс покупки USDT, ₽ за 1 USDT" value={ef.actualExchangeRate} set={v=>setE("actualExchangeRate",v)}/>
   </>}
   <Num label="Расходы" value={ef.expenses} set={v=>setE("expenses",v)}/>
  </div>
  {(selected.payouts?.length??0)===0&&<Summary c={ec}/>}
  <button onClick={async()=>{const ok=await action(selected.id,{receivedAmount:ef.receivedAmount,tariffPercent:ef.tariffPercent,clientRate:ef.clientRate,actualExchangeRate:ef.actualExchangeRate,expenses:ef.expenses,requisiteId:editRequisiteId||null});if(ok)setMode("view")}}>Сохранить изменения</button>
 </>}
 {mode==="payout"&&<>
  <h3>Обмен по операции №{selected.number}</h3>
  <PayoutInfo op={selected}/>
  <div className="grid">
   <Num label="Сумма этого обмена, ₽" value={pf.amountRub} set={v=>setP("amountRub",v)}/>
   <Num label="Курс заливки на карту, ₽ за 1 USDT" value={pf.clientRate} set={v=>setP("clientRate",v)}/>
   <Num label="Курс покупки USDT, ₽ за 1 USDT" value={pf.actualRate} set={v=>setP("actualRate",v)}/>
  </div>
  {pc&&pf.amountRub>0&&<section className="cards">
   <Card t="Клиенту отправить" v={`${pc.payoutUsdt.toFixed(4)} USDT`}/>
   {Number(selected.tariffPercent)>0&&<Card t="Доход по тарифу" v={`${pc.tariffProfit.toFixed(2)} ₽`}/>}
   <Card t="Доход на курсах" v={`${pc.exchangeProfitRub.toFixed(2)} ₽ · ${(pc.exchangeProfitRub/pf.actualRate).toFixed(4)} USDT`}/>
   <Card t="Доход с части" v={`${pc.totalProfitRub.toFixed(2)} ₽ · ${(pc.totalProfitRub/pf.actualRate).toFixed(4)} USDT`}/>
  </section>}
  <button onClick={addPayout}>Записать обмен</button>
  <PayoutList op={selected} onRemove={removePayout}/>
  {remainingOf(selected)<=0.01&&(selected.payouts?.length??0)>0&&selected.status!=="COMPLETED"&&<button className="done-big" onClick={()=>action(selected.id,{status:"COMPLETED"})}>Вся сумма обменяна — завершить операцию</button>}
 </>}
 {mode==="view"&&<>
  <h3>Операция №{selected.number} — {statusName(selected.status)}</h3>
  <p>Трейдер: {selected.author?.name??"—"}</p><p>Получено: {Number(selected.receivedAmount).toFixed(2)} ₽{Number(selected.tariffPercent)>0?` · Тариф: ${Number(selected.tariffPercent)}%`:" · По курсу без тарифа"}</p>
  <p>Курс заливки: {selected.clientRate?Number(selected.clientRate).toFixed(4):"—"} ₽/USDT · Курс покупки: {selected.actualExchangeRate?Number(selected.actualExchangeRate).toFixed(4):"—"} ₽/USDT{(selected.payouts?.length??0)>0&&" (средневзвешенные по частям)"}</p>
  <p>Клиенту: {Number(selected.sentAmount).toFixed(4)} USDT{Number(selected.expectedCommission)>0?` · Доход по тарифу: ${Number(selected.expectedCommission).toFixed(2)} ₽`:""}</p>
  <p>Доход на курсах: {selected.exchangeProfit!=null?`${Number(selected.exchangeProfit).toFixed(2)} ₽`:"—"} · Общий доход: {Number(selected.totalProfit??selected.actualResult).toFixed(2)} ₽</p>
  <PayoutList op={selected} onRemove={selected.status!=="COMPLETED"?removePayout:undefined}/>
  {selected.status!=="COMPLETED"&&selected.status!=="CANCELLED"&&<button onClick={()=>openPayout(selected)}>Записать обмен</button>}
  {selected.status!=="COMPLETED"&&<button onClick={()=>action(selected.id,{status:"COMPLETED"})}>Завершить</button>}
  {selected.status!=="CANCELLED"&&<button className="cancel" onClick={()=>action(selected.id,{status:"CANCELLED"})}>Отменить</button>}
  <button onClick={()=>openEdit(selected)}>Редактировать</button>
 </>}
 <p>{message}</p>
 <button className="cancel" onClick={closeModal}>Закрыть</button>
 </section></div>}</>;
}
function PayoutInfo({op}:{op:Op}){const owed=Number(op.sentAmount);const bought=Number(op.purchasedUsdt??0);const remaining=Math.max(0,owed-bought);return <p className={remaining>0?"notice":"ok-note"}>Должны отдать {owed.toFixed(4)} USDT · куплено {bought.toFixed(4)} USDT · <strong>осталось отдать {remaining.toFixed(4)} USDT</strong></p>}
function PayoutList({op,onRemove}:{op:Op;onRemove?:(id:string)=>void}){
 const list=op.payouts??[];
 if(list.length===0)return null;
 return <><h4>Частичные обмены</h4><table><thead><tr><th>Дата</th><th>Сумма, ₽</th><th>Курс заливки</th><th>Курс покупки</th><th>USDT</th><th>Доход, ₽</th>{onRemove&&<th></th>}</tr></thead><tbody>
 {list.map(p=><tr key={p.id}>
  <td>{new Date(p.date).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
  <td>{Number(p.amountRub).toFixed(2)}</td><td>{Number(p.clientRate).toFixed(4)}</td><td>{Number(p.actualRate).toFixed(4)}</td>
  <td>{Number(p.payoutUsdt).toFixed(4)}</td><td>{Number(p.totalProfit).toFixed(2)}</td>
  {onRemove&&<td><button className="small cancel" onClick={()=>onRemove(p.id)}>Отменить обмен</button></td>}
 </tr>)}
 </tbody></table></>;
}
function Num({label,value,set}:{label:string;value:number;set:(v:string)=>void}){const [text,setText]=useState(Number.isFinite(value)?String(value):"");useEffect(()=>{setText(Number.isFinite(value)?String(value):"")},[value]);return <label>{label}<input required type="text" inputMode="decimal" value={text} onFocus={e=>e.currentTarget.select()} onChange={e=>{const raw=e.target.value;if(!/^\d*([.,]\d*)?$/.test(raw))return;setText(raw);const normalized=raw.replace(",", ".");set(normalized===""?"NaN":normalized)}}/></label>}
function Summary({c}:{c:ReturnType<typeof calculateDeal>}){return <section className="cards"><Card t="Клиенту отправить" v={`${c.payoutUsdt.toFixed(4)} USDT`}/>{c.tariffProfit>0&&<Card t="Доход по тарифу" v={`${c.tariffProfit.toFixed(2)} ₽`}/>}<Card t="Доход на разнице курсов" v={`${c.exchangeProfitRub.toFixed(2)} ₽`}/><Card t="Общий доход" v={`${c.totalProfitRub.toFixed(2)} ₽`}/></section>}
function Card({t,v}:{t:string;v:string}){return <article><small>{t}</small><strong>{v}</strong></article>}
