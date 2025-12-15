import React, { useState, useEffect } from 'react';
import { User, View, Exercise, WorkoutLog, StorageConfig } from './types';
import * as Storage from './services/storage';
import ProgressChart from './components/ProgressChart';
import { ArrowLeft, Plus, Trash2, TrendingUp, Users, Calendar, BarChart2, X, Settings, Loader2, Save, Download, RefreshCw } from 'lucide-react';

// --- Subcomponents ---

const UserButton = ({ name, onClick, colorClass }: { name: string, onClick: () => void, colorClass: string }) => (
  <button
    onClick={onClick}
    className={`w-full py-12 rounded-3xl shadow-lg transform transition-all active:scale-95 hover:scale-[1.02] ${colorClass} text-white text-4xl font-light tracking-wider mb-6 flex flex-col items-center justify-center gap-4`}
  >
    <span className="font-bold">{name}</span>
    <span className="text-sm opacity-80 uppercase tracking-widest font-normal">Enter Tracker</span>
  </button>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Date Helper to display YYYY-MM-DD correctly in local time
const formatLocalDate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  // Create date at local midnight
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.USER_SELECT);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'exercise' | 'set', id: string, secondaryId?: string } | null>(null);

  // Settings State
  const [config, setConfig] = useState<StorageConfig>({ githubToken: '', owner: '', repo: '', path: 'data.json' });

  // Initial Load
  useEffect(() => {
    const savedConfig = Storage.getConfig();
    if (savedConfig) setConfig(savedConfig);
  }, []);

  // Load exercises when user changes
  useEffect(() => {
    if (currentUser) {
      loadExercises();
    } else {
      setExercises([]);
    }
  }, [currentUser]);

  const loadExercises = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    const data = await Storage.getExercisesForUser(currentUser);
    setExercises(data);
    setIsLoading(false);
  };

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setCurrentView(View.DASHBOARD);
  };

  const handleBack = () => {
    if (currentView === View.EXERCISE_DETAIL || currentView === View.COMPARE) {
      setCurrentView(View.DASHBOARD);
      setSelectedExercise(null);
    } else if (currentView === View.DASHBOARD) {
      setCurrentUser(null);
      setCurrentView(View.USER_SELECT);
    }
  };

  const saveNewExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newExerciseName.trim() && currentUser) {
      setIsLoading(true);
      const newEx: Exercise = { id: Date.now().toString(), name: newExerciseName.trim(), category: 'General' };
      await Storage.saveExercise(newEx, currentUser);
      await loadExercises();
      setNewExerciseName('');
      setIsAddModalOpen(false);
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !currentUser) return;
    setIsLoading(true);

    if (deleteTarget.type === 'exercise') {
      await Storage.deleteExercise(deleteTarget.id, currentUser);
      await loadExercises();
    } else if (deleteTarget.type === 'set' && deleteTarget.secondaryId) {
      // Logic handled in DetailView actually, but if global:
      // We need to refresh the current view.
      // Ideally delete set should be handled in the view component context
      // But for now, we only use this global confirmation for exercises.
    }

    setDeleteTarget(null);
    setIsLoading(false);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    Storage.saveConfig(config);
    setIsSettingsOpen(false);
    loadExercises(); // Reload with new config
  };

  // --- Views ---

  if (currentView === View.USER_SELECT) {
    return (
      <div className="h-full bg-slate-50 flex flex-col justify-center px-6 max-w-md mx-auto overflow-y-auto no-scrollbar relative">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition"
        >
          <Settings size={24} />
        </button>

        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extralight text-slate-800 mb-2">Welcome</h1>
          <p className="text-slate-400">Select your profile to continue</p>
        </div>
        <UserButton
          name="Adam"
          onClick={() => handleUserSelect('Adam')}
          colorClass="bg-gradient-to-br from-cyan-500 to-blue-600"
        />
        <UserButton
          name="Elia"
          onClick={() => handleUserSelect('Elia')}
          colorClass="bg-gradient-to-br from-amber-400 to-orange-500"
        />

        {/* Settings Modal */}
        <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Data Sync Settings">
          <form onSubmit={saveSettings} className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              To sync data between devices, provide a GitHub Personal Access Token and Repo details. The app will read/write to the specified file in your repo.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700">GITHUB TOKEN</label>
              <input
                type="password"
                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                placeholder="ghp_..."
                value={config.githubToken}
                onChange={e => setConfig({ ...config, githubToken: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-700">OWNER</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                  placeholder="username"
                  value={config.owner}
                  onChange={e => setConfig({ ...config, owner: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-700">REPO</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                  placeholder="repo-name"
                  value={config.repo}
                  onChange={e => setConfig({ ...config, repo: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">FILE PATH</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                placeholder="data.json"
                value={config.path}
                onChange={e => setConfig({ ...config, path: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              <Save size={16} /> Save & Sync
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl shadow-slate-200 overflow-hidden">

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[60] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Exercise">
        <form onSubmit={saveNewExercise} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            placeholder="Exercise Name (e.g. Bench Press)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
          />
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800">
            Save Exercise
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <div className="flex flex-col gap-4">
          <p className="text-slate-600">
            Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
              Cancel
            </button>
            <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600">
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between flex-shrink-0">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 truncate max-w-[200px]">
          {currentView === View.DASHBOARD ? `Hello, ${currentUser}` : selectedExercise?.name || 'Comparison'}
        </h1>
        <div className="w-10"></div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 no-scrollbar overscroll-contain pb-20">

        {currentView === View.DASHBOARD && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">My Exercises</h2>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition active:scale-95"
              >
                <Plus size={14} /> Add New
              </button>
            </div>

            <div className="grid gap-3">
              {exercises.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => { setSelectedExercise(ex); setCurrentView(View.EXERCISE_DETAIL); }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform flex justify-between items-center cursor-pointer group hover:border-slate-200"
                >
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg">{ex.name}</h3>
                    <span className="text-xs text-slate-400 font-medium">{ex.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-3 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'exercise', id: ex.id });
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="bg-slate-50 p-2 rounded-full text-slate-400">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                </div>
              ))}

              {exercises.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-light flex flex-col items-center gap-2">
                  <p>No exercises yet.</p>
                  <button onClick={() => setIsAddModalOpen(true)} className="text-indigo-500 font-medium hover:underline">Create one</button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === View.EXERCISE_DETAIL && selectedExercise && currentUser && (
          <ExerciseDetailView
            exercise={selectedExercise}
            user={currentUser}
            onCompare={() => setCurrentView(View.COMPARE)}
          />
        )}

        {currentView === View.COMPARE && selectedExercise && (
          <ComparisonView exercise={selectedExercise} />
        )}

      </main>
    </div>
  );
}

// --- Detail View Component ---

const ExerciseDetailView = ({ exercise, user, onCompare }: { exercise: Exercise, user: User, onCompare: () => void }) => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteSetConfirm, setDeleteSetConfirm] = useState<{ logId: string, setId: string } | null>(null);

  useEffect(() => {
    refreshLogs();
  }, [exercise.id, user]);

  const refreshLogs = async () => {
    setIsLoading(true);
    const data = await Storage.getLogsForExercise(exercise.id, user);
    setLogs(data);
    setIsLoading(false);
  };

  const handleLogSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !reps) return;

    setIsLoading(true);
    const dateStr = Storage.getLocalISODate(); // Use local date helper
    await Storage.addSet(user, exercise.id, parseFloat(weight), parseFloat(reps), dateStr);

    setWeight('');
    setReps('');

    // Refresh and open latest
    const data = await Storage.getLogsForExercise(exercise.id, user);
    setLogs(data);

    if (data.length > 0 && data[0].date === dateStr) {
      setOpenLogId(data[0].id);
    }
    setIsLoading(false);
  };

  const handleDeleteSet = async () => {
    if (!deleteSetConfirm) return;
    setIsLoading(true);
    await Storage.deleteSet(deleteSetConfirm.logId, deleteSetConfirm.setId);
    setDeleteSetConfirm(null);
    await refreshLogs();
    setIsLoading(false);
  };

  // Prepare graph data
  const chartData = logs.flatMap(log =>
    log.sets.map(s => ({
      date: new Date(log.date).getTime(), // This timestamp is just for sorting, x-axis uses formattedDate mostly or idx
      formattedDate: log.date,
      weight: s.weight,
      reps: s.reps,
      user
    }))
  ).sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-8">

      {/* Set Delete Confirmation Modal */}
      <Modal isOpen={!!deleteSetConfirm} onClose={() => setDeleteSetConfirm(null)} title="Delete Set">
        <div className="space-y-4">
          <p className="text-slate-600">Permanently delete this set?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteSetConfirm(null)} className="flex-1 bg-slate-100 py-2 rounded-xl text-slate-600 font-semibold">Cancel</button>
            <button onClick={handleDeleteSet} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-semibold">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Graph Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-500" /> PROGRESS
          </h3>
          <button
            onClick={onCompare}
            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-semibold border border-indigo-100 flex items-center gap-1 active:bg-indigo-100"
          >
            <Users size={12} /> Compare
          </button>
        </div>
        <ProgressChart data={chartData} />
      </div>

      {/* Input Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
        {isLoading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-2xl"><Loader2 className="animate-spin text-slate-400" /></div>}
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Log New Set</h3>
        <form onSubmit={handleLogSet} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 mb-1 ml-1">WEIGHT</label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 mb-1 ml-1">REPS</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 text-white h-[54px] w-[54px] rounded-xl flex items-center justify-center hover:bg-slate-800 shadow-lg shadow-slate-200 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        </form>
      </div>

      {/* History List */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Workout History</h3>
        <div className="space-y-3">
          {logs.map(log => {
            const isOpen = openLogId === log.id;
            const totalVolume = log.sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
            const displayDate = formatLocalDate(log.date);

            return (
              <div key={log.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div
                  onClick={() => setOpenLogId(isOpen ? null : log.id)}
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{displayDate}</h4>
                      <p className="text-xs text-slate-400 font-medium">{log.sets.length} Sets • {totalVolume.toLocaleString()} lbs vol</p>
                    </div>
                  </div>
                  <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {isOpen && (
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-2">
                    <div className="flex text-xs font-bold text-slate-400 mb-2 px-2">
                      <span className="w-10">SET</span>
                      <span className="flex-1 text-center">WEIGHT</span>
                      <span className="flex-1 text-center">REPS</span>
                      <span className="w-10"></span>
                    </div>
                    {log.sets.map((set, idx) => (
                      <div key={set.id} className="flex items-center py-2 px-2 border-b border-slate-200 last:border-0 text-sm">
                        <span className="w-10 font-bold text-slate-400">{idx + 1}</span>
                        <span className="flex-1 text-center font-bold text-slate-700">{set.weight} <span className="text-[10px] font-normal text-slate-400">lbs</span></span>
                        <span className="flex-1 text-center font-bold text-emerald-600">{set.reps}</span>
                        <button
                          onClick={() => setDeleteSetConfirm({ logId: log.id, setId: set.id })}
                          className="w-10 h-10 flex items-center justify-end text-slate-300 hover:text-red-500 active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {logs.length === 0 && <div className="text-center text-slate-400 text-sm py-8">No history recorded</div>}
        </div>
      </div>
    </div>
  );
};

// --- Comparison View Component ---

const ComparisonView = ({ exercise }: { exercise: Exercise }) => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    load();
  }, [exercise]);

  const load = async () => {
    // Use exercise name to find matching exercises for both users
    setLogs(await Storage.getLogsForComparison(exercise.name));
  };

  const chartData = logs.flatMap(log =>
    log.sets.map(s => ({
      date: new Date(log.date).getTime(),
      formattedDate: log.date,
      weight: s.weight,
      reps: s.reps,
      user: log.user
    }))
  ).sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Adam vs. Elia</h2>
        <p className="text-slate-500 text-sm">Comparing progression for {exercise.name}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 pt-6">
        <ProgressChart data={chartData} compareMode={true} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard user="Adam" logs={logs.filter(l => l.user === 'Adam')} color="text-sky-500" />
        <StatCard user="Elia" logs={logs.filter(l => l.user === 'Elia')} color="text-amber-500" />
      </div>
    </div>
  );
};

const StatCard = ({ user, logs, color }: { user: string, logs: WorkoutLog[], color: string }) => {
  const allSets = logs.flatMap(l => l.sets);
  const maxWeight = allSets.length > 0 ? Math.max(...allSets.map(s => s.weight)) : 0;
  const totalReps = allSets.reduce((acc, s) => acc + s.reps, 0);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <h4 className={`font-bold ${color} mb-2`}>{user}</h4>
      <div className="space-y-1">
        <p className="text-xs text-slate-400">Max Weight</p>
        <p className="text-xl font-bold text-slate-800">{maxWeight}</p>
        <div className="h-2"></div>
        <p className="text-xs text-slate-400">Total Reps</p>
        <p className="text-lg font-semibold text-slate-700">{totalReps}</p>
      </div>
    </div>
  )
}
