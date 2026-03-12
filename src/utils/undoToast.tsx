import toast from 'react-hot-toast';

export function showUndoToast(message: string, onUndo: () => void) {
  toast(
    (t) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>{message}</span>
        <button
          onClick={() => {
            onUndo();
            toast.dismiss(t.id);
          }}
          style={{
            background: 'none',
            border: '1px solid #868e96',
            borderRadius: 4,
            padding: '2px 10px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
          }}
        >
          Undo
        </button>
      </span>
    ),
    { duration: 6000 },
  );
}
