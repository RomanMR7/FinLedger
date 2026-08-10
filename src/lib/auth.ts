import {createHmac,timingSafeEqual} from "crypto";
import {cookies} from "next/headers";
import {prisma} from "./db";
export type Actor={id:string;name:string;email:string;role:string;canUseCustomTariff:boolean};
export const sessionCookie="finledger_session";
const secret=()=>process.env.AUTH_SECRET||"local-development-secret-change-before-production";
const encode=(value:string)=>Buffer.from(value).toString("base64url");
const decode=(value:string)=>Buffer.from(value,"base64url").toString();
function signature(payload:string){return createHmac("sha256",secret()).update(payload).digest("base64url")}
export function createSession(userId:string){const payload=encode(JSON.stringify({userId,exp:Date.now()+1000*60*60*24*14}));return `${payload}.${signature(payload)}`}
function sessionUserId(value?:string){if(!value)return null;const [payload,provided]=value.split(".");if(!payload||!provided)return null;const expected=signature(payload);if(provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return null;try{const data=JSON.parse(decode(payload));return data.exp>Date.now()&&typeof data.userId==="string"?data.userId:null}catch{return null}}
function cookieValue(header:string|null){return header?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length+1)}
export async function getActorFromRequest(req:Request):Promise<Actor|null>{const id=sessionUserId(cookieValue(req.headers.get("cookie")));if(!id)return null;const user=await prisma.user.findUnique({where:{id}});return user?{id:user.id,name:user.name,email:user.email,role:user.role,canUseCustomTariff:user.canUseCustomTariff}:null}
export async function getCurrentActor():Promise<Actor|null>{const id=sessionUserId(cookies().get(sessionCookie)?.value);if(!id)return null;const user=await prisma.user.findUnique({where:{id}});return user?{id:user.id,name:user.name,email:user.email,role:user.role,canUseCustomTariff:user.canUseCustomTariff}:null}
export const isOwner=(actor:Actor)=>actor.role==="OWNER";
export const unauthorized=()=>new Response(JSON.stringify({error:"Требуется вход"}),{status:401,headers:{"content-type":"application/json"}});
export const forbidden=()=>new Response(JSON.stringify({error:"Недостаточно прав"}),{status:403,headers:{"content-type":"application/json"}});