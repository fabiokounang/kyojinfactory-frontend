import { Component, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';

import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';
import { CustomerDialogComponent } from './customer-dialog';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerListComponent {
  private readonly customerService = inject(CustomerService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');

  readonly displayedColumns = ['code', 'name', 'contactPerson', 'phone', 'email', 'status', 'actions'];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.customerService
      .list({ search: this.search() || undefined, includeInactive: true })
      .subscribe({
        next: (data) => {
          this.customers.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.load();
  }

  openCreate(): void {
    this.openDialog();
  }

  openEdit(c: Customer): void {
    this.openDialog(c);
  }

  private openDialog(customer?: Customer): void {
    const ref = this.dialog.open(CustomerDialogComponent, {
      width: '480px',
      data: { customer },
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      const obs = customer
        ? this.customerService.update(customer.id, result)
        : this.customerService.create(result);

      obs.subscribe({
        next: () => {
          this.snackBar.open(customer ? 'Customer diperbarui' : 'Customer ditambahkan', 'OK', {
            duration: 3000,
          });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(err.error?.message || 'Gagal menyimpan', 'Tutup', { duration: 5000 });
        },
      });
    });
  }

  remove(c: Customer): void {
    if (!confirm(`Nonaktifkan customer "${c.name}"?`)) return;
    this.customerService.remove(c.id).subscribe({
      next: () => {
        this.snackBar.open('Customer dinonaktifkan', 'OK', { duration: 3000 });
        this.load();
      },
    });
  }
}
