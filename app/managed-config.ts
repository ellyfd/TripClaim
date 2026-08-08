export const DEFAULT_CURRENCIES=[
 ["TWD","台幣"],["USD","美金"],["CNY","人民幣"],["JPY","日元"],["IDR","印尼盾"],["KHR","柬幣"],
 ["GBP","英鎊"],["HKD","港幣"],["PHP","菲披索"],["VND","越南盾"],["EUR","歐元"],["KRW","韓元"],
 ["TRY","土耳其里拉"],["DKK","丹麥克朗"],["CAD","加拿大幣"],["GTQ","瓜地馬拉格查爾"],
 ["INR","印度盧比"],["ETB","衣索比亞比爾"],["BDT","孟加拉塔卡"],["AED","阿聯迪拉姆"],
 ["JOD","約旦丁那"],["EGP","埃及鎊"],["THB","泰銖"],["SGD","新加坡幣"],["AUD","澳幣"]
] as const;
export const DEFAULT_CLAIM_TYPES=["機票(自行刷卡)","住宿","車資","落地簽證費","預支歸還","餐飲","交際費／伴手禮","行李託運費","疫苗／檢測費用","探親樣衣","無報支費用","電信網路費","簽證費用","國外交易手續費"];
export const DEFAULT_COUNTRIES=["澳洲 AUS","奧地利 AUT","比利時 BEL","孟加拉 BGD","加拿大 CAN","瑞士 CHE","中國大陸 CHN","德國 DEU","丹麥 DNK","多明尼加 DOM","西班牙 ESP","衣索比亞 ETH","法國 FRA","英國 GBR","瓜地馬拉 GTM","香港 HKG","宏都拉斯 HND","印度 IND","印尼 IDN","義大利 ITA","日本 JPN","約旦 JOR","韓國 KOR","馬來西亞 MYS","紐西蘭 NZL","荷蘭 NLD","菲律賓 PHL","波蘭 POL","新加坡 SGP","泰國 THA","土耳其 TUR","台灣 TWN","阿聯 UAE","美國 USA","越南 VNM"];
export const DEFAULT_DESTINATIONS:Record<string,string[]>={
 "澳洲 AUS":["雪梨 Sydney","布里斯本 Brisbane","墨爾本 Melbourne"],"奧地利 AUT":["維也納 Vienna"],"比利時 BEL":["布魯塞爾 Brussels"],"孟加拉 BGD":["達卡 Dhaka"],"加拿大 CAN":["多倫多 Toronto","基洛納 Kelowna","溫哥華 Vancouver"],"瑞士 CHE":["日內瓦 Geneva"],"中國大陸 CHN":["上海虹橋 Shanghai Hong Qiao","上海浦東 Shanghai Pu Dong","嘉興 Jiaxing","香港 Hong Kong","澳門 Macau","揚州 Yangzhou","廣州 Guangzhou","成都 Chengdu","東莞 DongGuan","南京 Nanjing","北京 Beijing","台州 Taizhou","無錫 Wuxi","杭州 Hangzhou","青島 Qingdao","南昌 Nanchang","南寧 Nanning","泉州 Quanzhou","珠海 Zhuhai","常州 Changzhou","深圳 Shenzhen","長沙 Changsha","廈門 Xiamen","寧波 Ningbo","福州 Fuzhou","鄭州 Zhengzhou"],"德國 DEU":["法蘭克福 Frankfurt","慕尼黑 Munich","杜塞道夫 Dusseldorf","柏林 Berlin","科隆 Cologne"],"丹麥 DNK":["哥本哈根 Copenhagen"],"多明尼加 DOM":["聖多明哥 Santo Domingo"],"西班牙 ESP":["巴塞隆納 Barcelona","拉科魯尼亞 La Coruna","馬德里 Madrid"],"衣索比亞 ETH":["阿迪斯阿貝巴 Addis Ababa","阿瓦薩 Awasa","馬卡勒 Makale","德雷達瓦 Dire Dawa"],"法國 FRA":["巴黎 Paris"],"英國 GBR":["倫敦 London"],"瓜地馬拉 GTM":["瓜地馬拉市 Guatemala"],"香港 HKG":["香港 Hong Kong"],"印度 IND":["孔巴托 Coimbatore","孟買 Mumbai","班加羅爾 Bengaluru","德里 Delhi"],"印尼 IDN":["三寶隆 Semarang","雅加達 Jakarta","峇里島 Bali","梭羅 Solo City","萬隆 Bandung"],"義大利 ITA":["羅馬 Rome","米蘭 Milan"],"日本 JPN":["東京 Tokyo","大阪 Osaka","名古屋 Nagoya"],"約旦 JOR":["安曼 Amman","亞喀巴 Gulf of Aqaba"],"韓國 KOR":["首爾 Seoul","金浦 Gimpo","釜山 Busan"],"馬來西亞 MYS":["吉隆坡 Kuala Lumpur"],"紐西蘭 NZL":["奧克蘭 Auckland"],"荷蘭 NLD":["阿姆斯特丹 Amsterdam"],"菲律賓 PHL":["馬尼拉 Manila"],"波蘭 POL":["華沙 Warsaw"],"新加坡 SGP":["新加坡 Singapore"],"泰國 THA":["曼谷 Bangkok"],"土耳其 TUR":["伊斯坦堡 Istanbul"],"台灣 TWN":["台北 Taipei","高雄 Kaohsiung","嘉義 Chiayi","台中 Taichung","台南 Tainan","宜蘭 Yilan","松山 Taipei Songshan","南投 Nantou","苗栗 Miaoli","桃園 Taoyuan","雲林 Yunlin","新竹 Hsinchu","彰化 Changhua"],"阿聯 UAE":["杜拜 Dubai"],"美國 USA":["明尼亞波利斯 Minneapolis","波士頓 Boston","洛杉磯 Los Angeles","紐約 New York","密爾瓦基 Milwaukee","舊金山 San Francisco","丹佛 Denver","匹茲堡 Pittsburgh","休士頓 Houston","西雅圖 Seattle","亞特蘭大 Atlanta","拉斯維加斯 Las Vegas","波特蘭 Portland","芝加哥 Chicago","春田市 Springfield","哥倫布 Columbus","納什維爾 Nashville","華盛頓 Washington","奧蘭多 Orlando","聖地牙哥 San Diego","達拉斯 Dallas","鳳凰城 Phoenix","邁阿密 Miami"],"越南 VNM":["峴港 Da Nang","順化 Hue","胡志明市 Ho Chi Minh","海防 Haiphong"]
};
export type ManagedConfig={claimTypes:string[];countries:string[]};
const defaults:ManagedConfig={claimTypes:DEFAULT_CLAIM_TYPES,countries:DEFAULT_COUNTRIES};
export const MANAGED_CURRENCY_CODES=new Set(DEFAULT_CURRENCIES.map(([code])=>code));
export const MANAGED_CLAIM_TYPES=new Set(DEFAULT_CLAIM_TYPES);
export const normalizeCurrency=(value:string)=>MANAGED_CURRENCY_CODES.has(value.toUpperCase())?value.toUpperCase():"TWD";
export type CurrencyDecision={originalCurrency:string;reportingCurrency:string;requiresTwd:boolean;reason:string|null};
export const decideReportingCurrency=(value:string|undefined|null):CurrencyDecision=>{
 const original=(value||"TWD").trim().toUpperCase()||"TWD";
 const allowed=MANAGED_CURRENCY_CODES.has(original);
 return {originalCurrency:original,reportingCurrency:allowed?original:"TWD",requiresTwd:!allowed,reason:allowed?null:`${original} 不在公司可申報幣別，只能以 TWD 報支`};
};
export const isManagedClaimType=(value:string|undefined|null):value is string=>Boolean(value&&MANAGED_CLAIM_TYPES.has(value));
export const isManagedDestination=(countryCode:string|undefined,countryName:string|undefined,cityName:string|undefined)=>{
 if(!countryCode||!countryName||!cityName)return false;
 const country=DEFAULT_COUNTRIES.find(x=>x.endsWith(` ${countryCode.toUpperCase()}`));
 return Boolean(country&&country.startsWith(countryName)&&DEFAULT_DESTINATIONS[country]?.includes(cityName));
};
// 公司固定主檔由程式版本／公司系統提供；相容介面刻意不提供 save。
export function useManagedConfig(){return {config:defaults} as const}
