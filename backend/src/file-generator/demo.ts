// src/file-generator/demo.ts
// Demonstration file showing usage of all file generation services

import path from 'path';
import {
  ExcelService,
  WordService,
  PdfService,
  WebDAVServer,
} from './index';

// Sample data
const dataExcel = {
  reportTitle: "Raport zadań - Grudzień 2024",
  tasks: [
    { id: 1, name: "Montaż SMW Warszawa", status: "completed", date: "2024-12-01", technician: "Jan Kowalski" },
    { id: 2, name: "Konfiguracja LAN PKP", status: "in_progress", date: "2024-12-05", technician: "Anna Nowak" },
    { id: 3, name: "Instalacja monitoringu", status: "completed", date: "2024-12-03", technician: "Piotr Wiśniewski" },
  ]
};

const dataWord = {
  taskNumber: "123456789",
  clientName: "PKP PLK S.A.",
  date: "2024-12-08",
  location: "Warszawa Centralna",
  technicianName: "Jan Kowalski",
  description: "Montaż i konfiguracja systemu monitoringu wizyjnego"
};

const dataPdf = {
  invoiceNumber: "FV/2024/001",
  clientName: "PKP PLK S.A.",
  amount: "15000.00",
  date: "2024-12-08"
};

/**
 * Demo function to generate all file types
 */
async function generateAllFiles(): Promise<void> {
  try {
    const templatesDir = path.join(__dirname, '../templates');
    const generatedDir = path.join(__dirname, '../generated');

    console.log('=== File Generation Demo ===\n');

    // 1. Generate Excel file
    console.log('1. Generating Excel file...');
    try {
      const excelTemplatePath = path.join(templatesDir, 'report-template.xlsx');
      const excelBuffer = await ExcelService.generateFromTemplate(excelTemplatePath, dataExcel);
      const excelOutputPath = path.join(generatedDir, 'raport-zadania.xlsx');
      await ExcelService.saveToFile(excelBuffer, excelOutputPath);
      console.log(`   ✓ Excel file generated: ${excelOutputPath}\n`);
    } catch (error) {
      console.error(`   ✗ Error generating Excel: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // 2. Generate Word document
    console.log('2. Generating Word document...');
    try {
      const wordTemplatePath = path.join(templatesDir, 'document-template.docx');
      const wordBuffer = await WordService.generateFromTemplate(wordTemplatePath, dataWord);
      const wordOutputPath = path.join(generatedDir, 'protokol-odbioru.docx');
      await WordService.saveToFile(wordBuffer, wordOutputPath);
      console.log(`   ✓ Word document generated: ${wordOutputPath}\n`);
    } catch (error) {
      console.error(`   ✗ Error generating Word: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // 3. Fill PDF form
    console.log('3. Filling PDF form...');
    try {
      const pdfTemplatePath = path.join(templatesDir, 'form-template.pdf');
      const pdfBuffer = await PdfService.fillFormFields(pdfTemplatePath, dataPdf);
      const pdfOutputPath = path.join(generatedDir, 'faktura-wypelniona.pdf');
      await PdfService.saveToFile(pdfBuffer, pdfOutputPath);
      console.log(`   ✓ PDF form filled: ${pdfOutputPath}\n`);
    } catch (error) {
      console.error(`   ✗ Error filling PDF: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    console.log('=== All files generated successfully! ===\n');
  } catch (error) {
    console.error('Error in file generation:', error);
    throw error;
  }
}

/**
 * Demo function to start WebDAV server
 */
async function startWebDAVDemo(): Promise<void> {
  try {
    console.log('=== WebDAV Server Demo ===\n');
    
    const generatedDir = path.join(__dirname, '../generated');
    const port = 1900;

    console.log('Starting WebDAV server...');
    await WebDAVServer.startServer(port, generatedDir);
    console.log('\nWebDAV server is running!');
    console.log('You can access files via WebDAV client at:');
    console.log(`  http://localhost:${port}/generated/`);
    console.log('\nPress Ctrl+C to stop the server\n');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\nStopping WebDAV server...');
      await WebDAVServer.stopServer();
      console.log('Server stopped. Exiting...');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error starting WebDAV server:', error);
    throw error;
  }
}

/**
 * Create template files if they don't exist
 */
async function createTemplatesIfNeeded(): Promise<void> {
  try {
    const templatesDir = path.join(__dirname, '../templates');

    console.log('=== Creating Template Files ===\n');

    // Create Excel template
    console.log('Creating Excel template...');
    const excelTemplatePath = path.join(templatesDir, 'report-template.xlsx');
    await ExcelService.createSimpleTemplate(excelTemplatePath);
    console.log(`   ✓ Excel template created: ${excelTemplatePath}\n`);

    // Create PDF template
    console.log('Creating PDF template...');
    const pdfTemplatePath = path.join(templatesDir, 'form-template.pdf');
    await PdfService.createSimpleFormTemplate(pdfTemplatePath);
    console.log(`   ✓ PDF template created: ${pdfTemplatePath}\n`);

    console.log('Note: Word template (document-template.docx) must be created manually');
    console.log('      with placeholders: {taskNumber}, {clientName}, {date}, {location},');
    console.log('      {technicianName}, {description}\n');

  } catch (error) {
    console.error('Error creating templates:', error);
    throw error;
  }
}

/**
 * Main demo function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'generate':
        await generateAllFiles();
        break;
      case 'webdav':
        await startWebDAVDemo();
        break;
      case 'templates':
        await createTemplatesIfNeeded();
        break;
      case 'all':
        await createTemplatesIfNeeded();
        await generateAllFiles();
        await startWebDAVDemo();
        break;
      case 'help':
      default:
        console.log('File Generator Demo\n');
        console.log('Usage: ts-node src/file-generator/demo.ts [command]\n');
        console.log('Commands:');
        console.log('  generate   - Generate all file types from templates');
        console.log('  webdav     - Start WebDAV server');
        console.log('  templates  - Create template files');
        console.log('  all        - Run all commands in sequence');
        console.log('  help       - Show this help message\n');
        break;
    }
  } catch (error) {
    console.error('Demo error:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { generateAllFiles, startWebDAVDemo, createTemplatesIfNeeded };
