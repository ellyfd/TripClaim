import {DEFAULT_CLAIM_TYPES} from "./managed-config";

export type ExportExpense={
 id:string;category:string;expenseDate:string;merchant:string;amountMinor:number;currency:string;
 originalAmountMinor:number|null;originalCurrency:string|null;reportingAmountMinor:number|null;reportingCurrency:string|null;
 sourceDocumentId:string|null;receiptCount:number;remark:string|null;costCenter:string;cardLast4:string|null;
};

export type ExpenseGroup={key:string;rowNumber:number;category:string;currency:string;amountMinor:number;expenses:ExportExpense[];folder:string};
export const originalCurrencyOf=(x:ExportExpense)=>x.originalCurrency??x.currency;
export const originalAmountOf=(x:ExportExpense)=>x.originalAmountMinor??x.amountMinor;
export const reportingCurrencyOf=(x:ExportExpense)=>x.reportingCurrency??x.currency;
export const reportingAmountOf=(x:ExportExpense)=>x.reportingAmountMinor??x.amountMinor;
export const safeFilePart=(value:string)=>value.trim().replace(/[^\p{L}\p{N}._-]+/gu,"-").replace(/^-+|-+$/g,"")||"未分類";

export function buildExpenseGroups(items:ExportExpense[]):ExpenseGroup[]{
 const map=new Map<string,ExportExpense[]>();
 for(const item of items){const currency=reportingCurrencyOf(item),key=`${item.category}\u0000${currency}`;map.set(key,[...(map.get(key)??[]),item])}
 return [...map.entries()].sort(([a],[b])=>{
  const [aCategory,aCurrency]=a.split("\u0000"),[bCategory,bCurrency]=b.split("\u0000");
  const ai=DEFAULT_CLAIM_TYPES.indexOf(aCategory),bi=DEFAULT_CLAIM_TYPES.indexOf(bCategory);
  return (ai<0?999:ai)-(bi<0?999:bi)||aCurrency.localeCompare(bCurrency);
 }).map(([key,expenses],index)=>{
  const [category,currency]=key.split("\u0000"),rowNumber=index+1;
  return {key,rowNumber,category,currency,expenses,amountMinor:expenses.reduce((sum,x)=>sum+reportingAmountOf(x),0),folder:`${String(rowNumber).padStart(2,"0")}_${safeFilePart(category)}_${safeFilePart(currency)}`};
 });
}
