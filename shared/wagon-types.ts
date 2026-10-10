// Source: user-provided "Vagon numaraları eşleştirme.txt".
// A trailing dash in the source means every four-digit code with this prefix.
const exact:Record<string,string>={
 '1810':'Gabs','2461':'Hbbillnss','0838':'Tadns','0665':'Talns (TSI)',
 '5133':'Els','5300':'Eaos','5379':'Eanoss','5520':'Es','6377':'Fas',
 '6950':'Fabls','4425':'Lgs-w','3546':'Rilnss','3547':'Rilnss (TSI)',
 '3816':'Rgns (TSI)','4540':'Sgs','4543':'Sgns (TSI)',
 '4568':'Sgss-w','4855':'Saps','4952':'Sggmrs (TSI)',
 '9952':'Ua','9956':'Ua','9964':'Ua','7836':'Zans','7878':'Zaes',
 '7952':'Zas','7968':'Zaes','7834':'Zacens (TSI)',
 '7851':'Zas','7580':'Zas','7581':'Zae','7880':'Zae',
};
const prefixes:Record<string,string>={
 '150':'Gbs','275':'Habis','285':'Habiss','932':'Uadgs','935':'Uadgs',
 '537':'Eanoss (TSI)','538':'Eanoss (TSI)','655':'Fal','665':'Fals',
 '644':'Falns','664':'Falns','330':'Ks','470':'Ss','993':'Ua',
};
export const MAPPED_WAGON_TYPES=[...new Set([...Object.values(exact),...Object.values(prefixes)])];
export function wagonTypeFromNumber(number:string):string {
 const code=/^\d{4} (\d{3,4}) \d{3}-\d$/.exec(number)?.[1];
 return code?(exact[code]??prefixes[code.slice(0,3)]??''):'';
}
