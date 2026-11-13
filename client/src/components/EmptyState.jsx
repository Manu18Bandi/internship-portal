export default function EmptyState({ icon = '📋', text = 'Nothing here yet' }) {
  return (
    <div className="empty">
      <div className="icon">{icon}</div>
      <div>{text}</div>
    </div>
  );
}
