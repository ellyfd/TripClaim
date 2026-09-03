/**
 * 統一 SVG icon 家族（UI/UX 盤點 #5：取代 ⌂ ▤ ✓ ✈ ✎ 🗑 × ＋ 等文字符號）。
 *
 * 線性風格、24 viewBox、stroke 2、currentColor；尺寸跟隨 font-size（1em），
 * 因此可直接放進既有的 <i> 容器與按鈕文字旁而不需改版面。
 * 預設 aria-hidden：圖示旁一律有可見文字或 aria-label 承載語意。
 */
import type {SVGProps} from "react";

type IconProps=SVGProps<SVGSVGElement>&{label?:string};

function Icon({label,children,...rest}:IconProps){
 return <svg className="icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label?undefined:true} role={label?"img":undefined} aria-label={label} focusable="false" {...rest}>{children}</svg>;
}

export const HomeIcon=(p:IconProps)=><Icon {...p}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></Icon>;
export const CalendarIcon=(p:IconProps)=><Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>;
export const ReceiptIcon=(p:IconProps)=><Icon {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></Icon>;
export const PlaneIcon=(p:IconProps)=><Icon {...p}><path d="M2.5 13.5 21 9.5a1.5 1.5 0 0 0-1-2.8l-5 1.2-6.5-4.4-2.5.7 4 5.2-4.5 1.1-2.2-1.6-2 .5 2.3 3.5z"/><path d="M8 20h8"/></Icon>;
export const BedIcon=(p:IconProps)=><Icon {...p}><path d="M3 18V8"/><path d="M3 14h18v4"/><path d="M3 11h9v3"/><path d="M12 11h6a3 3 0 0 1 3 3"/><circle cx="7" cy="8" r="1.5"/></Icon>;
export const CheckIcon=(p:IconProps)=><Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5"/></Icon>;
export const PencilIcon=(p:IconProps)=><Icon {...p}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m13.5 8 3 3"/></Icon>;
export const TrashIcon=(p:IconProps)=><Icon {...p}><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></Icon>;
export const XIcon=(p:IconProps)=><Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>;
export const PlusIcon=(p:IconProps)=><Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
export const CardIcon=(p:IconProps)=><Icon {...p}><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/></Icon>;
export const AlertIcon=(p:IconProps)=><Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></Icon>;
export const QuestionIcon=(p:IconProps)=><Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/></Icon>;
export const DateRangeIcon=(p:IconProps)=><Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15h8"/></Icon>;
