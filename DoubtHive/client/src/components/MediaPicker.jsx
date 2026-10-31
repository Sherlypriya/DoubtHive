import { useRef, useState, useEffect } from 'react';
import { ImagePlus, Film, Link2, X } from 'lucide-react';
import {
  MEDIA_LIMITS, IMAGE_TYPES, VIDEO_TYPES, formatBytes, detectVideoProvider,
} from '../constants/media.js';

const PROVIDER_LABEL = { youtube: 'YouTube', vimeo: 'Vimeo' };

function FileThumb({ file, onRemove, disabled }) {
  const isImage = file.type.startsWith('image/');
  const [url, setUrl] = useState(null);

  // Created in an effect (not during render) so it survives React StrictMode's
  // mount/unmount/mount cycle, and is always revoked to avoid leaking memory.
  useEffect(() => {
    if (!isImage) return undefined;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, isImage]);

  return (
    <li className="media-thumb">
      {isImage ? (
        <div className="media-thumb__visual">{url && <img src={url} alt="" />}</div>
      ) : (
        <div className="media-thumb__visual media-thumb__visual--video">
          <Film size={22} aria-hidden="true" />
        </div>
      )}
      <div className="media-thumb__info">
        <span className="media-thumb__name" title={file.name}>{file.name}</span>
        <span className="media-thumb__meta">{isImage ? 'Picture' : 'Lecture video'} · {formatBytes(file.size)}</span>
      </div>
      <button
        type="button"
        className="media-thumb__remove"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
      >
        <X size={14} />
      </button>
    </li>
  );
}

function LinkThumb({ link, onRemove, disabled }) {
  const provider = detectVideoProvider(link);
  return (
    <li className="media-thumb">
      <div className="media-thumb__visual media-thumb__visual--video">
        <Film size={22} aria-hidden="true" />
      </div>
      <div className="media-thumb__info">
        <span className="media-thumb__name" title={link}>{link}</span>
        <span className="media-thumb__meta">{PROVIDER_LABEL[provider] || 'Video'} lecture link</span>
      </div>
      <button
        type="button"
        className="media-thumb__remove"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove video link"
      >
        <X size={14} />
      </button>
    </li>
  );
}

/**
 * Controlled attachment picker.
 *   value:    { files: File[], links: string[] }
 *   onChange: (nextValue) => void
 *   canUploadVideo: faculty/admin only — students can attach pictures only
 *   existingCount:  attachments already on the answer (when editing)
 *   onReject: (message) => void   // validation problems, shown as a toast
 */
function MediaPicker({ value, onChange, canUploadVideo, existingCount = 0, disabled, onReject }) {
  const inputRef = useRef(null);
  const [showLink, setShowLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');

  const used = existingCount + value.files.length + value.links.length;
  const full = used >= MEDIA_LIMITS.MAX_ATTACHMENTS;
  const accept = (canUploadVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES).join(',');

  const addFiles = (fileList) => {
    const files = [...value.files];
    let count = used;

    for (const f of Array.from(fileList)) {
      if (count >= MEDIA_LIMITS.MAX_ATTACHMENTS) {
        onReject?.(`You can attach at most ${MEDIA_LIMITS.MAX_ATTACHMENTS} items to one answer.`);
        break;
      }
      const isImage = IMAGE_TYPES.includes(f.type);
      const isVideo = VIDEO_TYPES.includes(f.type);
      if (!isImage && !isVideo) {
        onReject?.(`"${f.name}" isn't a supported ${canUploadVideo ? 'picture or video' : 'picture'} format.`);
        continue;
      }
      if (isVideo && !canUploadVideo) {
        onReject?.('Only faculty can upload lecture videos.');
        continue;
      }
      const capMb = isImage ? MEDIA_LIMITS.IMAGE_MB : MEDIA_LIMITS.VIDEO_MB;
      if (f.size > capMb * 1024 * 1024) {
        onReject?.(`"${f.name}" is ${formatBytes(f.size)} — ${isImage ? 'pictures' : 'videos'} can be at most ${capMb} MB.`);
        continue;
      }
      files.push(f);
      count += 1;
    }
    onChange({ ...value, files });
  };

  const handleInput = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = ''; // allow re-picking the same file after removing it
  };

  const addLink = () => {
    const link = linkDraft.trim();
    if (!link) return;
    if (!detectVideoProvider(link)) {
      onReject?.('Paste a YouTube or Vimeo link.');
      return;
    }
    if (full) {
      onReject?.(`You can attach at most ${MEDIA_LIMITS.MAX_ATTACHMENTS} items to one answer.`);
      return;
    }
    if (!value.links.includes(link)) onChange({ ...value, links: [...value.links, link] });
    setLinkDraft('');
    setShowLink(false);
  };

  const hint = canUploadVideo
    ? `Pictures up to ${MEDIA_LIMITS.IMAGE_MB} MB · videos up to ${MEDIA_LIMITS.VIDEO_MB} MB · ${used}/${MEDIA_LIMITS.MAX_ATTACHMENTS} items`
    : `Pictures up to ${MEDIA_LIMITS.IMAGE_MB} MB · ${used}/${MEDIA_LIMITS.MAX_ATTACHMENTS} items`;

  return (
    <div className="media-picker">
      <div className="media-picker__bar">
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || full}
        >
          <ImagePlus size={14} /> {canUploadVideo ? 'Add pictures / lecture video' : 'Add pictures'}
        </button>
        {canUploadVideo && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setShowLink((s) => !s)}
            disabled={disabled || full}
            aria-expanded={showLink}
          >
            <Link2 size={14} /> YouTube / Vimeo link
          </button>
        )}
        <span className="media-picker__hint">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          hidden
          onChange={handleInput}
        />
      </div>

      {showLink && canUploadVideo && (
        <div className="media-picker__link">
          <input
            type="url"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
            placeholder="https://www.youtube.com/watch?v=…  or  https://vimeo.com/…"
            aria-label="YouTube or Vimeo link"
            autoFocus
          />
          <button type="button" className="btn btn--small" onClick={addLink} disabled={!linkDraft.trim()}>
            Add link
          </button>
        </div>
      )}

      {(value.files.length > 0 || value.links.length > 0) && (
        <ul className="media-previews">
          {value.files.map((f, i) => (
            <FileThumb
              key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
              file={f}
              disabled={disabled}
              onRemove={() => onChange({ ...value, files: value.files.filter((_, idx) => idx !== i) })}
            />
          ))}
          {value.links.map((l) => (
            <LinkThumb
              key={l}
              link={l}
              disabled={disabled}
              onRemove={() => onChange({ ...value, links: value.links.filter((x) => x !== l) })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default MediaPicker;
