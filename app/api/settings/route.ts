import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { z } from "zod";
export const dynamic="force-dynamic";
const patch=z.object({kind:z.enum(["tariff","currency"]),id:z.string().min(1),value:z.coerce.number().min(0).finite()});
export async function GET(){return NextResponse.json({tariffs:await prisma.tariff.findMany({orderBy:{percent:"asc"}}),currencies:await prisma.currency.findMany({orderBy:{code:"asc"}})});}
export async function PATCH(req:Request){
 const p=patch.safeParse(await req.json());
 if(!p.success)return NextResponse.json({error:"Некорректное значение"},{status:400});
 const {kind,id,value}=p.data;
 if(kind==="tariff")return NextResponse.json(await prisma.tariff.update({where:{id},data:{percent:value}}));
 return NextResponse.json(await prisma.currency.update({where:{code:id},data:{rateToRub:value}}));
}
