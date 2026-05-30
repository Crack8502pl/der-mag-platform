import { Router } from 'express';
import path from 'path';
import { AppDataSource } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { Photo } from '../entities/Photo';
import { PhotoAlbum } from '../entities/PhotoAlbum';

const router = Router();
router.use(authenticate);

router.get('/albums', async (_req, res) => {
  try {
    const albumRepo = AppDataSource.getRepository(PhotoAlbum);
    const photoRepo = AppDataSource.getRepository(Photo);
    const albums = await albumRepo.find({ order: { createdAt: 'DESC' } });

    const albumsWithCount = await Promise.all(albums.map(async album => ({
      ...album,
      photoCount: await photoRepo.count({ where: { albumId: album.id } }),
    })));

    res.json({ success: true, data: albumsWithCount });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.post('/albums', async (req, res) => {
  try {
    const albumRepo = AppDataSource.getRepository(PhotoAlbum);
    const album = albumRepo.create({ name: req.body.name, description: req.body.description, contractId: req.body.contractId });
    await albumRepo.save(album);
    res.status(201).json({ success: true, data: album });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/', async (req, res) => {
  try {
    const photoRepo = AppDataSource.getRepository(Photo);
    const qb = photoRepo.createQueryBuilder('photo').orderBy('photo.createdAt', 'DESC');

    if (req.query.albumId) qb.andWhere('photo.albumId = :albumId', { albumId: Number(req.query.albumId) });
    if (req.query.approvalStatus) qb.andWhere('photo.approvalStatus = :approvalStatus', { approvalStatus: req.query.approvalStatus });
    if (req.query.contractId) qb.andWhere('photo.contractId = :contractId', { contractId: Number(req.query.contractId) });

    const photos = await qb.getMany();
    res.json({ success: true, data: photos });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.post('/upload', uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Brak pliku' });
      return;
    }

    if (req.file.size > 10 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'Maksymalny rozmiar pliku to 10MB' });
      return;
    }

    const photoRepo = AppDataSource.getRepository(Photo);
    const photo = photoRepo.create({
      filename: path.basename(req.file.path),
      originalName: req.file.originalname,
      filePath: req.file.path,
      thumbnailPath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      albumId: req.body.albumId ? Number(req.body.albumId) : null,
      contractId: req.body.contractId ? Number(req.body.contractId) : null,
      taskId: req.body.taskId ? Number(req.body.taskId) : null,
      approvalStatus: 'pending',
      uploadedById: req.userId || null,
      description: req.body.description || null,
    });

    await photoRepo.save(photo);
    res.status(201).json({ success: true, data: photo });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/:id/approve', authorize('admin', 'manager'), async (req, res) => {
  try {
    const photoRepo = AppDataSource.getRepository(Photo);
    const photo = await photoRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Zdjęcie nie znalezione' });
      return;
    }

    photo.approvalStatus = 'approved';
    photo.approvedById = req.userId || null;
    photo.approvedAt = new Date();
    await photoRepo.save(photo);
    res.json({ success: true, data: photo });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/:id/reject', authorize('admin', 'manager'), async (req, res) => {
  try {
    const photoRepo = AppDataSource.getRepository(Photo);
    const photo = await photoRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Zdjęcie nie znalezione' });
      return;
    }

    photo.approvalStatus = 'rejected';
    photo.approvedById = req.userId || null;
    photo.approvedAt = new Date();
    await photoRepo.save(photo);
    res.json({ success: true, data: photo });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const photoRepo = AppDataSource.getRepository(Photo);
    const photo = await photoRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Zdjęcie nie znalezione' });
      return;
    }

    await photoRepo.remove(photo);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/:id/thumbnail', async (req, res) => {
  try {
    const photoRepo = AppDataSource.getRepository(Photo);
    const photo = await photoRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!photo) {
      res.status(404).json({ success: false, message: 'Zdjęcie nie znalezione' });
      return;
    }

    res.sendFile(path.resolve(photo.thumbnailPath || photo.filePath));
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

export default router;
