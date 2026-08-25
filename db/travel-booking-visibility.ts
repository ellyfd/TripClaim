type TravelBookingVisibilityInput={ownerEmail:string;documentId?:string|null};

export const travelBookingForViewer=<T extends TravelBookingVisibilityInput>(booking:T,viewerEmail:string)=>{
 const isOwner=booking.ownerEmail===viewerEmail;
 return {...booking,documentId:isOwner?(booking.documentId??null):null,canEdit:isOwner};
};
