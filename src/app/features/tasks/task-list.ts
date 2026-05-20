import { Component, inject, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';

import { MatIconModule } from '@angular/material/icon';

import { MatChipsModule } from '@angular/material/chips';

import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';



import { TaskService } from '../../core/services/task.service';

import { Task, TaskStatus } from '../../core/models/task.model';

import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';



@Component({

  selector: 'app-task-list',

  standalone: true,

  imports: [

    MatCardModule,

    MatIconModule,

    MatChipsModule,

    MatButtonToggleModule,

    MatProgressSpinnerModule,

    DisplayDatePipe,

  ],

  templateUrl: './task-list.html',

  styleUrl: './task-list.scss',

})

export class TaskListComponent {

  private readonly taskService = inject(TaskService);



  readonly tasks = signal<Task[]>([]);

  readonly loading = signal(true);

  readonly filter = signal<TaskStatus | ''>('OPEN');



  constructor() {

    this.load();

  }



  load(): void {

    this.loading.set(true);

    const status = this.filter() || undefined;

    this.taskService.list(status as TaskStatus | undefined).subscribe({

      next: (data) => {

        this.tasks.set(data);

        this.loading.set(false);

      },

      error: () => this.loading.set(false),

    });

  }



  setFilter(value: TaskStatus | ''): void {

    this.filter.set(value);

    this.load();

  }



  statusLabel(status: TaskStatus): string {

    const labels: Record<TaskStatus, string> = {

      OPEN: 'Terbuka',

      DONE: 'Selesai',

      CANCELLED: 'Dibatalkan',

    };

    return labels[status] ?? status;

  }

}

