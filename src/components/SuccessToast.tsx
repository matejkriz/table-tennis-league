interface SuccessToastProps {
  readonly message: string;
}

export const SuccessToast = ({ message }: SuccessToastProps) => (
  <div aria-live="polite" className="pointer-events-none fixed left-4 top-4 z-50">
    <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black shadow-lg">
      {message}
    </div>
  </div>
);
