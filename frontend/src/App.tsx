import { StatusPill } from './components/StatusPill';

export default function App() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 12 }}>
      <StatusPill status="Reporting" />
      <StatusPill status="Stale" />
      <StatusPill status="Pending" />
      <StatusPill status="Not present" />
      <StatusPill status="N/A" />
    </div>
  );
}
