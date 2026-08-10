import {NextResponse} from "next/server";
import {prisma} from "@/src/lib/db";
import {z} from "zod";
import {getActorFromRequest,isOwner,unauthorized,forbidden} from "@/src/lib/auth";
export const dynamic="force-dynamic";
const create=z.object({name:z.string().min(2).max(80),type:z.enum(["SIM","BANK_CARD"]),maskedValue:z.string().min(4).max(40),dailyLimit:z.coerce.number().positive(),monthlyLimit:z.coerce.number().positive(),balance:z.coerce.number().min(0).default(0)});
export async function GET(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();
 const day=new Date();day.setHours(0,0,0,0);
 const month=new Date(day.getFullYear(),day.getMonth(),1);
 const [all,daily,monthly]=await Promise.all([
  prisma.requisite.findMany({orderBy:{name:"asc"}}),
  prisma.operation.groupBy({by:["requisiteId"],where:{status:"COMPLETED",date:{gte:day},requisiteId:{not:null}},_sum:{receivedAmount:true}}),
  prisma.operation.groupBy({by:["requisiteId"],where:{status:"COMPLETED",date:{gte:month},requisiteId:{not:null}},_sum:{receivedAmount:true}})
 ]);
 const byId=(rows:typeof daily)=>new Map(rows.map(r=>[r.requisiteId,Number(r._sum.receivedAmount??0)]));
 const dayMap=byId(daily),monthMap=byId(monthly);
 const result=all.map(r=>{
  const dayLimit=Number(r.dailyLimit),monthLimit=Number(r.monthlyLimit);
  const usedToday=dayMap.get(r.id)??0,usedMonth=monthMap.get(r.id)??0;
  return {...r,balance:Number(r.balance),dailyLimit:dayLimit,monthlyLimit:monthLimit,usedToday,availableToday:dayLimit-usedToday,usagePercent:dayLimit?usedToday/dayLimit*100:0,usedMonth,availableMonth:monthLimit-usedMonth,monthPercent:monthLimit?usedMonth/monthLimit*100:0};
 });
 return NextResponse.json(result);
}
export async function PATCH(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const b=await req.json();
 const p=create.partial().extend({id:z.string(),active:z.boolean().optional()}).safeParse(b);
 if(!p.success)return NextResponse.json({error:"Некорректные значения"},{status:400});
 const {id,...data}=p.data;
 const r=await prisma.requisite.update({where:{id},data});
 await prisma.auditLog.create({data:{action:"UPDATE",entity:"Requisite",entityId:id,details:JSON.stringify(data)}});
 return NextResponse.json(r);
}
export async function POST(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const parsed=create.safeParse(await req.json());
 if(!parsed.success)return NextResponse.json({error:"Заполните название, маску и положительные лимиты"},{status:400});
 const r=await prisma.requisite.create({data:parsed.data});
 await prisma.auditLog.create({data:{action:"CREATE",entity:"Requisite",entityId:r.id,details:r.name}});
 return NextResponse.json(r,{status:201});
}
export async function DELETE(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const id=new URL(req.url).searchParams.get("id");
 if(!id)return NextResponse.json({error:"Не указан id реквизита"},{status:400});
 const row=await prisma.requisite.delete({where:{id}}).catch(()=>null);
 if(!row)return NextResponse.json({error:"Реквизит не найден"},{status:404});
 await prisma.auditLog.create({data:{action:"DELETE",entity:"Requisite",entityId:id,details:row.name}});
 return NextResponse.json({ok:true});
}