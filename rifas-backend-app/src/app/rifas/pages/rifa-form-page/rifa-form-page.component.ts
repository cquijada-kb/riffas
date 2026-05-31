import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Rifa } from '../../models/rifa.model';
import { RifasService } from '../../services/rifas.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';



@Component({
  selector: 'app-rifa-form-page',
  templateUrl: './rifa-form-page.component.html',
  styleUrls: ['./rifa-form-page.component.scss']
})
export class RifaFormPageComponent implements OnInit {
  isEdit = false;
  rifaId?: string;
  loading = false;

  // Solo declaramos, sin inicializar con this.fb aquí
  form!: FormGroup;

  cantidadesPreset = [100, 200, 500, 1000];
  imagenes: { file: File; preview: string }[] = [];

  imagenesExistentes: string[] = [];
  imagenesNuevas: { file: File; preview: string }[] = [];
  stickersExistentes: string[] = [];
  stickersNuevos: { file: File; name: string; preview?: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rifasService: RifasService
  ) {
    // Inicializamos el form dentro del constructor
    this.form = this.fb.group({
      titulo: ['', [Validators.required]],
      subtitulo: [''],
      descripcionPremio: ['', [Validators.required]],
      condiciones: [''],
      cantidadNumeros: [100, [Validators.required, Validators.min(1)]],
      precioPorNumero: [1000, [Validators.required, Validators.min(1)]],
      limitePorUsuario: [5, [Validators.required, Validators.min(1)]],
      fechaCierre: [null],
      fechaInicioVenta: [null],
      fechaTerminoVenta: [null],
      fechaSorteo: [null],
      paquetes: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('id');
          if (!id) {
            return of(null);
          }
          this.isEdit = true;
          this.rifaId = id;
          this.loading = true;
          return this.rifasService.getRifaById(id);
        })
      )
      .subscribe((rifa: Rifa | null) => {
        if (rifa) {
          this.form.patchValue({
            titulo: rifa.titulo,
            subtitulo: rifa.subtitulo ?? '',
            descripcionPremio: rifa.descripcionPremio,
            condiciones: rifa.condiciones ?? '',
            cantidadNumeros: rifa.cantidadNumeros,
            precioPorNumero: rifa.precioPorNumero,
            limitePorUsuario: rifa.limitePorUsuario,
            fechaCierre: rifa.fechaCierre ? new Date(rifa.fechaCierre) : null,
            fechaInicioVenta: rifa.fechaInicioVenta ? new Date(rifa.fechaInicioVenta) : null,
            fechaTerminoVenta: rifa.fechaTerminoVenta ? new Date(rifa.fechaTerminoVenta) : null,
            fechaSorteo: rifa.fechaSorteo ? new Date(rifa.fechaSorteo) : null
          });
          this.imagenesExistentes = (rifa as any).imagenes ?? [];
          this.stickersExistentes = (rifa as any).stickers ?? [];
          this.setPackages(rifa.paquetes ?? []);
        } else {
          this.setPackages([
            { cantidad: 1, precio: 1000, etiqueta: '1 sticker' },
            { cantidad: 6, precio: 5000, etiqueta: '6 stickers' },
            { cantidad: 13, precio: 10000, etiqueta: '13 stickers' }
          ]);
        }
        this.loading = false;
      });

  }

  get paquetes(): FormArray {
    return this.form.get('paquetes') as FormArray;
  }

  packageGroup(value?: { cantidad?: number; precio?: number; etiqueta?: string }): FormGroup {
    return this.fb.group({
      cantidad: [value?.cantidad ?? 1, [Validators.required, Validators.min(1)]],
      precio: [value?.precio ?? 1000, [Validators.required, Validators.min(0)]],
      etiqueta: [value?.etiqueta ?? '']
    });
  }

  setPackages(packages: Array<{ cantidad: number; precio: number; etiqueta?: string }>): void {
    this.paquetes.clear();
    const safePackages = packages.length ? packages : [{ cantidad: 1, precio: this.form.get('precioPorNumero')?.value ?? 1000 }];
    safePackages.forEach(pkg => this.paquetes.push(this.packageGroup(pkg)));
  }

  addPackage(): void {
    this.paquetes.push(this.packageGroup());
  }

  removePackage(index: number): void {
    if (this.paquetes.length <= 1) {
      return;
    }
    this.paquetes.removeAt(index);
  }

  submit(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value as any;
    const formData = new FormData();

    formData.append('titulo', value.titulo);
formData.append('subtitulo', value.subtitulo ?? '');
formData.append('descripcion', value.descripcionPremio);
formData.append('condiciones', value.condiciones ?? '');
formData.append('totalTickets', String(value.cantidadNumeros));
formData.append('precioTicket', String(value.precioPorNumero));
formData.append('limitePorUsuario', String(value.limitePorUsuario));
formData.append('paquetes', JSON.stringify(value.paquetes ?? []));

    if (value.fechaCierre) {
      formData.append('fechaCierre', value.fechaCierre.toISOString());
    }
    if (value.fechaInicioVenta) {
      formData.append('fechaInicioVenta', value.fechaInicioVenta.toISOString());
    }
    if (value.fechaTerminoVenta) {
      formData.append('fechaTerminoVenta', value.fechaTerminoVenta.toISOString());
    }
    if (value.fechaSorteo) {
      formData.append('fechaSorteo', value.fechaSorteo.toISOString());
    }

    for (const img of this.imagenesNuevas) {
  formData.append('imagenes', img.file);
}

    for (const sticker of this.stickersNuevos) {
      formData.append('stickers', sticker.file);
    }


    // 👇 imágenes
    this.imagenes.forEach((img, i) => {
      formData.append('imagenes', img.file);
    });

    const request$ =
  this.isEdit && this.rifaId
    ? this.rifasService.actualizarRifaFormData(this.rifaId, formData)
    : this.rifasService.crearRifaFormData(formData);

    request$.subscribe(() => {
      this.router.navigate(['/rifas']);
    });
  }


  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);

    for (const file of files) {
      if (this.imagenes.length >= 3) break;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagenes.push({
          file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removeImage(index: number): void {
    this.imagenes.splice(index, 1);
  }

  onNewImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    // REEMPLAZA: al seleccionar nuevas, se limpian previas nuevas
    this.imagenesNuevas = [];

    const files = Array.from(input.files).slice(0, 3);

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenesNuevas.push({
          file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removeNewImage(index: number): void {
    this.imagenesNuevas.splice(index, 1);
  }

  onStickersSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    this.stickersNuevos = [];
    const files = Array.from(input.files).slice(0, 10);

    for (const file of files) {
      const item = { file, name: file.name, preview: undefined as string | undefined };
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          item.preview = reader.result as string;
        };
        reader.readAsDataURL(file);
      }
      this.stickersNuevos.push(item);
    }

    input.value = '';
  }

  removeSticker(index: number): void {
    this.stickersNuevos.splice(index, 1);
  }

}
