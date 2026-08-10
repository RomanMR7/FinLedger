"use client";
import {FormEvent,useEffect,useState} from "react";
import {fetchJson} from "@/src/lib/client";
type R={id:string;name:string;type:string;maskedValue:string;dailyLimit:number;monthlyLimit:number;balance:number;usedToday:number;availableToday:number;usagePercent:number;usedMonth:number;availableMonth:number;monthPercent:number;active:boolean};
const init={name:"",type:"SIM",maskedValue:"",dailyLimit:15000,monthlyLimit:450000,balance:0};
export default function Requisites(){
 const [rows,setRows]=useState<R[]>([]),[f,setF]=useState(init),[message,setMessage]=useState(""),[loadError,setLoadError]=useState("");
 const load=async()=>{const {data,error}=await fetchJson<R[]>("/api/requisites",[]);setRows(Array.isArray(data)?data:[]);setLoadError(error)};
 useEffect(()=>{load()},[]);
 const set=(k:string,v:string)=>setF(x=>({...x,[k]:["name","type","maskedValue"].includes(k)?v:Number(v)}));
 async function add(e:FormEvent){
  e.preventDefault();
  const r=await fetch("/api/requisites",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(f)}).catch(()=>null);
  if(r?.ok){setF(init);setMessage("Реквизит добавлен");load()}else setMessage("Проверьте название, маску и лимиты");
 }
 async function upd(id:string,key:string,value:string){
  const r=await fetch("/api/requisites",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,[key]:key==="active"?value==="true":Number(value)})}).catch(()=>null);
  if(r?.ok){setMessage("Изменение сохранено");load()}else setMessage("Не удалось сохранить изменение");
 }
 async function remove(r:R){
  if(!confirm(`Удалить реквизит «${r.name}»? Операции с ним сохранятся без привязки к реквизиту.`))return;
  const response=await fetch(`/api/requisites?id=${encodeURIComponent(r.id)}`,{method:"DELETE"}).catch(()=>null);
  if(response?.ok){setMessage("Реквизит удалён");load()}else setMessage("Не удалось удалить реквизит");
 }
 return <><h2>Реквизиты и лимиты</h2><p>Дневной и месячный лимиты всех карт, SIM и QR задаются вами вручную.</p>
 {loadError&&<p className="error">{loadError}</p>}
 <form onSubmit={add} className="add-form"><h3>Добавить реквизит</h3><div className="grid">
  <label>Название<input required value={f.name} onChange={e=>set("name",e.target.value)}/></label>
  <label>Тип<select value={f.type} onChange={e=>set("type",e.target.value)}><option value="SIM">SIM-карта</option><option value="BANK_CARD">Банковская карта / QR</option></select></label>
  <label>Маска номера<input required placeholder="+7 9•• •••-12-34 или •••• 1234" value={f.maskedValue} onChange={e=>set("maskedValue",e.target.value)}/></label>
  <Num label="Дневной лимит, ₽" value={f.dailyLimit} set={v=>set("dailyLimit",v)}/>
  <Num label="Месячный лимит, ₽" value={f.monthlyLimit} set={v=>set("monthlyLimit",v)}/>
  <Num label="Текущий баланс, ₽" value={f.balance} set={v=>set("balance",v)}/>
 </div><button>Добавить реквизит</button></form>
 <p>{message}</p>
 <section className="cards">{rows.map(r=><article key={r.id}>
  <strong>{r.name}</strong><small>{r.type==="SIM"?"SIM-карта":"Карта / QR"} · {r.maskedValue}</small>
  <label>Дневной лимит, ₽<input type="number" min="1" defaultValue={r.dailyLimit} onBlur={e=>upd(r.id,"dailyLimit",e.target.value)}/></label>
  <label>Месячный лимит, ₽<input type="number" min="1" defaultValue={r.monthlyLimit} onBlur={e=>upd(r.id,"monthlyLimit",e.target.value)}/></label>
  <label>Статус<select value={String(r.active)} onChange={e=>upd(r.id,"active",e.target.value)}><option value="true">Активен</option><option value="false">Неактивен</option></select></label>
  <button type="button" className="cancel" onClick={()=>remove(r)}>Удалить</button>
  <p>Сегодня: {r.usedToday.toFixed(0)} ₽ из {r.dailyLimit.toFixed(0)} ₽ (доступно {r.availableToday.toFixed(0)} ₽)</p>
  <div className={`meter ${r.usagePercent>90?"red":r.usagePercent>=70?"yellow":"green"}`}><span style={{width:`${Math.min(100,r.usagePercent)}%`}}/></div>
  <p>Месяц: {r.usedMonth.toFixed(0)} ₽ из {r.monthlyLimit.toFixed(0)} ₽ (доступно {r.availableMonth.toFixed(0)} ₽)</p>
  <div className={`meter ${r.monthPercent>90?"red":r.monthPercent>=70?"yellow":"green"}`}><span style={{width:`${Math.min(100,r.monthPercent)}%`}}/></div>
 </article>)}</section></>;
}
function Num({label,value,set}:{label:string;value:number;set:(v:string)=>void}){return <label>{label}<input required type="number" min="0" value={value} onFocus={e=>e.currentTarget.select()} onChange={e=>set(e.target.value)}/></label>}
