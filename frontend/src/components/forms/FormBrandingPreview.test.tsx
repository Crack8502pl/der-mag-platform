import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormBrandingPreview } from './FormBrandingPreview';

describe('FormBrandingPreview', () => {
  it('uses a sample task number and a Polish calendar date in branding previews', () => {
    render(<FormBrandingPreview snapshot={{
      id: 1,
      name: 'Podgląd',
      kind: 'HEADER',
      mode: 'CUSTOM',
      heightMm: 20,
      filePath: null,
      fileMime: null,
      layout: {
        columns: {
          left: [{ type: 'variable', source: 'task.number' }],
          center: [{ type: 'printDate' }],
          right: [],
        },
        separator: false,
      },
    }} compact />);

    expect(screen.getByText('Z00011026')).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}\.\d{2}\.\d{4}$/)).toBeInTheDocument();
  });
});
