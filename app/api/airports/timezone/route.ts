import {NextRequest,NextResponse} from "next/server";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {MANAGED_TRAVEL_TIMEZONES,resolveAirportTimezone} from "../../../travel-timezone";

export async function GET(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const code=request.nextUrl.searchParams.get("code")??"",resolution=resolveAirportTimezone(code);
 return NextResponse.json({...resolution,availableTimezones:resolution.timezone?undefined:MANAGED_TRAVEL_TIMEZONES});
}
