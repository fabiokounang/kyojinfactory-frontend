import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VendorService } from '../../core/services/vendor.service';
import { Vendor } from '../../core/models/vendor.model';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './vendor-list.html',
  styleUrl: './vendor-list.scss',
})
export class VendorListComponent {
  private readonly vendorService = inject(VendorService);
  private readonly snackBar = inject(MatSnackBar);

  readonly vendors = signal<Vendor[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly displayedColumns = ['code', 'name', 'contactPerson', 'phone', 'status', 'actions'];

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.vendorService.list({ search: this.search() || undefined, includeInactive: true }).subscribe({
      next: (data) => { this.vendors.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(val: string): void { this.search.set(val); this.load(); }

  deactivate(v: Vendor): void {
    if (!confirm(`Nonaktifkan vendor "${v.name}"?`)) return;
    this.vendorService.remove(v.id).subscribe({
      next: () => { this.snackBar.open('Vendor dinonaktifkan', 'OK', { duration: 3000 }); this.load(); },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 });
      },
    });
  }
}
