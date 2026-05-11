import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminSectionPageComponent } from './admin/pages/admin-section-page/admin-section-page.component';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardPageComponent } from './dashboard/pages/dashboard-page/dashboard-page.component';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardPageComponent
      },
      {
        path: 'rifas',
        loadChildren: () =>
          import('./rifas/rifas.module').then(m => m.RifasModule)
      },
      {
        path: 'usuarios',
        component: AdminSectionPageComponent,
        data: {
          section: 'Usuarios',
          title: 'Administracion de usuarios',
          description:
            'Directorio operativo con filtros de estado, actividad y tickets asociados.'
        }
      },
      {
        path: 'pagos',
        component: AdminSectionPageComponent,
        data: {
          section: 'Pagos',
          title: 'Gestion de pagos',
          description:
            'Supervision del flujo financiero, liquidaciones y reportes contables.'
        }
      },
      {
        path: 'trazabilidad',
        component: AdminSectionPageComponent,
        data: {
          section: 'Trazabilidad',
          title: 'Trazabilidad y log',
          description:
            'Registro editorial de eventos criticos, alertas y auditoria operativa.'
        }
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
