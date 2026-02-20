'use client';

type Props = {
  isOpen: boolean;
  matched: boolean;
  displayName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function UnlikeModal({ isOpen, matched, displayName, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 font-mono">
        <h2 className="text-white font-bold text-sm mb-2">
          {matched ? '💔 Unmatch?' : '👋 Remove like?'}
        </h2>
        <p className="text-white/50 text-xs mb-6">
          {matched
            ? `You'll be unmatched from ${displayName} and your conversation will be deleted. This can't be undone.`
            : `Remove your like for ${displayName}?`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-full text-sm border border-white/20 text-white/60 hover:border-white/50 hover:text-white transition"
          >
            cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-full text-sm font-bold bg-red-500/80 hover:bg-red-500 text-white transition"
          >
            {matched ? 'unmatch' : 'remove like'}
          </button>
        </div>
      </div>
    </div>
  );
}
