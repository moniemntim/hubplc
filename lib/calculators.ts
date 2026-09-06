export function analogScale(current:string,low:string,high:string){
 if([current,low,high].some(v=>!v.trim()))throw new Error('請填寫所有欄位。');
 const [mA,min,max]=[current,low,high].map(Number);
 if(![mA,min,max].every(Number.isFinite))throw new Error('請輸入有效的數字。');
 if(max<=min)throw new Error('量程上限必須大於下限。');
 const percent=(mA-4)/16*100,value=min+(mA-4)/16*(max-min);
 if(!Number.isFinite(value)||!Number.isFinite(percent))throw new Error('數值過大，請縮小輸入範圍。');
 return {value,percent,outside:mA<4||mA>20};
}
export function convertBase(raw:string,base:number){
 const text=raw.trim(),patterns:Record<number,RegExp>={2:/^[01]+$/,10:/^\d+$/,16:/^[0-9a-fA-F]+$/};
 if(!patterns[base]?.test(text))throw new Error('請輸入該進位的非負整數，不含 0x／0b 前綴。');
 if(text.length>64)throw new Error('最多輸入 64 位數字。');
 const value=BigInt((base===16?'0x':base===2?'0b':'')+text);
 if(value>BigInt(4294967295))throw new Error('支援範圍為 0～4,294,967,295（32 位元無號整數）。');
 return {decimal:value.toString(10),hex:value.toString(16).toUpperCase().padStart(4,'0'),binary:value.toString(2).padStart(16,'0')};
}
export function modbusAddress(raw:string){
 if(!/^\d+$/.test(raw.trim()))throw new Error('請輸入整數位址。');
 const register=Number(raw);
 if(register<40001||register>49999)throw new Error('此工具使用五位數 4xxxx 慣例，範圍為 40001～49999。');
 const offset=register-40001;
 return {offset,hex:offset.toString(16).toUpperCase().padStart(4,'0')};
}

