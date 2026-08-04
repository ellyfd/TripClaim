import {NextRequest,NextResponse} from "next/server";
import {and,desc,eq} from "drizzle-orm";
import {extractText,getDocumentProxy} from "unpdf";
import {getChatGPTUser} from "../../chatgpt-auth";
import {getDb} from "../../../db";
import {requireTripMember} from "../../../db/access";
import {uploadedDocuments} from "../../../db/schema";
import {REPORTING_CURRENCIES} from "../../../db/currency";
import {MANAGED_AIRPORT_CODES,normalizeManagedAirportText} from "../../airport-directory";
const allowed=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"]);

const pad=(value:string|number)=>String(value).padStart(2,"0");
const monthNumber=(value:string)=>pad(["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].indexOf(value.toUpperCase())+1);
function compactDate(value:string){
 const match=value.match(/\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})\b/i);
 if(!match)return null;
 const year=match[3].length===2?`20${match[3]}`:match[3];
 return `${year}-${monthNumber(match[2])}-${pad(match[1])}`;
}
function inferDocumentType(text:string,fileName:string,requested:string){
 if(requested&&requested!=="自動辨識")return requested;
 const source=`${text} ${fileName}`.toLowerCase();
 if(/credit card statement|信用卡帳單|帳單明細|statement/.test(source))return "信用卡帳單";
 if(/boarding pass|e-?ticket|electronic ticket|flight|航空|機票|登機證|\bbr\s?\d{2,4}\b/.test(source))return "機票";
 if(/hotel|accommodation|check[- ]?in|check[- ]?out|住宿|飯店|旅館/.test(source))return "住宿";
 if(/cardholder|approval code|刷卡單|簽單|terminal id/.test(source))return "刷卡單";
 if(/uber|taxi|metro|train|rail|捷運|計程車|車資|交通/.test(source))return "交通票券";
 return "收據／發票";
}
function parseDocument(text:string,fileName:string,kind:string){
 const source=normalizeManagedAirportText(`${text}\n${fileName}`.replace(/\s+/g," "));
 const dateTimes=[...source.matchAll(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})\D{0,18}([0-2]?\d)[:.](\d{2})/g)].map(x=>`${x[1]}-${pad(x[2])}-${pad(x[3])}T${pad(x[4])}:${x[5]}`);
 const compactDates=[...source.matchAll(/\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})\D{0,14}([0-2]?\d)[:.](\d{2})/gi)].map(x=>{const year=x[3].length===2?`20${x[3]}`:x[3];return `${year}-${monthNumber(x[2])}-${pad(x[1])}T${pad(x[4])}:${x[5]}`});
 const times=[...new Set([...dateTimes,...compactDates])].sort();
 const money=[...source.matchAll(/\b(TWD|NTD|EUR|USD|PLN|JPY|GBP)\s*[$€£]?\s*([\d,]+(?:\.\d{1,2})?)/gi)].at(-1);
 const flight=source.match(/\b([A-Z]{2})\s?(\d{2,4})\b/);
 const airports=[...source.matchAll(/\b([A-Z]{3})\b/g)].map(x=>x[1]).filter(code=>MANAGED_AIRPORT_CODES.has(code));
 const segmentHeaders=[...source.matchAll(/\b([A-Z]{3})\s+([A-Z]{3})\s+([A-Z]{2})\s?(\d{2,4})\s+([0-2]?\d[:.]\d{2})\s+([0-2]?\d[:.]\d{2})/g)];
 const segments=segmentHeaders.flatMap((match,index)=>{
  if(!MANAGED_AIRPORT_CODES.has(match[1])||!MANAGED_AIRPORT_CODES.has(match[2]))return [];
  const start=(match.index??0)+match[0].length,next=segmentHeaders[index+1]?.index??Math.min(source.length,start+700),details=source.slice(start,next);
  const dates=[...details.matchAll(/\b\d{1,2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4}\b/gi)].map(x=>compactDate(x[0])).filter(Boolean) as string[];
  if(dates.length<2)return [];
  const duration=details.match(/(?:Duration|飛行時間)\s*[:：]?\s*(\d{1,2}:\d{2})/i)?.[1]??null;
  return [{title:`${match[3]}${match[4]} ${match[1]} → ${match[2]}`,startAt:`${dates[0]}T${match[5].replace(".",":")}`,endAt:`${dates[1]}T${match[6].replace(".",":")}`,origin:match[1],destination:match[2],duration}];
 });
 // 第二種航段解析：以「航班號＋出發時間＋出發日＋抵達時間＋抵達日」為錨，
 // 起訖機場取錨點前文最後兩個合法代碼。涵蓋長榮電子機票這類
 // 「TPE 航站/Terminal: 2 CDG 航站/Terminal: 1 BR87 23:30 15Jun2026 08:05 16Jun2026」格式。
 const MONTHS="(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)";
 const anchored=segments.length?[]:[...source.matchAll(new RegExp(String.raw`\b([A-Z]{2})\s?(\d{2,4})\s+([0-2]?\d[:.]\d{2})\s+(\d{1,2}${MONTHS}\d{2,4})\s+([0-2]?\d[:.]\d{2})\s+(\d{1,2}${MONTHS}\d{2,4})\b`,"gi"))].flatMap(match=>{
  const before=source.slice(Math.max(0,(match.index??0)-220),match.index).toUpperCase();
  const codes=[...before.matchAll(/\b([A-Z]{3})\b/g)].map(x=>x[1]).filter(code=>MANAGED_AIRPORT_CODES.has(code));
  const origin=codes.at(-2),destination=codes.at(-1);
  if(!origin||!destination||origin===destination)return [];
  const startDate=compactDate(match[4]),endDate=compactDate(match[6]);
  if(!startDate||!endDate)return [];
  return [{title:`${match[1].toUpperCase()}${match[2]} ${origin} → ${destination}`,startAt:`${startDate}T${match[3].replace(".",":")}`,endAt:`${endDate}T${match[5].replace(".",":")}`,origin,destination,duration:null as string|null}];
 });
 const allSegments=[...segments,...anchored];
 const hotel=source.match(/(?:HOTEL|住宿|PROPERTY|飯店)\s*[:：-]?\s*([A-Z0-9][A-Z0-9 '&.,-]{3,55})/i);
 const primarySegment=allSegments[0];
 const title=kind==="flight"?(primarySegment?.title||(flight?`${flight[1]}${flight[2]}${airports.length>=2?` ${airports[0]} → ${airports[1]}`:""}`:"機票・請確認航班名稱")):(hotel?.[1]?.trim()||fileName.replace(/\.[^.]+$/,""));
 const confidence={title:Boolean(primarySegment||flight||hotel),date:Boolean(primarySegment||times.length>=1),times:Boolean(primarySegment||times.length>=2),route:Boolean(primarySegment||airports.length>=2),amount:Boolean(money),textDetected:text.trim().length>20};
 const isTravel=kind==="flight"||kind==="stay"||kind==="機票"||kind==="住宿";
 const checks=isTravel?[confidence.title,confidence.times,confidence.amount,kind==="flight"||kind==="機票"?confidence.route:true]:[confidence.textDetected,confidence.date,confidence.amount,Boolean(money?.[1])];
 const score=Math.round(checks.filter(Boolean).length/checks.length*100);
 const warnings=[!confidence.textDetected?"圖片文字尚未成功讀取":null,!confidence.date?"找不到消費日期":null,!confidence.amount?"找不到金額":null,!money?.[1]?"找不到幣別":null,isTravel&&!confidence.title?"名稱辨識信心較低":null,(kind==="flight"||kind==="機票")&&!confidence.route?"找不到完整起訖地":null].filter(Boolean) as string[];
 return {title,startAt:primarySegment?.startAt??times[0]??null,endAt:primarySegment?.endAt??times[1]??null,origin:primarySegment?.origin??airports[0]??null,destination:primarySegment?.destination??airports[1]??null,segments:allSegments,currency:money?.[1]?.toUpperCase()==="NTD"?"TWD":money?.[1]?.toUpperCase()??null,amount:money?money[2].replaceAll(",",""):null,confidence,textDetected:confidence.textDetected,score,warnings,sourceExcerpt:text.trim().replace(/\s+/g," ").slice(0,280)};
}

export async function GET(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const tripId=request.nextUrl.searchParams.get("tripId");if(!tripId)return NextResponse.json({error:"trip_id_required"},{status:400});if(!await requireTripMember(tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb(),documents=await db.select({id:uploadedDocuments.id,originalName:uploadedDocuments.originalName,mimeType:uploadedDocuments.mimeType,sizeBytes:uploadedDocuments.sizeBytes,documentType:uploadedDocuments.documentType,claimType:uploadedDocuments.claimType,expenseDate:uploadedDocuments.expenseDate,merchant:uploadedDocuments.merchant,currency:uploadedDocuments.currency,amountMinor:uploadedDocuments.amountMinor,paymentMethod:uploadedDocuments.paymentMethod,cardLast4:uploadedDocuments.cardLast4,suggestedName:uploadedDocuments.suggestedName,status:uploadedDocuments.status,extractionConfidence:uploadedDocuments.extractionConfidence,extractionWarnings:uploadedDocuments.extractionWarnings,sourceExcerpt:uploadedDocuments.sourceExcerpt,createdAt:uploadedDocuments.createdAt}).from(uploadedDocuments).where(and(eq(uploadedDocuments.ownerEmail,user.email),eq(uploadedDocuments.tripId,tripId))).orderBy(desc(uploadedDocuments.createdAt));
 return NextResponse.json({documents});
}

export async function POST(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const data=await request.formData(),file=data.get("file"),requestedType=String(data.get("documentType")??"自動辨識"),tripId=String(data.get("tripId")??"");
 if(!tripId)return NextResponse.json({error:"trip_id_required"},{status:400});if(!await requireTripMember(tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 if(!(file instanceof File))return NextResponse.json({error:"file_required"},{status:400});if(!allowed.has(file.type))return NextResponse.json({error:"unsupported_file_type"},{status:415});if(file.size>15*1024*1024)return NextResponse.json({error:"file_too_large"},{status:413});
 const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest("SHA-256",bytes),contentHash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join(""),db=await getDb(),[duplicate]=await db.select({id:uploadedDocuments.id,originalName:uploadedDocuments.originalName}).from(uploadedDocuments).where(and(eq(uploadedDocuments.ownerEmail,user.email),eq(uploadedDocuments.tripId,tripId),eq(uploadedDocuments.contentHash,contentHash))).limit(1);
 let extracted=String(data.get("ocrText")??"");if(file.type==="application/pdf"){try{const pdf=await getDocumentProxy(new Uint8Array(bytes));extracted=String((await extractText(pdf,{mergePages:true})).text??"")}catch{}}
 const documentType=inferDocumentType(extracted,file.name,requestedType),prefill=parseDocument(extracted,file.name,documentType),cardEvidence=documentType.includes("信用卡")||documentType.includes("刷卡"),claimType=documentType.includes("機票")?"機票(自行刷卡)":documentType.includes("住宿")?"住宿":documentType.includes("交通")?"車資":cardEvidence?"國外交易手續費":"餐飲",detectedCurrency=prefill.currency;
 if(cardEvidence)prefill.currency="TWD";
 else if(detectedCurrency&&!REPORTING_CURRENCIES.has(detectedCurrency)){prefill.warnings.push(`偵測到 ${detectedCurrency}，此項只能以 TWD 申報`);prefill.currency="TWD"}
 if(duplicate)return NextResponse.json({error:"duplicate_document",existing:duplicate,documentType,confidence:prefill.score,warnings:prefill.warnings,prefill},{status:409});
 const id=crypto.randomUUID(),safeName=file.name.replace(/[^\p{L}\p{N}._-]+/gu,"-").slice(-120),objectKey=`users/${encodeURIComponent(user.email)}/${tripId}/${id}-${safeName}`,expenseDate=prefill.startAt?.slice(0,10)??null,amountMinor=prefill.amount?Math.round(Number(prefill.amount)*100):null;
 const {env}=await import("cloudflare:workers");await env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:file.type},customMetadata:{owner:user.email,tripId,documentType}});
 const now=new Date().toISOString();await db.insert(uploadedDocuments).values({id,ownerEmail:user.email,tripId,objectKey,contentHash,originalName:file.name,mimeType:file.type,sizeBytes:file.size,documentType,claimType,expenseDate,merchant:prefill.title,currency:prefill.currency,amountMinor,status:"review",extractionConfidence:prefill.score,extractionWarnings:JSON.stringify(prefill.warnings),sourceExcerpt:prefill.sourceExcerpt,createdAt:now,updatedAt:now});
 return NextResponse.json({id,originalName:file.name,documentType,status:"review",confidence:prefill.score,warnings:prefill.warnings,prefill});
}
