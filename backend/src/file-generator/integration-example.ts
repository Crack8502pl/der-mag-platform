// src/file-generator/integration-example.ts
// Example of how to integrate file generator with existing API endpoints

import express from 'express';
import path from 'path';
import { ExcelService, WordService, PdfService } from './index';

/**
 * Example router showing integration with Express API
 * This can be imported and used in the main application
 */
const router = express.Router();

/**
 * POST /api/reports/generate-excel
 * Generate an Excel report from task data
 */
router.post('/generate-excel', async (req, res) => {
  try {
    const { reportTitle, tasks } = req.body;

    // Validate input
    if (!reportTitle || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data'
      });
    }

    // Generate Excel file
    const templatePath = path.join(__dirname, '../templates/report-template.xlsx');
    const buffer = await ExcelService.generateFromTemplate(templatePath, {
      reportTitle,
      tasks
    });

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=raport-${Date.now()}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel report'
    });
  }
});

/**
 * POST /api/reports/generate-protocol
 * Generate a Word protocol document
 */
router.post('/generate-protocol', async (req, res) => {
  try {
    const { taskNumber, clientName, date, location, technicianName, description } = req.body;

    // Validate input
    if (!taskNumber || !clientName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Generate Word document
    const templatePath = path.join(__dirname, '../templates/document-template.docx');
    const buffer = await WordService.generateFromTemplate(templatePath, {
      taskNumber,
      clientName,
      date: date || new Date().toISOString().split('T')[0],
      location,
      technicianName,
      description
    });

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=protokol-${taskNumber}.docx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error generating Word protocol:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate protocol'
    });
  }
});

/**
 * POST /api/reports/generate-invoice
 * Fill a PDF invoice form
 */
router.post('/generate-invoice', async (req, res) => {
  try {
    const { invoiceNumber, clientName, amount, date } = req.body;

    // Validate input
    if (!invoiceNumber || !clientName || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Fill PDF form
    const templatePath = path.join(__dirname, '../templates/form-template.pdf');
    const buffer = await PdfService.fillFormFields(templatePath, {
      invoiceNumber,
      clientName,
      amount: String(amount),
      date: date || new Date().toISOString().split('T')[0]
    });

    // Send file as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=faktura-${invoiceNumber.replace(/\//g, '-')}.pdf`);
    res.send(buffer);

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice'
    });
  }
});

/**
 * POST /api/reports/save-and-share
 * Generate a file and save it to the shared directory (for WebDAV access)
 */
router.post('/save-and-share', async (req, res) => {
  try {
    const { type, filename, data } = req.body;

    if (!type || !filename || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const generatedDir = path.join(__dirname, '../generated');
    let buffer: Buffer;
    let fullFilename: string;

    switch (type) {
      case 'excel':
        const templateExcel = path.join(__dirname, '../templates/report-template.xlsx');
        buffer = await ExcelService.generateFromTemplate(templateExcel, data);
        fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
        break;

      case 'word':
        const templateWord = path.join(__dirname, '../templates/document-template.docx');
        buffer = await WordService.generateFromTemplate(templateWord, data);
        fullFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
        break;

      case 'pdf':
        const templatePdf = path.join(__dirname, '../templates/form-template.pdf');
        buffer = await PdfService.fillFormFields(templatePdf, data);
        fullFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid file type'
        });
    }

    // Save file
    const outputPath = path.join(generatedDir, fullFilename);
    if (type === 'excel') {
      await ExcelService.saveToFile(buffer, outputPath);
    } else if (type === 'word') {
      await WordService.saveToFile(buffer, outputPath);
    } else {
      await PdfService.saveToFile(buffer, outputPath);
    }

    res.json({
      success: true,
      message: 'File generated and saved',
      filename: fullFilename,
      webdavUrl: `/generated/${fullFilename}`
    });

  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save file'
    });
  }
});

export default router;

/**
 * To use this router in your main application:
 * 
 * // In src/app.ts or src/routes/index.ts
 * import fileGeneratorRoutes from './file-generator/integration-example';
 * 
 * // Add to your Express app
 * app.use('/api/file-generator', fileGeneratorRoutes);
 * 
 * // Or in routes/index.ts
 * router.use('/file-generator', fileGeneratorRoutes);
 */
