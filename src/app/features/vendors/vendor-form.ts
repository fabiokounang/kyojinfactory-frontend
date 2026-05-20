import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { VendorService } from '../../core/services/vendor.service';

@Component({
  selector: 'app-vendor-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './vendor-form.html',
  styleUrl: './vendor-form.scss',
})
export class VendorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vendorService = inject(VendorService);
  private readonly snackBar = inject(MatSnackBar);

  readonly editId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);

  readonly form = this.fb.nonNullable.group({
    name:          ['', Validators.required],
    contactPerson: [''],
    phone:         [''],
    email:         ['', Validators.email],
    address:       [''],
    isActive:      [true],
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.editId.set(id);
      this.loading.set(true);
      this.vendorService.get(id).subscribe({
        next: (v) => {
          this.form.patchValue({
            name: v.name,
            contactPerson: v.contactPerson ?? '',
            phone: v.phone ?? '',
            email: v.email ?? '',
            address: v.address ?? '',
            isActive: v.isActive,
          });
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); this.router.navigate(['/vendors']); },
      });
    }
  }

  get title(): string { return this.editId() ? 'Edit Vendor' : 'Tambah Vendor Baru'; }

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      contactPerson: raw.contactPerson || null,
      phone: raw.phone || null,
      email: raw.email || null,
      address: raw.address || null,
      isActive: raw.isActive,
    };
    const op = this.editId()
      ? this.vendorService.update(this.editId()!, payload)
      : this.vendorService.create(payload);

    op.subscribe({
      next: () => {
        this.snackBar.open(this.editId() ? 'Vendor diperbarui' : 'Vendor berhasil dibuat', 'OK', { duration: 3000 });
        this.router.navigate(['/vendors']);
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menyimpan', 'Tutup', { duration: 5000 });
        this.busy.set(false);
      },
    });
  }

  cancel(): void { this.router.navigate(['/vendors']); }
}
