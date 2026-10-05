import { useCallback, useEffect, useState } from 'react';
import { formsService } from '../services/forms.service';
import type { FormTemplate } from '../types/forms.types';

export const useFormTemplates = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await formsService.listTemplates();
      setTemplates(result.items);
    } catch {
      setError('Nie udało się pobrać formularzy. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { templates, loading, error, reload };
};
