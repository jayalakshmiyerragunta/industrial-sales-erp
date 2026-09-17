export default function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  return (
    <span className={`badge ${status}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
