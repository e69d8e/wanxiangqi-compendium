import { useCallback, useEffect, useRef } from 'react';

let cachedDisplayTransitionSupport: boolean | undefined;

/**
 * Reliably probes discrete `display` transition support.
 * Firefox 129+ parses `transition-behavior: allow-discrete` without actually
 * transitioning `display` (bug 1882408), so `CSS.supports()` alone is insufficient.
 */
function canTransitionDisplay(): boolean {
  if (cachedDisplayTransitionSupport !== undefined) return cachedDisplayTransitionSupport;
  if (typeof window === 'undefined' || !document.body || !window.CSS?.supports?.('transition-behavior', 'allow-discrete')) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedDisplayTransitionSupport = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedDisplayTransitionSupport;
}

function supportsTopLayerExit(): boolean {
  return typeof window !== 'undefined' && Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

function isOutsideDialog(event: PointerEvent, dialog: HTMLDialogElement): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

/**
 * Manages a native modal `<dialog>` with:
 * - `showModal()` top-layer promotion, native inert backdrop, focus containment & focus restoration
 * - `closedby="any"` light-dismiss fallback (pointerdown + pointerup outside rect) for Safari
 * - `@starting-style` + `overlay` exit-animation fallback (`data-closing`) for Safari & Firefox
 * - `dialog.returnValue = ''` reset on close to prevent stale return values
 */
export function useModalDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);

  onCloseRef.current = onClose;

  const requestClose = useCallback(async () => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open || closingRef.current) return;

    if (!supportsTopLayerExit()) {
      closingRef.current = true;
      dialog.setAttribute('data-closing', '');
      const animations = typeof dialog.getAnimations === 'function'
        ? dialog.getAnimations({ subtree: true })
        : [];
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((animation) => animation.finished)),
          new Promise<void>((resolve) => window.setTimeout(resolve, 400)),
        ]);
      }
      closingRef.current = false;
      if (!dialog.hasAttribute('data-closing')) return;
      dialog.removeAttribute('data-closing');
    }

    if (dialog.open) dialog.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.removeAttribute('data-closing');
      closingRef.current = false;
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      void requestClose();
    }
  }, [open, requestClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.removeAttribute('data-closing');
      closingRef.current = false;
      dialog.returnValue = '';
      onCloseRef.current();
    };

    const handleCancel = (event: Event) => {
      if (!supportsTopLayerExit() && event.cancelable) {
        event.preventDefault();
        void requestClose();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);

    // Fallback for browsers without native <dialog closedby="any"> support (e.g. Safari)
    const supportsClosedBy =
      typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

    let pressedOutside = false;
    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutsideDialog(event, dialog);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutsideDialog(event, dialog)) {
        void requestClose();
      }
      pressedOutside = false;
    };

    if (!supportsClosedBy) {
      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      if (!supportsClosedBy) {
        dialog.removeEventListener('pointerdown', handlePointerDown);
        dialog.removeEventListener('pointerup', handlePointerUp);
      }
    };
  }, [requestClose]);

  return {
    dialogRef,
    requestClose,
    closedByProps: { closedby: 'any' } as Record<string, string>,
  };
}
