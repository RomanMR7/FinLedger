import {NextResponse} from "next/server";
import {prisma} from "@/src/lib/db";
import {z} from "zod";
import {getActorFromRequest,isOwner,unauthorized,forbidden} from "@/src/lib/auth";
export const dynamic="force-dynamic";
const body=z.object({title:z.string().min(3).max(200),description:z.string().max(2000).optional(),priority:z.enum(["LOW","MEDIUM","HIGH"]).default("MEDIUM"),dueDate:z.string().datetime().optional()});
const patch=z.object({id:z.string().min(1),status:z.enum(["TODO","IN_PROGRESS","DONE"]).optional(),priority:z.enum(["LOW","MEDIUM","HIGH"]).optional(),title:z.string().min(3).max(200).optional()});
export async function GET(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();return NextResponse.json(await prisma.task.findMany({orderBy:[{status:"asc"},{createdAt:"desc"}]}))}
export async function POST(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const p=body.safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:"Некорректная задача"},{status:400});
 return NextResponse.json(await prisma.task.create({data:{...p.data,dueDate:p.data.dueDate?new Date(p.data.dueDate):undefined}}),{status:201});
}
export async function PATCH(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const p=patch.safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:"Некорректные данные"},{status:400});
 const {id,...data}=p.data;
 const row=await prisma.task.update({where:{id},data}).catch(()=>null);
 return row?NextResponse.json(row):NextResponse.json({error:"Задача не найдена"},{status:404});
}
export async function DELETE(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const id=new URL(req.url).searchParams.get("id");
 if(!id)return NextResponse.json({error:"Не указан id"},{status:400});
 const row=await prisma.task.delete({where:{id}}).catch(()=>null);
 return row?NextResponse.json({ok:true}):NextResponse.json({error:"Задача не найдена"},{status:404});
}
