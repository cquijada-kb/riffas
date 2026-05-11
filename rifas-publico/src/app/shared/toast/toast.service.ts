import { Injectable } from '@angular/core';
export type ToastType = 'success'|'error'|'info';
export interface ToastState { open:boolean; type:ToastType; title:string; message?:string; }
@Injectable({ providedIn:'root' })
export class ToastService {
  state: ToastState = { open:false, type:'info', title:'' };
  private t?: any;
  show(type: ToastType, title: string, message?: string, ms=2600){
    this.state = { open:true, type, title, message };
    if (this.t) clearTimeout(this.t);
    this.t = setTimeout(()=>this.hide(), ms);
  }
  hide(){ this.state = { ...this.state, open:false }; }
}
