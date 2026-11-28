import { useEffect, useId, useState } from 'react';
import { Check, Copy, Download, QrCode, Share2, X } from 'lucide-react';
import {
  getToyQrCode,
  isToyAbilitySupported,
  saveToyImageToAlbum,
  shareToyPage,
  type ToyQrCodeResult,
} from '../lib/toySdk';
import { useModalDialog } from '../lib/useModalDialog';

interface Props {
  title: string;
  subtitle: string;
  sharePath: string;
  fallbackUrl: string;
  onClose: () => void;
}

export function ShareModal({ title, subtitle, sharePath, fallbackUrl, onClose }: Props) {
  const titleId = useId();
  const { dialogRef, requestClose, closedByProps } = useModalDialog(true, onClose);

  const [canShareInApp, setCanShareInApp] = useState(false);
  const [canSaveAlbum, setCanSaveAlbum] = useState(false);
  const [qrResult, setQrResult] = useState<ToyQrCodeResult | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCapabilities = async () => {
      const [shareOk, saveOk, qrOk] = await Promise.all([
        isToyAbilitySupported('share'),
        isToyAbilitySupported('saveImageToAlbum'),
        isToyAbilitySupported('getQrCode'),
      ]);
      if (!active) return;

      setCanShareInApp(shareOk);
      setCanSaveAlbum(saveOk);

      if (qrOk) {
        try {
          const result = await getToyQrCode(sharePath, 320);
          if (active) setQrResult(result);
        } catch {
          if (active) setQrResult(null);
        }
      }
      if (active) setQrLoading(false);
    };

    void loadCapabilities();
    return () => {
      active = false;
    };
  }, [sharePath]);

  const effectiveUrl = qrResult?.url || fallbackUrl;

  const handleAppShare = async () => {
    try {
      const shared = await shareToyPage(sharePath);
      if (shared) {
        setStatusMessage('已拉起 B站 分享面板');
      }
    } catch {
      setStatusMessage('拉起分享失败，请改用二维码或复制链接');
    }
  };

  const handleSaveAlbum = async () => {
    if (!qrResult?.base64) return;
    try {
      await saveToyImageToAlbum(qrResult.base64, '需要相册权限以保存万象棋谱二维码');
      setStatusMessage('二维码已保存到系统相册');
    } catch {
      setStatusMessage('保存到相册未完成，请检查系统相册权限');
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(effectiveUrl);
        setCopied(true);
        setStatusMessage('页面链接已复制到剪贴板');
        window.setTimeout(() => setCopied(false), 2200);
        return;
      }
    } catch {
      // Fallback below
    }
    setStatusMessage('当前浏览器不支持自动复制，请长按上方链接复制');
  };

  return (
    <dialog
      ref={dialogRef}
      className="archive-dialog share-dialog"
      aria-labelledby={titleId}
      {...closedByProps}
    >
      <div className="share-dialog-header">
        <div>
          <span className="eyebrow">SHARE / CROSS-DEVICE</span>
          <h1 id={titleId}>{title}</h1>
        </div>
        <button
          type="button"
          className="icon-button"
          autoFocus
          aria-label="关闭分享"
          onClick={() => void requestClose()}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="share-dialog-body">
        <p className="share-dialog-subtitle">{subtitle}</p>

        {qrLoading ? (
          <div className="share-qr-placeholder" aria-busy="true">
            <QrCode size={24} aria-hidden="true" />
            <span>正在生成跨端二维码…</span>
          </div>
        ) : qrResult?.base64 ? (
          <figure className="share-qr-frame">
            <img
              src={qrResult.base64}
              alt={`${title} 跨端扫码二维码`}
              width={200}
              height={200}
            />
            <figcaption>使用哔哩哔哩 App 扫码，在手机端继续查阅本页档案</figcaption>
          </figure>
        ) : null}

        <div className="share-url-box">
          <code>{effectiveUrl}</code>
        </div>

        <div className="share-dialog-actions">
          {canShareInApp && (
            <button type="button" className="primary-button" onClick={() => void handleAppShare()}>
              <Share2 size={16} aria-hidden="true" />
              分享到 B 站
            </button>
          )}

          {qrResult?.base64 &&
            (canSaveAlbum ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleSaveAlbum()}
              >
                <Download size={16} aria-hidden="true" />
                保存二维码到相册
              </button>
            ) : (
              <a
                className="secondary-button"
                href={qrResult.base64}
                download="wanxiangqi-compendium-qr.png"
              >
                <Download size={16} aria-hidden="true" />
                下载二维码
              </a>
            ))}

          <button
            type="button"
            className={canShareInApp ? 'secondary-button' : 'primary-button'}
            onClick={() => void handleCopyLink()}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? '已复制链接' : '复制页面链接'}
          </button>
        </div>

        <p className="share-status-note" role="status" aria-live="polite">
          {statusMessage}
        </p>
      </div>
    </dialog>
  );
}
