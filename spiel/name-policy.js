// One policy used by the browser and embedded in the Edge Function.
export function nameError(value){
  const name=typeof value==='string'?value.normalize('NFKC').trim():'';
  if(!/^[\p{L}\p{N} _.-]{1,16}$/u.test(name))return 'Bitte wähle 1–16 Zeichen: Buchstaben, Zahlen, Leerzeichen, Punkt, _ oder -.';
  const confusables={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','ѕ':'s','ο':'o','α':'a','ι':'i','ε':'e','κ':'k','τ':'t'};
  const plain=name.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/ß/g,'ss').replace(/[аеорсхуіјѕοαιεκτ]/g,c=>confusables[c]);
  const fold=s=>s.replace(/[01345789]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','9':'g'}[c])).replace(/[^a-z]/g,'').replace(/(.)\1+/g,'$1');
  const compact=fold(plain);
  // Longer terms also match inside combinations; short terms require a whole name/token.
  const blocked=['arschloch','arshloch','arschlecker','scheisse','scheisse','scheiss','schiisse','schiis','schiss','huere','huara','huare','huera','figdi','figgdi','sexgott','sexking','sexmaschine','hueresohn','huresohn','hurensohn','hure','huerensohn','fotze','votze','futz','futze','fick','figg','figer','ficker','wichs','wixxer','wixer','wanker','schwanz','schwanzlutscher','schlampe','schlamp','schlampe','schlampa','schlampe','drecksau','saftsack','miststuck','missgeburt','bastard','habasch','sautubel','sautubel','saudepp','sauhund','gopfertami','gopferdammi','gopfertammi','gopfertori','gopferteckel','gopferdeckel','verfickt','verfiggt','verdammt','chotzbrocke','chotz','piss','pimmel','penis','vagina','klitoris','clitoris','porn','porno','masturb','blasen','blowjob','handjob','cumshot','gangbang','dildo','orgasm','fuck','bitch','cunt','motherfucker','asshole','shit','slut','nigger','nigga','neger','kanake','schwuchtel','schwuchtle','schwule sau','schwulesau','faggot','heilhitler','siegheil','hitler','holocaust','judensau','judenhass','gaschamber','vergas','kill yourself','killyourself','vergewalt','rape','rapist'];
  const short=['sex','sexy','anal','anus','cum','tit','tits','boob','boobs','ass','dick','cock','nazi','nigger','nigga','fag','kys','sau','tubel','dubel','trottel','idiot','depp','seckel','seggel','sack','lappi','gigu','gagel','gaggi','gaggi','chack','kack','kacke','kaka','arsch','fudi','fudli','fuedli','homo','huer'];
  const tokens=plain.split(/[ _.-]+/).filter(Boolean).map(fold);
  if(blocked.some(term=>compact.includes(fold(term)))||short.some(term=>compact===fold(term)||tokens.includes(fold(term)))||/(?:^|[ _.-])(?:69|1488|18[ _.-]?88)(?:$|[ _.-])/.test(plain))return 'Dieser Spielername ist nicht erlaubt. Bitte wähle einen respektvollen, neutralen Namen.';
  return '';
}
