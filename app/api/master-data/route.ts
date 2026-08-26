import {NextResponse} from "next/server";
import {getChatGPTUser} from "../../chatgpt-auth";
import {ensureUser} from "../../../db/access";
import {getCompanyMasterCatalog} from "../../../db/company-master";

export async function GET(){
 const user=await getChatGPTUser();
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 await ensureUser(user);
 return NextResponse.json(await getCompanyMasterCatalog(),{headers:{"cache-control":"private, max-age=300"}});
}
