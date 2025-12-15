export type User = 'Adam' | 'Elia';

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  deleted?: boolean;
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  timestamp: number; // For sorting within a day
}

export interface WorkoutLog {
  id: string;
  exerciseId: string;
  user: User;
  date: string; // ISO Date String YYYY-MM-DD (Local time)
  sets: WorkoutSet[];
}

export interface ChartDataPoint {
  date: number; // Unix timestamp
  weight: number;
  reps: number;
  formattedDate: string;
  user?: User;
}

export enum View {
  USER_SELECT = 'USER_SELECT',
  DASHBOARD = 'DASHBOARD',
  EXERCISE_DETAIL = 'EXERCISE_DETAIL',
  COMPARE = 'COMPARE'
}

export interface AppData {
  exercises: Exercise[];
  logs: WorkoutLog[];
}

export interface StorageConfig {
  githubToken: string;
  owner: string;
  repo: string;
  path: string; // e.g., 'data.json'
}
