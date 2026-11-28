import { useId } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { SeasonMeta, View } from '../types';
import { makeHash } from '../lib/router';
import { useModalDialog } from '../lib/useModalDialog';

interface NavLink {
  view: View;
  label: string;
}

interface Props {
  id: string;
  items: readonly NavLink[];
  currentView: View | 'not-found';
  seasonMeta: SeasonMeta;
  onNavigate: (view: View) => void;
  onClose: () => void;
}

export function MobileNavDialog({
  id,
  items,
  currentView,
  seasonMeta,
  onNavigate,
  onClose,
}: Props) {
  const titleId = useId();
  const { dialogRef, requestClose, closedByProps } = useModalDialog(true, onClose);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className="archive-dialog mobile-nav-dialog"
      aria-labelledby={titleId}
      {...closedByProps}
    >
      <div className="mobile-nav-header">
        <h1 id={titleId}>档案目录</h1>
        <button
          type="button"
          className="icon-button"
          autoFocus
          aria-label="关闭导航"
          onClick={() => void requestClose()}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="移动端主要">
        <ul className="mobile-nav-list">
          {items.map((item) => (
            <li key={item.view}>
              <a
                href={makeHash(item.view, { season: seasonMeta.id })}
                aria-current={currentView === item.view ? 'page' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  onNavigate(item.view);
                  void requestClose();
                }}
              >
                <span>{item.label}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mobile-nav-footer">
        <strong>
          {seasonMeta.label} · {seasonMeta.currentPatch}
        </strong>
        <span>核验至 {seasonMeta.verifiedAt} · 不收录体验服测试集</span>
      </div>
    </dialog>
  );
}
