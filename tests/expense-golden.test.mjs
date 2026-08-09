import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const fixture=JSON.parse(await readFile(new URL("./fixtures/expense-golden.json",import.meta.url),"utf8"));

const currentGroups=records=>{
 const groups=new Map();
 for(const record of records.filter(item=>item.kind==="expense")){
  const key=`${record.category}\u0000${record.reportingCurrency}`;
  const group=groups.get(key)??{category:record.category,currency:record.reportingCurrency,amountMinor:0,expenseIds:[]};
  group.amountMinor+=record.reportingAmountMinor;
  group.expenseIds.push(record.id);
  groups.set(key,group);
 }
 const companyOrder=["機票(自行刷卡)","住宿","車資","落地簽證費","預支歸還","餐飲","交際費／伴手禮","行李託運費","疫苗／檢測費用","探親樣衣","無報支費用","電信網路費","簽證費用","國外交易手續費"];
 return [...groups.values()].sort((a,b)=>companyOrder.indexOf(a.category)-companyOrder.indexOf(b.category)||a.currency.localeCompare(b.currency));
};

test("golden expenses split the same company item by reporting currency",()=>{
 const actual=currentGroups(fixture.records);
 assert.deepEqual(actual,fixture.expectedGroups);
 assert.equal(actual.filter(group=>group.category==="餐飲").length,2);
});

test("new grouped reporting reconciles with the legacy reporting total",()=>{
 const expenses=fixture.records.filter(item=>item.kind==="expense");
 const legacyTotal=expenses.reduce((sum,item)=>sum+item.reportingAmountMinor,0);
 const groupedTotal=currentGroups(fixture.records).reduce((sum,group)=>sum+group.amountMinor,0);
 assert.equal(groupedTotal,legacyTotal);
});

test("unsupported currencies retain originals but report in TWD",()=>{
 const item=fixture.records.find(record=>record.id==="taxi-pln-1");
 assert.equal(item.originalCurrency,"PLN");
 assert.equal(item.originalAmountMinor,19152);
 assert.equal(item.reportingCurrency,"TWD");
 assert.equal(item.reportingAmountMinor,169600);
});

test("card statements are evidence and fees are independent TWD expenses",()=>{
 const statement=fixture.records.find(record=>record.kind==="evidence");
 assert.equal(statement.linkedExpenseId,"taxi-pln-1");
 assert.ok(!currentGroups(fixture.records).some(group=>group.expenseIds.includes(statement.id)));
 const fee=currentGroups(fixture.records).find(group=>group.category==="國外交易手續費");
 assert.deepEqual(fee,{category:"國外交易手續費",currency:"TWD",amountMinor:2544,expenseIds:["foreign-fee-1"]});
});
