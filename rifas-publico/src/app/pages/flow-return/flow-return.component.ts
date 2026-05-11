import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-flow-return',
  templateUrl: './flow-return.component.html',
  styleUrls: ['./flow-return.component.css'],
})
export class FlowReturnComponent implements OnInit {
  loading = true;
  title = 'Validando pago';
  message = 'Estamos confirmando tu compra. Esto puede tardar unos segundos.';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const flowOrderId = this.route.snapshot.queryParamMap.get('flowOrderId') || '';
    const status = (this.route.snapshot.queryParamMap.get('status') || '').toUpperCase();
    const token = this.route.snapshot.queryParamMap.get('token') || '';

    if (flowOrderId) {
      void this.router.navigate(['/pago/resultado'], {
        queryParams: {
          flowOrderId,
          ...(status ? { status } : {}),
        },
        replaceUrl: true,
      });
      return;
    }

    if (token) {
      const backendReturnUrl = `${this.getBackendBaseUrl()}/flow/return?token=${encodeURIComponent(token)}`;
      window.location.replace(backendReturnUrl);
      return;
    }

    this.loading = false;
    this.title = 'No se pudo validar el pago';
    this.message = 'No recibimos los datos necesarios para confirmar tu compra. Intenta nuevamente desde el sorteo.';
  }

  goHome(): void {
    void this.router.navigate(['/']);
  }

  private getBackendBaseUrl(): string {
    return environment.apiBaseUrl.replace(/\/api\/?$/, '');
  }
}
