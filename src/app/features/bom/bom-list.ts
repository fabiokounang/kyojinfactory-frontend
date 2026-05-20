import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BomService } from '../../core/services/bom.service';
import { MasterItemService } from '../../core/services/master-item.service';
import { AuthService } from '../../core/services/auth.service';
import { BomStatus, BomVersion } from '../../core/models/bom.model';
import { MasterItem } from '../../core/models/master-item.model';
import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';
import { BomVersionDialogComponent } from './bom-version-dialog';

const STATUS_OPTIONS: BomStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

@Component({
  selector: 'app-bom-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    DisplayDatePipe,
  ],
  templateUrl: './bom-list.html',
  styleUrl: './bom-list.scss',
})
export class BomListComponent {
  private readonly bomService = inject(BomService);
  private readonly itemService = inject(MasterItemService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly statusOptions = STATUS_OPTIONS;
  readonly loading = signal(true);
  readonly fgItems = signal<MasterItem[]>([]);
  readonly versions = signal<BomVersion[]>([]);
  readonly search = signal('');
  readonly filterFg = signal<number | ''>('');
  readonly statusFilter = signal<BomStatus | ''>('');
  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly displayedColumns = [
    'fgCode',
    'fgName',
    'revision',
    'components',
    'status',
    'createdAt',
    'actions',
  ];

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const fgId = this.filterFg();
    const status = this.statusFilter();

    return this.versions()
      .filter((v) => (fgId ? v.fgId === fgId : true))
      .filter((v) => (status ? v.status === status : true))
      .filter((v) => {
        if (!q) return true;
        return (
          v.fgCode.toLowerCase().includes(q) ||
          v.fgName.toLowerCase().includes(q) ||
          v.versionName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const byFg = a.fgName.localeCompare(b.fgName, 'id');
        if (byFg !== 0) return byFg;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      fg: this.itemService.list({ category: 'FG' }),
      versions: this.bomService.listVersions(),
    }).subscribe({
      next: ({ fg, versions }) => {
        this.fgItems.set(fg);
        this.versions.set(versions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  openCreate(): void {
    const ref = this.dialog.open(BomVersionDialogComponent, {
      width: '480px',
      data: { fgItems: this.fgItems(), preselectedFgId: this.filterFg() || null },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result?.fgId) return;
      this.bomService.openOrCreate(result.fgId).subscribe({
        next: ({ version, created }) => {
          const msg = created ? 'BOM draft dibuat' : 'Melanjutkan draft BOM';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
          this.router.navigate(['/bom', version.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(err.error?.message || 'Gagal membuka BOM', 'Tutup', {
            duration: 5000,
          });
        },
      });
    });
  }

  showRevisionLabel(v: BomVersion): string | null {
    if (v.status === 'DRAFT' && v.versionName === 'Utama') return null;
    return v.versionName;
  }

  remove(v: BomVersion): void {
    if (!confirm(`Hapus BOM draft untuk ${v.fgName}?`)) return;
    this.bomService.deleteVersion(v.id).subscribe({
      next: () => {
        this.snackBar.open('Versi BOM dihapus', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menghapus', 'Tutup', { duration: 5000 });
      },
    });
  }

  archive(v: BomVersion): void {
    if (!confirm(`Arsipkan BOM untuk ${v.fgName}?`)) return;
    this.bomService.archiveVersion(v.id).subscribe({
      next: () => {
        this.snackBar.open('Versi diarsipkan', 'OK', { duration: 3000 });
        this.load();
      },
    });
  }

  statusLabel(status: BomStatus): string {
    return (
      {
        DRAFT: 'Draft',
        ACTIVE: 'Aktif',
        ARCHIVED: 'Diarsipkan',
      } as Record<BomStatus, string>
    )[status];
  }
}
