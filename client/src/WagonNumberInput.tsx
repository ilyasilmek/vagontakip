import { useId, useLayoutEffect, useRef, useState } from 'react';

const digits=(value:string)=>value.replace(/[^0-9]/g,'').slice(0,12);
export function formatWagonNumber(value:string):string {
 const n=digits(value);
 if(n.length===11)return `${n.slice(0,4)} ${n.slice(4,7)} ${n.slice(7,10)}-${n.slice(10)}`;
 return n.slice(0,4)+(n.length>4?' '+n.slice(4,8):'')+(n.length>8?' '+n.slice(8,11):'')+(n.length>11?'-'+n.slice(11,12):'');
}
const pattern='[0-9]{4} [0-9]{4} [0-9]{3}-[0-9]';
const message='Vagon numarası 12 rakamlıdır; boşluklar ve tire otomatik eklenir.';
export default function WagonNumberInput({value,onChange,original,required=false,readOnly=false,disabled=false,id,label}:{value:string;onChange:(value:string)=>void;original?:string;required?:boolean;readOnly?:boolean;disabled?:boolean;id?:string;label:string}){
 const hint=useId(),ref=useRef<HTMLInputElement>(null),cursorRef=useRef<{value:string;position:number}|null>(null),[attempted,setAttempted]=useState(false);
 useLayoutEffect(()=>{const desired=cursorRef.current,input=ref.current;if(desired&&desired.value===value){if(input&&input===document.activeElement)input.setSelectionRange(desired.position,desired.position);cursorRef.current=null;}},[value]);
 // Historical identifiers stay intact when only other fields are edited.
 const historical=!!original&&value===original;
 const invalid=!historical&&((required&&!value)||(!!value&&!new RegExp('^'+pattern+'$').test(value)));
 function change(raw:string,position:number){
  const formatted=formatWagonNumber(raw),count=digits(raw.slice(0,position)).length;
  let cursor=0,seen=0;while(cursor<formatted.length&&seen<count){if(/[0-9]/.test(formatted[cursor]))seen++;cursor++;}
  if(formatted===value){const input=ref.current;if(input){input.value=formatted;input.setSelectionRange(cursor,cursor);}cursorRef.current=null;}else{cursorRef.current={value:formatted,position:cursor};}
  onChange(formatted);
 }
 return <><input ref={ref} id={id} aria-label={label} type="text" inputMode="numeric" autoComplete="off" placeholder="1234 5678 901-2" value={value} required={required} readOnly={readOnly} disabled={disabled} pattern={historical?undefined:pattern} aria-describedby={hint} aria-invalid={attempted&&invalid} className={attempted&&invalid?'wagon-number-invalid':undefined} onInvalid={e=>{setAttempted(true);e.currentTarget.setCustomValidity(message);}} onBlur={()=>setAttempted(true)} onChange={e=>{e.target.setCustomValidity('');change(e.target.value,e.target.selectionStart??e.target.value.length);}} onKeyDown={e=>{
  const input=e.currentTarget,start=input.selectionStart??0,end=input.selectionEnd??start;
  if(readOnly||start!==end)return;
  // Deleting a generated separator removes the adjacent digit, rather than getting stuck.
  if(e.key==='Backspace'&&start>0&&/[ -]/.test(value[start-1])){e.preventDefault();input.setCustomValidity('');change(value.slice(0,start-2)+value.slice(start),start-2);}
  else if(e.key==='Delete'&&/[ -]/.test(value[start]??'')&&start<value.length){e.preventDefault();input.setCustomValidity('');change(value.slice(0,start)+value.slice(start+2),start);}
 }}/><span id={hint} className={attempted&&invalid?'field-error':'field-hint'} role={attempted&&invalid?'alert':undefined}>{attempted&&invalid?message:historical&&!new RegExp('^'+pattern+'$').test(value)?'Mevcut numara korunur. Değiştirirken 12 rakam girin.':message}</span></>;
}
