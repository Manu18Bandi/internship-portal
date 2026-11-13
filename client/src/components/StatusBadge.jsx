export default function StatusBadge({ status }) {
  return <span className="badge" data-status={status}>{status}</span>;
}
