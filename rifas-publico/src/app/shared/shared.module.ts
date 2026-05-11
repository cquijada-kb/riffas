import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ToastComponentx } from './toast/toast.component';

@NgModule({
  declarations: [
    ToastComponentx,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    ToastComponentx, // 👈 MUY IMPORTANTE
  ],
})
export class SharedModule {}
