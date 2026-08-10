import {NextResponse} from "next/server";
import {prisma} from "@/src/lib/db";
import {paidSum,recomputeOperation} from "@/src/lib/payouts";
import {z} from "zod";
import {getActorFromRequest,isOwner,unauthorized,forbidden} from "@/src/lib/auth";
export const dynamic="force-dynamic";
const create=z.object({amountRub:z.coerce.number().positive(),clientRate:z.coerce.number().positive(),actualRate:z.coerce.number().positive()});

export async function GET(req:Request,{params}:{params:{id:string}}){
 const actor=await getActorFromRequest(req);if(!actor)return unauthorized();const op=await prisma.operation.findUnique({where:{id:params.id}});if(!op)return NextResponse.json({error:"Операция не найдена"},{status:404});if(!isOwner(actor)&&op.authorId!==actor.id)return forbidden();
 const payouts=await prisma.payout.findMany({where:{operationId:params.id},orderBy:{date:"asc"}});
 return NextResponse.json(payouts);
}

export async function POST(req:Request,{params}:{params:{id:string}}){
 const p=create.safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:"Укажите сумму и оба курса"},{status:400});
 const actor=await getActorFromRequest(req);if(!actor)return unauthorized();
 const op=await prisma.operation.findUnique({where:{id:params.id}});
 if(!op)return NextResponse.json({error:"Операция не найдена"},{status:404});
 if(!isOwner(actor)&&op.authorId!==actor.id)return forbidden();
 if(op.status==="COMPLETED"||op.status==="CANCELLED")return NextResponse.json({error:"Операция уже закрыта"},{status:422});
 const created=await prisma.payout.create({data:{operationId:params.id,amountRub:p.data.amountRub,clientRate:p.data.clientRate,actualRate:p.data.actualRate}});
 const row=await recomputeOperation(params.id);
 if(op.status==="DRAFT")await prisma.operation.update({where:{id:params.id},data:{status:"PROCESSING"}});
 const payout=await prisma.payout.findUnique({where:{id:created.id}});
 await prisma.auditLog.create({data:{action:"CREATE",entity:"Payout",entityId:created.id,details:JSON.stringify({operation:op.number,amountRub:p.data.amountRub,clientRate:p.data.clientRate,actualRate:p.data.actualRate})}});
 return NextResponse.json({payout,operation:{...row,status:op.status==="DRAFT"?"PROCESSING":op.status}},{status:201});
}

export async function DELETE(req:Request,{params}:{params:{id:string}}){
 const payoutId=new URL(req.url).searchParams.get("payoutId");
 if(!payoutId)return NextResponse.json({error:"Не указан payoutId"},{status:400});
 const actor=await getActorFromRequest(req);if(!actor)return unauthorized();
 const op=await prisma.operation.findUnique({where:{id:params.id}});
 if(!op)return NextResponse.json({error:"Операция не найдена"},{status:404});
 if(!isOwner(actor)&&op.authorId!==actor.id)return forbidden();
 if(op.status==="COMPLETED")return NextResponse.json({error:"Операция уже завершена — сначала верните её в работу"},{status:422});
 const removed=await prisma.payout.delete({where:{id:payoutId}}).catch(()=>null);
 if(!removed)return NextResponse.json({error:"Обмен не найден"},{status:404});
 const row=await recomputeOperation(params.id);
 await prisma.auditLog.create({data:{action:"DELETE",entity:"Payout",entityId:payoutId,details:JSON.stringify({operation:op.number,amountRub:Number(removed.amountRub)})}});
 return NextResponse.json({operation:row});
}
