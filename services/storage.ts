import { Exercise, WorkoutLog, User, WorkoutSet, AppData, StorageConfig } from '../types';

const STORAGE_KEY = 'ae_tracker_data';
const CONFIG_KEY = 'ae_tracker_config';

// Initial Seed Data
const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex_1', name: 'Bench Press', category: 'Chest' },
  { id: 'ex_2', name: 'Squat', category: 'Legs' },
  { id: 'ex_3', name: 'Deadlift', category: 'Back' },
  { id: 'ex_4', name: 'Overhead Press', category: 'Shoulders' },
];

const SEED_DATA: AppData = {
  adamExercises: DEFAULT_EXERCISES.map(e => ({ ...e, id: `adam_${e.id}` })),
  eliaExercises: DEFAULT_EXERCISES.map(e => ({ ...e, id: `elia_${e.id}` })),
  logs: []
};

// Helper to get local date string YYYY-MM-DD
export const getLocalISODate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Configuration ---

export const saveConfig = (config: StorageConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const getConfig = (): StorageConfig | null => {
  const s = localStorage.getItem(CONFIG_KEY);
  return s ? JSON.parse(s) : null;
};

// --- Core Data Operations ---

// In-memory cache to reduce reads
let dataCache: AppData | null = null;

// Helper to interact with GitHub API
const githubRequest = async (endpoint: string, token: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json',
  };

  // Only add auth if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('GitHub API Error:', res.status, errorBody);
    throw new Error(`GitHub API Error: ${res.status} - ${res.statusText}`);
  }
  return res.json();
};

// Migrate legacy data format (shared exercises) to new per-user format
const migrateData = (data: any): AppData => {
  // Ensure we have valid arrays even if data is malformed
  const adamExercises = data.adamExercises || [];
  const eliaExercises = data.eliaExercises || [];
  const logs = data.logs || [];

  // If already in new format (both user exercise arrays exist and are non-empty, or no legacy exercises exist)
  if ((adamExercises.length > 0 || eliaExercises.length > 0) || !data.exercises) {
    return {
      adamExercises,
      eliaExercises,
      logs
    };
  }

  // Migrate from legacy shared exercises to per-user
  const sharedExercises: Exercise[] = data.exercises || [];
  return {
    adamExercises: sharedExercises.map(e => ({ ...e, id: `adam_${e.id}` })),
    eliaExercises: sharedExercises.map(e => ({ ...e, id: `elia_${e.id}` })),
    logs
  };
};

export const loadData = async (): Promise<AppData> => {
  const config = getConfig();

  // 1. Try GitHub if configured
  if (config) {
    try {
      const data = await githubRequest(`${config.owner}/${config.repo}/contents/${config.path}`, config.githubToken, { cache: 'no-store' });
      const content = atob(data.content);
      const parsed = JSON.parse(content);
      dataCache = migrateData(parsed);
      // Sync to local backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCache));
      return dataCache!;
    } catch (e) {
      console.error("Failed to load from GitHub, falling back to local cache", e);
    }
  }

  // 2. Fallback to LocalStorage
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    const parsed = JSON.parse(local);
    dataCache = migrateData(parsed);
    return dataCache!;
  }

  // 3. Fallback to Seed
  dataCache = SEED_DATA;
  return dataCache!;
};

export const saveData = async (data: AppData): Promise<void> => {
  dataCache = data;

  // Always save local backup immediately
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  const config = getConfig();
  if (config) {
    try {
      // Get current SHA for the file to update it
      let sha = '';
      try {
        const current = await githubRequest(`${config.owner}/${config.repo}/contents/${config.path}`, config.githubToken);
        sha = current.sha;
      } catch (e) {
        // File might not exist yet, which is fine
      }

      const content = btoa(JSON.stringify(data, null, 2));

      await githubRequest(`${config.owner}/${config.repo}/contents/${config.path}`, config.githubToken, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Update tracker data',
          content: content,
          sha: sha || undefined
        })
      });
    } catch (e) {
      console.error("Failed to sync to GitHub", e);
      alert("Changes saved locally, but failed to sync to GitHub. Check your Settings.");
    }
  }
};

// --- Domain Helpers (Now Async Wrappers) ---

export const getExercisesForUser = async (user: User): Promise<Exercise[]> => {
  const data = await loadData();
  return user === 'Adam' ? data.adamExercises : data.eliaExercises;
};

export const saveExercise = async (exercise: Exercise, user: User): Promise<void> => {
  const data = await loadData();
  const exercises = user === 'Adam' ? data.adamExercises : data.eliaExercises;
  const idx = exercises.findIndex(e => e.id === exercise.id);
  if (idx >= 0) exercises[idx] = exercise;
  else exercises.push(exercise);
  await saveData(data);
};

export const deleteExercise = async (id: string, user: User): Promise<void> => {
  const data = await loadData();
  if (user === 'Adam') {
    data.adamExercises = data.adamExercises.filter(e => e.id !== id);
  } else {
    data.eliaExercises = data.eliaExercises.filter(e => e.id !== id);
  }
  await saveData(data);
};

export const getLogsForExercise = async (exerciseId: string, user: User): Promise<WorkoutLog[]> => {
  const data = await loadData();
  return data.logs
    .filter(l => l.exerciseId === exerciseId && l.user === user)
    .sort((a, b) => b.date.localeCompare(a.date)); // Lexicographical sort works for ISO YYYY-MM-DD
};

// Get logs for comparison: finds exercises with matching name for both users
export const getLogsForComparison = async (exerciseName: string): Promise<WorkoutLog[]> => {
  const data = await loadData();

  // Find matching exercises by name for each user
  const adamExercise = data.adamExercises.find(e => e.name === exerciseName);
  const eliaExercise = data.eliaExercises.find(e => e.name === exerciseName);

  const matchingIds = [
    adamExercise?.id,
    eliaExercise?.id
  ].filter(Boolean) as string[];

  return data.logs.filter(l => matchingIds.includes(l.exerciseId));
};

export const getAllLogsForExercise = async (exerciseId: string): Promise<WorkoutLog[]> => {
  const data = await loadData();
  return data.logs.filter(l => l.exerciseId === exerciseId);
};

export const addSet = async (user: User, exerciseId: string, weight: number, reps: number, dateStr: string): Promise<void> => {
  const data = await loadData();
  let log = data.logs.find(l => l.user === user && l.exerciseId === exerciseId && l.date === dateStr);

  const newSet: WorkoutSet = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    weight,
    reps,
    timestamp: Date.now()
  };

  if (log) {
    log.sets.push(newSet);
  } else {
    log = {
      id: Date.now().toString(),
      exerciseId,
      user,
      date: dateStr,
      sets: [newSet]
    };
    data.logs.push(log);
  }
  await saveData(data);
};

export const deleteSet = async (logId: string, setId: string): Promise<void> => {
  const data = await loadData();
  const logIndex = data.logs.findIndex(l => l.id === logId);

  if (logIndex === -1) return;

  data.logs[logIndex].sets = data.logs[logIndex].sets.filter(s => s.id !== setId);

  // If no sets left, remove the log entry
  if (data.logs[logIndex].sets.length === 0) {
    data.logs = data.logs.filter(l => l.id !== logId);
  }

  await saveData(data);
};
