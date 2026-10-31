import { useState, useEffect } from 'react';
import { X, Undo2, Trash2 } from 'lucide-react';

const PROVIDER_LABEL = { youtube: 'YouTube', vimeo: 'Vimeo' };

const toMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    const baseHost = apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${baseHost}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

function Lightbox({ image, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const displayUrl = toMediaUrl(image.url);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Picture preview" onClick={onClose}>
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close preview" autoFocus>
        <X size={20} />
      </button>
      <img src={displayUrl} alt={image.originalName || 'Attached picture'} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/**
 * Renders an answer's pictures, uploaded lecture videos and YouTube/Vimeo
 * embeds. In edit mode (`edit` prop) each item gets a remove/undo toggle.
 *   edit: { removedIds: Set<string>, onToggle: (attachmentId) => void }
 */
function AttachmentGallery({ attachments = [], edit }) {
  const [zoomed, setZoomed] = useState(null);
  if (!attachments.length) return null;

  const players = attachments.filter((a) => a.kind === 'video' || a.kind === 'embed');
  const images = attachments.filter((a) => a.kind === 'image');

  const wrap = (att, child, extraClass = '') => {
    const removed = edit?.removedIds.has(att._id);
    return (
      <div key={att._id} className={`attachment ${extraClass}${removed ? ' attachment--removed' : ''}`}>
        {child}
        {edit && (
          <button
            type="button"
            className="attachment__toggle"
            onClick={() => edit.onToggle(att._id)}
            aria-label={removed ? 'Keep this attachment' : 'Remove this attachment'}
          >
            {removed ? <><Undo2 size={13} /> Undo</> : <><Trash2 size={13} /> Remove</>}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="attachments">
      {players.map((att) => {
        const mediaSrc = toMediaUrl(att.url);
        return att.kind === 'video'
          ? wrap(
              att,
              <figure className="attachment-video">
                <video controls preload="metadata" playsInline src={mediaSrc}>
                  Your browser can't play this video. <a href={mediaSrc} download>Download it instead</a>.
                </video>
                <figcaption>Lecture video{att.originalName ? ` · ${att.originalName}` : ''}</figcaption>
              </figure>
            )
          : wrap(
              att,
              <figure className="attachment-embed">
                <div className="attachment-embed__frame">
                  <iframe
                    src={att.url}
                    title={`${PROVIDER_LABEL[att.provider] || 'Video'} lecture`}
                    loading="lazy"
                    allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <figcaption>{PROVIDER_LABEL[att.provider] || 'Video'} lecture</figcaption>
              </figure>
            );
      })}

      {images.length > 0 && (
        <div className={`attachments__grid attachments__grid--${Math.min(images.length, 3)}`}>
          {images.map((att) => {
            const mediaSrc = toMediaUrl(att.url);
            return wrap(
              att,
              <button
                type="button"
                className="attachment-image"
                onClick={() => !edit && setZoomed(att)}
                aria-label={`View picture${att.originalName ? `: ${att.originalName}` : ''}`}
              >
                <img src={mediaSrc} alt={att.originalName || 'Attached picture'} loading="lazy" />
              </button>,
              'attachment--image'
            );
          })}
        </div>
      )}

      {zoomed && <Lightbox image={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}

export default AttachmentGallery;
