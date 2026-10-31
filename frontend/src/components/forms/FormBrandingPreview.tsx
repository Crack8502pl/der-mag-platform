import { useEffect, useState } from 'react';
import { formsService } from '../../services/forms.service';
import type { FormBrandingElement, FormBrandingSnapshot } from '../../types/forms.types';
import './FormBrandingPreview.css';

interface FormBrandingPreviewProps {
  snapshot: FormBrandingSnapshot | null | undefined;
  compact?: boolean;
  file?: File;
}

export function FormBrandingPreview({ snapshot, compact = false, file }: FormBrandingPreviewProps) {
  const signature = JSON.stringify([
    snapshot?.id, snapshot?.name, snapshot?.kind, snapshot?.mode, snapshot?.heightMm,
    snapshot?.filePath, snapshot?.fileMime, snapshot?.layout,
    file?.name, file?.size, file?.lastModified, file?.type,
  ]);
  const [loadedAssets, setLoadedAssets] = useState<{ signature: string; values: Record<string, string> }>();
  const [loadError, setLoadError] = useState<{ signature: string; message: string }>();
  const assets = loadedAssets?.signature === signature ? loadedAssets.values : {};
  const error = loadError?.signature === signature ? loadError.message : '';

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    const requests: Array<{ key: string; load: () => Promise<Blob> }> = [];
    let reader: FileReader | undefined;
    if (snapshot?.mode === 'FILE') {
      if (file) {
        reader = new FileReader();
        reader.onload = () => {
          if (cancelled || typeof reader?.result !== 'string') return;
          setLoadedAssets({ signature, values: { file: reader.result } });
          setLoadError({ signature, message: '' });
        };
        reader.onerror = () => {
          if (!cancelled) setLoadError({ signature, message: 'Nie udało się odczytać pliku podglądu.' });
        };
        reader.readAsDataURL(file);
      } else if (
        snapshot.filePath &&
        (snapshot.fileMime?.startsWith('image/') || snapshot.fileMime === 'application/pdf')
      ) {
        requests.push({ key: 'file', load: () => formsService.getBrandingSnapshotFile(snapshot.filePath!) });
      }
    } else if (snapshot?.layout) {
      for (const column of Object.values(snapshot.layout.columns)) {
        for (const item of column) {
          if (item.type === 'logo' && item.assetPath) {
            const fileName = item.assetPath.split('/').pop()!;
            requests.push({ key: item.assetPath, load: () => formsService.getBrandingLogo(fileName) });
          }
        }
      }
    }

    if (requests.length) {
      Promise.all(requests.map(async request => {
        const url = URL.createObjectURL(await request.load());
        urls.push(url);
        return [request.key, url] as const;
      })).then(entries => {
        if (cancelled) {
          urls.forEach(url => URL.revokeObjectURL(url));
          return;
        }
        setLoadedAssets({ signature, values: Object.fromEntries(entries) });
        setLoadError({ signature, message: '' });
      }).catch(() => {
        if (!cancelled) setLoadError({ signature, message: 'Nie udało się załadować pliku podglądu.' });
      });
    }
    return () => {
      cancelled = true;
      reader?.abort();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [file, signature, snapshot?.fileMime, snapshot?.filePath, snapshot?.layout, snapshot?.mode]);

  if (!snapshot) return <p className="branding-preview__empty">Nie wybrano elementu.</p>;
  const renderItem = (item: FormBrandingElement, index: number) => {
    if (item.type === 'text') return <span key={`text-${index}`}>{item.text}</span>;
    if (item.type === 'logo') return item.assetPath && assets[item.assetPath]
      ? <img key={`logo-${index}`} src={assets[item.assetPath]} alt={item.alt || ''} />
      : <span key={`logo-${index}`}>{item.alt || 'Logo'}</span>;
    if (item.type === 'variable') return <span key={`variable-${index}`}>{item.source}</span>;
    if (item.type === 'pageNumber') return <span key={`page-${index}`}>Strona 1 z 2</span>;
    return <span key={`date-${index}`}>{new Date().toLocaleDateString()}</span>;
  };

  return <div
    className={`branding-preview${compact ? ' branding-preview--compact' : ' branding-preview--a4'} branding-preview--${snapshot.kind.toLowerCase()}`}
    aria-label={`Podgląd: ${snapshot.name}`}
  >
    {snapshot.mode === 'FILE' ? (
      assets.file && snapshot.fileMime === 'application/pdf'
        ? <div
          className="branding-preview__pdf-band"
          style={!compact ? { height: `${(snapshot.heightMm / 297) * 100}%` } : undefined}
        >
          <iframe
            src={`${assets.file}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={snapshot.name}
            style={{ height: compact ? '254px' : '297mm' }}
          />
        </div>
        : assets.file
          ? <img
            className="branding-preview__file"
            src={assets.file}
            alt={snapshot.name}
            style={!compact ? { maxHeight: `${(snapshot.heightMm / 297) * 100}%` } : undefined}
          />
          : <span>{snapshot.fileMime === 'application/pdf' ? `PDF: ${snapshot.name}` : snapshot.name}</span>
    ) : (
      <div
        className={`branding-preview__layout${snapshot.layout?.separator ? ' has-separator' : ''}`}
        style={!compact ? { minHeight: `${(snapshot.heightMm / 297) * 100}%` } : undefined}
      >
        {(['left', 'center', 'right'] as const).map(column => <div key={column}>
          {snapshot.layout?.columns[column].map(renderItem)}
        </div>)}
      </div>
    )}
    {error && <span className="branding-preview__error" role="alert">{error}</span>}
  </div>;
}
