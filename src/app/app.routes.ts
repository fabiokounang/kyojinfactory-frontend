import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customer-list').then((m) => m.CustomerListComponent),
      },
      {
        path: 'customer-pos',
        loadComponent: () =>
          import('./features/customer-pos/customer-po-list').then(
            (m) => m.CustomerPoListComponent
          ),
      },
      {
        path: 'customer-pos/new',
        loadComponent: () =>
          import('./features/customer-pos/customer-po-form').then(
            (m) => m.CustomerPoFormComponent
          ),
      },
      {
        path: 'customer-pos/:id/edit',
        loadComponent: () =>
          import('./features/customer-pos/customer-po-form').then(
            (m) => m.CustomerPoFormComponent
          ),
      },
      {
        path: 'customer-pos/:id',
        loadComponent: () =>
          import('./features/customer-pos/customer-po-detail').then(
            (m) => m.CustomerPoDetailComponent
          ),
      },
      {
        path: 'bom',
        loadComponent: () =>
          import('./features/bom/bom-list').then((m) => m.BomListComponent),
      },
      {
        path: 'bom/:id',
        loadComponent: () =>
          import('./features/bom/bom-builder').then((m) => m.BomBuilderComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/task-list').then((m) => m.TaskListComponent),
      },
      {
        path: 'master-items',
        loadComponent: () =>
          import('./features/master-items/master-item-list').then(
            (m) => m.MasterItemListComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
