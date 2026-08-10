"use client";
import {FormEvent,useEffect,useState} from "react";
import {fetchJson} from "@/src/lib/client";
type T={id:string;title:string;status:string;priority:string;dueDate:string|null};
const priorityName=(v:string)=>({LOW:"Низкий",MEDIUM:"Средний",HIGH:"Высокий"}[v]??v);
export default function Tasks(){
 const [rows,setRows]=useState<T[]>([]),[title,setTitle]=useState(""),[priority,setPriority]=useState("MEDIUM"),[message,setMessage]=useState(""),[loadError,setLoadError]=useState("");
 const load=async()=>{const {data,error}=await fetchJson<T[]>("/api/tasks",[]);setRows(Array.isArray(data)?data:[]);setLoadError(error)};
 useEffect(()=>{load()},[]);
 async function add(e:FormEvent){
  e.preventDefault();
  const r=await fetch("/api/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,priority})}).catch(()=>null);
  if(r?.ok){setTitle("");setMessage("Задача создана");load()}else setMessage("Введите название задачи (минимум 3 символа)");
 }
 async function setStatus(id:string,status:string){
  const r=await fetch("/api/tasks",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status})}).catch(()=>null);
  if(r?.ok)load();else setMessage("Не удалось обновить задачу");
 }
 async function remove(id:string){
  if(!confirm("Удалить задачу?"))return;
  const r=await fetch(`/api/tasks?id=${id}`,{method:"DELETE"}).catch(()=>null);
  if(r?.ok)load();else setMessage("Не удалось удалить задачу");
 }
 return <><h2>Задачи</h2>
 {loadError&&<p className="error">{loadError}</p>}
 <form onSubmit={add} className="task-form">
  <label>Новая задача<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={3}/></label>
  <label>Приоритет<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="LOW">Низкий</option><option value="MEDIUM">Средний</option><option value="HIGH">Высокий</option></select></label>
  <button>Добавить</button>
 </form>
 <p>{message}</p>
 <table><thead><tr><th>Задача</th><th>Приоритет</th><th>Статус</th><th></th></tr></thead><tbody>
 {rows.map(t=><tr key={t.id}>
  <td>{t.title}</td><td>{priorityName(t.priority)}</td>
  <td><select value={t.status} onChange={e=>setStatus(t.id,e.target.value)}><option value="TODO">К выполнению</option><option value="IN_PROGRESS">В работе</option><option value="DONE">Готово</option></select></td>
  <td><button className="small cancel" onClick={()=>remove(t.id)}>Удалить</button></td>
 </tr>)}
 </tbody></table></>;
}
