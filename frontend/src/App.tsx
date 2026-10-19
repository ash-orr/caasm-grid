import { Suspense, lazy } from 'react';

const AssetsTable = lazy(async () => {
  const module = await import('./components/AssetsTable');
  return { default: module.AssetsTable };
});

export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 16px' }}>Assets</h1>
      <Suspense fallback={<div>Loading assets…</div>}>
        <AssetsTable />
      </Suspense>
    </div>
  );
}
