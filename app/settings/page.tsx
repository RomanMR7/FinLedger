"use client";
import {useEffect,useState} from "react";
import {fetchJson} from "@/src/lib/client";
type Data={tariffs:{id:string;name:string;percent:string|number}[];currencies:{code:string;rateToRub:string|number}[]};
const empty:Data={tariffs:[],currencies:[]};
export default function Settings(){
 const [d,setD]=useState<Data>(empty),[loadError,setLoadError]=useState(""),[message,setMessage]=useState("");
 const load=async()=>{const {data,error}=await fetchJson<Data>("/api/settings",empty);setD(data&&Array.isArray(data.tariffs)?data:empty);setLoadError(error)};
 useEffect(()=>{load()},[]);
 async function upd(kind:string,id:string,value:string){
  const r=await fetch("/api/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({kind,id,value:Number(value)})}).catch(()=>null);
  setMessage(r?.ok?"Сохранено":"Не удалось сохранить значение");
  load();
 }
 return <><h2>Тарифы и курсы</h2><p>Это справочные значения для новых операций. В форме каждой операции их можно изменить вручную без изменения справочника.</p>
 {loadError&&<p className="error">{loadError}</p>}
 <p>{message}</p>
 <h3>Тарифы</h3>{d.tariffs.map(x=><label className="line" key={x.id}>{x.name}<input type="number" step="0.01" min="0" defaultValue={Number(x.percent)} onBlur={e=>upd("tariff",x.id,e.target.value)}/>%</label>)}
 <h3>Курсы к RUB</h3>{d.currencies.map(x=><label className="line" key={x.code}>{x.code}<input type="number" step="0.0001" min="0" defaultValue={Number(x.rateToRub)} onBlur={e=>upd("currency",x.code,e.target.value)}/></label>)}</>;
}
