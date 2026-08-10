import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { z } from "zod";
import {getActorFromRequest,isOwner,unauthorized,forbidden} from "@/src/lib/auth";
export const dynamic="force-dynamic";
const patch=z.object({kind:z.enum(["tariff","currency"]),id:z.string().min(1),value:z.coerce.number().min(0).finite()});
export async function GET(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();const tariffs=await prisma.tariff.findMany({orderBy:{percent:"asc"}});return NextResponse.json({tariffs,currencies:isOwner(actor)?await prisma.currency.findMany({orderBy:{code:"asc"}}):[]});}
export async function PATCH(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();
 const p=patch.safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:"Некорректное значение"},{status:400});
 const {kind,id,value}=p.data;
 if(kind==="tariff")return NextResponse.json(await prisma.tariff.update({where:{id},data:{percent:value}}));
 return NextResponse.json(await prisma.currency.update({where:{code:id},data:{rateToRub:value}}));
}
