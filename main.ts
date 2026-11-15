// CBBTC/USDC pullback buyer, long only, causal (closed bars only, fills next open).
// Rare entries: price 2.5% under its 6-hour mean while stabilising; exits at +1.2%,
// -3% stop, regime break (2% under the 6-hour mean) or 8 hours held. One position,
// 90% of equity, no clock, no randomness: identical bars -> identical orders.
import {runBars} from './vendor/makefun-bars.ts';
const WINDOW = 360;
const DIP = 0.025;
const TAKE = 0.012;
const STOP = 0.03;
const MAX_HOLD = 480;
const closes:number[]=[];
let entryBar=0, peak=0;
await runBars({onBatch(state,batch){
 const bar=batch.bars[0];
 if(!bar)return [];
 const price=Number(bar.c);
 closes.push(price);
 if(closes.length>WINDOW)closes.shift();
 if(state.warmingUp||closes.length<WINDOW)return [];
 const mean=closes.reduce((a,b)=>a+b,0)/closes.length;
 const held=state.positions.get(bar.symbol);
 if(held){
  const ratio=Number(state.value(bar.symbol,held.qty))/Number(held.cost);
  peak=Math.max(peak,price);
  if(ratio>1+TAKE||ratio<1-STOP||batch.seq-entryBar>=MAX_HOLD)
   return [{side:'sell',symbol:bar.symbol,qty:held.qty,max_slippage_bps:100}];
 }else if(price<mean*(1-DIP)&&price>=closes[closes.length-2]){
  entryBar=batch.seq;peak=price;
  return [{side:'buy',symbol:bar.symbol,notional_quote_units:state.cash*9n/10n,max_slippage_bps:100}];
 }
 return [];
}});
