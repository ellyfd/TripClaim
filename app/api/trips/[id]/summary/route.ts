import {NextRequest,NextResponse} from "next/server";
import {and,asc,eq,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {requireTripMember} from "../../../../../db/access";
import {agendaItems,travelBookings,tripDestinations,tripMembers,trips} from "../../../../../db/schema";
import {travelBookingForViewer} from "../../../../../db/travel-booking-visibility";
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});if(!await requireTripMember(id,user.email))return NextResponse.json({error:"forbidden"},{status:403});const db=await getDb(),[[trip],destinations,members,agenda,bookings]=await Promise.all([db.select().from(trips).where(eq(trips.id,id)).limit(1),db.select().from(tripDestinations).where(eq(tripDestinations.tripId,id)).orderBy(asc(tripDestinations.sequence)),db.select().from(tripMembers).where(eq(tripMembers.tripId,id)),db.select().from(agendaItems).where(and(eq(agendaItems.tripId,id),isNull(agendaItems.deletedAt))).orderBy(asc(agendaItems.startsAt)),db.select().from(travelBookings).where(and(eq(travelBookings.tripId,id),isNull(travelBookings.deletedAt))).orderBy(asc(travelBookings.startAt))]);if(!trip)return NextResponse.json({error:"not_found"},{status:404});return NextResponse.json({trip,destinations,members,agenda,bookings:bookings.map(booking=>travelBookingForViewer(booking,user.email))});}
