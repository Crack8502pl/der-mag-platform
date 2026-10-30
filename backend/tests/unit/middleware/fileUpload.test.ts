import path from 'path';
import { getSubsystemDocumentationUploadDir } from '../../../src/middleware/fileUpload';

describe('subsystem documentation upload directory', () => {
  it('resolves uploads under the configured upload root', () => {
    expect(getSubsystemDocumentationUploadDir('/var/lib/der-mag/uploads')).toBe(
      path.join('/var/lib/der-mag/uploads', 'subsystems', 'documentation')
    );
  });

  it('uses the working-directory uploads folder when UPLOAD_DIR is not configured', () => {
    expect(getSubsystemDocumentationUploadDir('./uploads')).toBe(
      path.join(process.cwd(), 'uploads', 'subsystems', 'documentation')
    );
  });
});
