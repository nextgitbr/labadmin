export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" aria-label="Carregando" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}
