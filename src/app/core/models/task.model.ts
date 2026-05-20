export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export type TaskType = 'CREATE_BOM';

export interface Task {
  id: number;
  type: TaskType;
  referenceType: string;
  referenceId: number;
  title: string;
  notes: string | null;
  assigneeUserId: number | null;
  dueDate: string | null;
  status: TaskStatus;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}
