import { Component, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { MasterItemService } from '../../core/services/master-item.service';
import { AuthService } from '../../core/services/auth.service';
import { ItemCategory, MasterItem } from '../../core/models/master-item.model';
import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';
import { MasterItemDialogComponent } from './master-item-dialog';

@Component({
  selector: 'app-master-item-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    DisplayDatePipe,
  ],
  templateUrl: './master-item-list.html',
  styleUrl: './master-item-list.scss',
})
export class MasterItemListComponent {
  private readonly itemService = inject(MasterItemService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly items = signal<MasterItem[]>([]);
  readonly loading = signal(true);
  readonly category = signal<ItemCategory | ''>('');
  readonly search = signal('');
  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly displayedColumns = computed(() => {
    const cols = ['code', 'name', 'category', 'unit', 'stdSize', 'version', 'createdAt'];
    if (this.isSuperAdmin()) cols.push('actions');
    return cols;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.itemService
      .list({
        category: this.category() || undefined,
        search: this.search() || undefined,
      })
      .subscribe({
        next: (data) => {
          this.items.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onCategory(value: string): void {
    this.category.set(value as ItemCategory | '');
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.load();
  }

  openEdit(item: MasterItem): void {
    const ref = this.dialog.open(MasterItemDialogComponent, {
      width: '480px',
      data: { item },
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.itemService.update(item.id, result).subscribe({
        next: () => {
          this.snackBar.open('Master item diperbarui', 'OK', { duration: 3000 });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(err.error?.message || 'Gagal menyimpan', 'Tutup', { duration: 5000 });
        },
      });
    });
  }

  remove(item: MasterItem): void {
    if (!confirm(`Hapus master item "${item.name}" (${item.code})?`)) return;
    this.itemService.remove(item.id).subscribe({
      next: () => {
        this.snackBar.open('Master item dihapus', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menghapus', 'Tutup', { duration: 5000 });
      },
    });
  }
}
