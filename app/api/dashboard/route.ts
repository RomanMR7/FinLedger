import { NextResponse } from "next/server";
import { dashboardData } from "@/src/lib/dashboard";
export const dynamic = "force-dynamic";
export async function GET(){return NextResponse.json(await dashboardData());}
