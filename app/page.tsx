import {dashboardData} from "@/src/lib/dashboard";
import Link from "next/link";
export const dynamic="force-dynamic";
const statusName=(v:string)=>({DRAFT:"Черновики",PROCESSING:"В работе",COMPLETED:"Завершены",CANCELLED:"Отменены"}[v]??v);
const order=["DRAFT","PROCESSING","COMPLETED","CANCELLED"];
export default async function Page(){
 let d:Awaited<ReturnType<typeof dashboardData>>|null=null;
 let error="";
 try{d=await dashboardData()}catch{error="База данных недоступна. Запустите её командой npm run db:up, затем npm run db:setup."}
 if(!d)return <><h2>Дашборд</h2><p className="error">{error}</p></>;
 const drafts=d.byStatus.find(s=>s.status==="DRAFT"),processing=d.byStatus.find(s=>s.status==="PROCESSING");
 const pending=(drafts?.count??0)+(processing?.count??0);
 const sorted=[...d.byStatus].sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status));
 return <><h2>Дашборд</h2>
 <h3>Итоги по завершённым операциям</h3>
 <section className="cards">
  <Card t="Завершено" v={d.count}/>
  <Card t="Получено" v={`${d.received.toFixed(2)} ₽`}/>
  <Card t="Прибыль" v={`${d.profit.toFixed(2)} ₽`}/>
  <Card t="Расходы" v={`${d.expenses.toFixed(2)} ₽`}/>
 </section>
 <h3>Сегодня</h3>
 <section className="cards">
  <Card t="Завершено сегодня" v={d.today.count}/>
  <Card t="Получено сегодня" v={`${d.today.received.toFixed(2)} ₽`}/>
  <Card t="Прибыль сегодня" v={`${d.today.profit.toFixed(2)} ₽`}/>
  <Card t="Не завершено" v={pending}/>
 </section>
 {pending>0&&<><h3>Ждёт обмена</h3>
 <section className="cards">
  <Card t="Открытых операций" v={d.awaiting.openCount}/>
  <Card t="Осталось обменять" v={`${d.awaiting.rub.toFixed(2)} ₽`}/>
  <Card t="Уже обменяно (частями)" v={`${d.awaiting.exchangedRub.toFixed(2)} ₽`}/>
  <Card t="Принято всего" v={`${(d.awaiting.rub+d.awaiting.exchangedRub).toFixed(2)} ₽`}/>
 </section>
 <p className="notice">По незавершённым операциям осталось обменять {d.awaiting.rub.toFixed(2)} ₽. Вносите каждый обмен кнопкой «Обмен» в <Link href="/operations">журнале операций</Link> — когда вся сумма обменяна, операция завершается.</p></>}
 <h3>Все операции по статусам</h3>
 <table><thead><tr><th>Статус</th><th>Кол-во</th><th>Сумма, ₽</th><th>Ожидаемая прибыль, ₽</th></tr></thead><tbody>
 {sorted.map(s=><tr key={s.status}><td>{statusName(s.status)}</td><td>{s.count}</td><td>{s.received.toFixed(2)}</td><td>{s.profit.toFixed(2)}</td></tr>)}
 {sorted.length===0&&<tr><td colSpan={4}>Операций пока нет</td></tr>}
 </tbody></table>
 <h3>Расчётные остатки</h3>
 <ul>{d.balances.map(b=><li key={b.currency}>{b.currency}: {b.balance.toFixed(2)}</li>)}</ul>
 </>;
}
function Card({t,v}:{t:string,v:string|number}){return <article><small>{t}</small><strong>{v}</strong></article>}
