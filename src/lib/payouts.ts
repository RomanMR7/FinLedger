import {Prisma} from "@prisma/client";
import {prisma} from "./db";
import {calculateDealMoney} from "./financial-server";

/** Сумма уже обменянных рублей по операции. */
export async function paidSum(operationId:string){
 const agg=await prisma.payout.aggregate({where:{operationId},_sum:{amountRub:true}});
 return Number(agg._sum.amountRub??0);
}

/**
 * Пересчитывает операцию по её частичным обменам: каждая часть несёт тариф операции
 * и собственные курсы; итоги операции — сумма частей минус расходы.
 * Если частей нет, операция считается целиком по своим курсам (старый режим).
 */
export async function recomputeOperation(operationId:string){
 const op=await prisma.operation.findUniqueOrThrow({where:{id:operationId},include:{payouts:true}});
 if(op.payouts.length===0){
  const c=calculateDealMoney({amountRub:op.receivedAmount,tariffPercent:op.tariffPercent,clientRate:op.clientRate??op.actualRate,actualRate:op.actualExchangeRate??op.sentRate,expenses:op.expenses});
  return prisma.operation.update({where:{id:operationId},data:{sentAmount:c.payoutUsdt,sentRate:c.actualRate,actualRate:c.clientRate,expectedCommission:c.tariffProfit,actualResult:c.totalProfitRub,variance:c.exchangeProfitRub,clientRate:c.clientRate,actualExchangeRate:c.actualRate,exchangeProfit:c.exchangeProfitRub,totalProfit:c.totalProfitRub},include:{payouts:true}});
 }
 let sentUsdt=new Prisma.Decimal(0),tariff=new Prisma.Decimal(0),exchange=new Prisma.Decimal(0),paidRub=new Prisma.Decimal(0);
 for(const p of op.payouts){
  const c=calculateDealMoney({amountRub:p.amountRub,tariffPercent:op.tariffPercent,clientRate:p.clientRate,actualRate:p.actualRate});
  await prisma.payout.update({where:{id:p.id},data:{payoutUsdt:c.payoutUsdt,tariffProfit:c.tariffProfit,exchangeProfit:c.exchangeProfitRub,totalProfit:c.totalProfitRub}});
  sentUsdt=sentUsdt.plus(c.payoutUsdt);tariff=tariff.plus(c.tariffProfit);exchange=exchange.plus(c.exchangeProfitRub);paidRub=paidRub.plus(p.amountRub);
 }
 const total=tariff.plus(exchange).minus(op.expenses).toDecimalPlaces(2);
 const wa=(pick:(p:{clientRate:Prisma.Decimal;actualRate:Prisma.Decimal})=>Prisma.Decimal)=>
  op.payouts.reduce((a,p)=>a.plus(new Prisma.Decimal(pick(p)).mul(p.amountRub)),new Prisma.Decimal(0)).div(paidRub).toDecimalPlaces(4);
 const avgClient=wa(p=>p.clientRate),avgActual=wa(p=>p.actualRate);
 return prisma.operation.update({where:{id:operationId},data:{
  sentAmount:sentUsdt,sentRate:avgActual,actualRate:avgClient,
  expectedCommission:tariff,actualResult:total,variance:exchange,
  clientRate:avgClient,actualExchangeRate:avgActual,exchangeProfit:exchange,totalProfit:total
 },include:{payouts:true}});
}
