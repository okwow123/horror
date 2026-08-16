export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-blood-900/30 border border-blood-800 text-blood-200 text-sm rounded-lg px-4 py-3">
      {message}
    </div>
  );
}
