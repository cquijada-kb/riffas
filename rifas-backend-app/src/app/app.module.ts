import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { AdminSectionPageComponent } from './admin/pages/admin-section-page/admin-section-page.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { DashboardPageComponent } from './dashboard/pages/dashboard-page/dashboard-page.component';
import { LayoutComponent } from './layout/layout.component';
import { MaterialModule } from './shared/material.module';

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    DashboardPageComponent,
    AdminSectionPageComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    MaterialModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
