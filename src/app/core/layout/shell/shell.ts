import { Component, inject, signal, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);

  @ViewChild('drawer') drawer!: MatSidenav;

  readonly user = this.auth.user;
  readonly isHandset = signal(false);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/customers', label: 'Customer', icon: 'people' },
    { path: '/customer-pos', label: 'PO Customer', icon: 'receipt_long' },
    { path: '/bom', label: 'BOM Structure', icon: 'account_tree' },
    { path: '/tasks', label: 'Todo / Reminder', icon: 'task_alt' },
    { path: '/master-items', label: 'Master Item', icon: 'inventory_2' },
    { path: '/settings', label: 'Pengaturan', icon: 'settings' },
  ];

  constructor() {
    this.breakpoint.observe([Breakpoints.Handset]).subscribe((r) => {
      this.isHandset.set(r.matches);
    });
  }

  closeDrawerOnNav(): void {
    if (this.isHandset() && this.drawer?.opened) {
      this.drawer.close();
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
