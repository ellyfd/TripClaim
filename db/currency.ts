export const REPORTING_CURRENCIES=new Set(["TWD","USD","CNY","JPY","IDR","KHR","GBP","HKD","PHP","VND","EUR","KRW","TRY","DKK","CAD","GTQ","INR","ETB","BDT","AED","JOD","EGP","THB","SGD","AUD"]);
export const reportingCurrency=(value:string|undefined|null)=>value&&REPORTING_CURRENCIES.has(value.toUpperCase())?value.toUpperCase():"TWD";
