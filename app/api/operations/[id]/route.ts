import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { calculateDealMoney } from "@/src/lib/financial-server";
import { paidSum, recomputeOperation } from "@/src/lib/payouts";
import { z } from "zod";
import {getActorFromRequest,isOwner,unauthorized,forbidden} from "@/src/lib/auth";
export const dynamic="force-dynamic";
const patch=z.object({
 status:z.enum(["DRAFT","PROCESSING","COMPLETED","CANCELLED"]).optional(),
 receivedAmount:z.coerce.number().positive().optional(),
 tariffPercent:z.coerce.number().min(0).max(100).optional(),
 clientRate:z.coerce.number().positive().optional(),
 actualExchangeRate:z.coerce.number().positive().optional(),
 expenses:z.coerce.number().min(0).optional(),
 requisiteId:z.string().nullable().optional(),
 note:z.string().max(3000).optional(),
 clientReference:z.string().max(100).optional()
});
async function limitError(requisiteId:string,amount:number,excludeOperationId:string){
 const r=await prisma.requisite.findUnique({where:{id:requisiteId}});
 if(!r)return "Реквизит не найден";
 if(!r.active)return `Реквизит ${r.name} неактивен`;
 const day=new Date();day.setHours(0,0,0,0);
 const month=new Date(day.getFullYear(),day.getMonth(),1);
 const base={requisiteId,status:"COMPLETED",NOT:{id:excludeOperationId}};
 const [daily,monthly]=await Promise.all([
  prisma.operation.aggregate({where:{...base,date:{gte:day}},_sum:{receivedAmount:true}}),
  prisma.operation.aggregate({where:{...base,date:{gte:month}},_sum:{receivedAmount:true}})
 ]);
 if(Number(daily._sum.receivedAmount??0)+amount>Number(r.dailyLimit))return `Нельзя завершить: дневной лимит реквизита ${r.name} будет превышен`;
 if(Number(monthly._sum.receivedAmount??0)+amount>Number(r.monthlyLimit))return `Нельзя завершить: месячный лимит реквизита ${r.name} будет превышен`;
 return null;
}
export async function GET(req:Request,{params}:{params:{id:string}}){
 const actor=await getActorFromRequest(req);if(!actor)return unauthorized();
 const row=await prisma.operation.findUnique({where:{id:params.id},include:{counterparty:true,requisite:true,channel:true,payouts:{orderBy:{date:"asc"}},author:{select:{name:true,email:true}}}});
 if(row&&!isOwner(actor)&&row.authorId!==actor.id)return forbidden();
 return row?NextResponse.json(row):NextResponse.json({error:"Не найдено"},{status:404});
}
export async function PATCH(req:Request,{params}:{params:{id:string}}){
 const p=patch.safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:"Некорректные данные"},{status:400});
 const actor=await getActorFromRequest(req);if(!actor)return unauthorized();
 const before=await prisma.operation.findUnique({where:{id:params.id},include:{payouts:true}});
 if(!before)return NextResponse.json({error:"Операция не найдена"},{status:404});
 if(!isOwner(actor)&&before.authorId!==actor.id)return forbidden();
 const hasPayouts=before.payouts.length>0;
 const requisiteId=p.data.requisiteId===undefined?before.requisiteId:p.data.requisiteId;
 const paid=hasPayouts?await paidSum(before.id):0;
 const v={
  receivedAmount:p.data.receivedAmount??Number(before.receivedAmount),
  tariffPercent:p.data.tariffPercent??Number(before.tariffPercent),
  clientRate:p.data.clientRate??Number(before.clientRate??before.actualRate),
  actualExchangeRate:p.data.actualExchangeRate??Number(before.actualExchangeRate??before.sentRate),
  expenses:p.data.expenses??Number(before.expenses)
 };
 if(hasPayouts&&v.receivedAmount<paid-0.01)return NextResponse.json({error:`Сумма не может быть меньше уже обменянных ${paid.toFixed(2)} ₽`},{status:422});
 const willBeCompleted=(p.data.status??before.status)==="COMPLETED";
 if(p.data.status==="COMPLETED"&&hasPayouts&&paid<v.receivedAmount-0.01)return NextResponse.json({error:`Нельзя завершить: обменяно ${paid.toFixed(2)} ₽ из ${v.receivedAmount.toFixed(2)} ₽`},{status:422});
 if(willBeCompleted&&requisiteId){
  const err=await limitError(requisiteId,v.receivedAmount,before.id);
  if(err)return NextResponse.json({error:err},{status:422});
 }
 const c=calculateDealMoney({amountRub:v.receivedAmount,tariffPercent:v.tariffPercent,clientRate:v.clientRate,actualRate:v.actualExchangeRate,expenses:v.expenses});
 let row=await prisma.operation.update({where:{id:params.id},data:{
  ...(p.data.status?{status:p.data.status}:{}),
  ...(p.data.note!==undefined?{note:p.data.note}:{}),
  ...(p.data.clientReference!==undefined?{clientReference:p.data.clientReference}:{}),
  requisiteId,
  receivedAmount:v.receivedAmount,tariffPercent:v.tariffPercent,expenses:v.expenses,
  ...(hasPayouts?{}:{
   sentAmount:c.payoutUsdt,sentRate:c.actualRate,actualRate:c.clientRate,
   expectedCommission:c.tariffProfit,actualResult:c.totalProfitRub,variance:c.exchangeProfitRub,
   clientRate:c.clientRate,actualExchangeRate:c.actualRate,exchangeProfit:c.exchangeProfitRub,totalProfit:c.totalProfitRub
  })
 }});
 if(hasPayouts)row=await recomputeOperation(params.id);
 await prisma.auditLog.create({data:{action:"UPDATE",entity:"Operation",entityId:row.id,details:JSON.stringify({before:{amount:Number(before.receivedAmount),tariff:Number(before.tariffPercent),clientRate:Number(before.clientRate??0),actualRate:Number(before.actualExchangeRate??0),expenses:Number(before.expenses),requisiteId:before.requisiteId},after:{...v,requisiteId,status:p.data.status??before.status}})}});
 return NextResponse.json(row);
}
export async function DELETE(req:Request,{params}:{params:{id:string}}){
 const actor=await getActorFromRequest(req);if(!actor)return unauthorized();
 const before=await prisma.operation.findUnique({where:{id:params.id}});if(!before)return NextResponse.json({error:"Операция не найдена"},{status:404});if(!isOwner(actor)&&before.authorId!==actor.id)return forbidden();
 const row=await prisma.operation.delete({where:{id:params.id}}).catch(()=>null);
 if(!row)return NextResponse.json({error:"Операция не найдена"},{status:404});
 await prisma.auditLog.create({data:{action:"DELETE",entity:"Operation",entityId:params.id,details:JSON.stringify({number:row.number,receivedAmount:Number(row.receivedAmount)})}});
 return NextResponse.json({ok:true});
}
