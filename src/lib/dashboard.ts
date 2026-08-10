import {prisma} from "./db";
import {balances} from "./ledger";
export async function dashboardData(){
 const day=new Date();day.setHours(0,0,0,0);
 const [rows,byStatusRaw,todayAgg,openOps]=await Promise.all([
  prisma.operation.findMany({where:{status:"COMPLETED"}}),
  prisma.operation.groupBy({by:["status"],_count:{_all:true},_sum:{receivedAmount:true,totalProfit:true}}),
  prisma.operation.aggregate({where:{status:"COMPLETED",date:{gte:day}},_count:{_all:true},_sum:{receivedAmount:true,totalProfit:true}}),
  prisma.operation.findMany({where:{status:{in:["DRAFT","PROCESSING"]}},include:{payouts:true}})
 ]);
 let awaitingRub=0,exchangedOpenRub=0;
 for(const o of openOps){
  const paid=o.payouts.reduce((a,p)=>a+Number(p.amountRub),0);
  exchangedOpenRub+=paid;
  awaitingRub+=Math.max(0,Number(o.receivedAmount)-paid);
 }
 const sum=(k:"receivedAmount"|"sentAmount"|"expectedCommission"|"actualResult"|"expenses")=>rows.reduce((a,x)=>a+Number(x[k]),0);
 const byStatus=byStatusRaw.map(s=>({status:s.status,count:s._count._all,received:Number(s._sum.receivedAmount??0),profit:Number(s._sum.totalProfit??0)}));
 return {
  count:rows.length,received:sum("receivedAmount"),sent:sum("sentAmount"),commission:sum("expectedCommission"),profit:sum("actualResult"),expenses:sum("expenses"),
  byStatus,
  today:{count:todayAgg._count._all,received:Number(todayAgg._sum.receivedAmount??0),profit:Number(todayAgg._sum.totalProfit??0)},
  awaiting:{openCount:openOps.length,rub:awaitingRub,exchangedRub:exchangedOpenRub},
  balances:await balances()
 };
}
