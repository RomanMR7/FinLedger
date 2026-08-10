import { NextResponse } from "next/server";
import { dashboardData } from "@/src/lib/dashboard";
import {getActorFromRequest,isOwner,unauthorized,forbidden} from "@/src/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req:Request){const actor=await getActorFromRequest(req);if(!actor)return unauthorized();if(!isOwner(actor))return forbidden();return NextResponse.json(await dashboardData());}
