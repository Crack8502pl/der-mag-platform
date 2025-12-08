// src/file-generator/excel.service.ts
// Service for generating and editing Excel files using exceljs

import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate an Excel file from a template and fill it with data
 * @param templatePath - Path to the Excel template file
 * @param data - Data object containing values to fill in the template
 * @returns Buffer containing the generated Excel file
 */
export async function generateFromTemplate(
  templatePath: string,
  data: any
): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in template');
    }

    // Set report title if provided
    if (data.reportTitle) {
      const titleCell = worksheet.getCell('A1');
      titleCell.value = data.reportTitle;
      titleCell.font = { bold: true, size: 14 };
    }

    // Fill tasks data starting from row 4 (assuming header is in row 3)
    if (data.tasks && Array.isArray(data.tasks)) {
      let rowIndex = 4;
      data.tasks.forEach((task: any) => {
        worksheet.getCell(`A${rowIndex}`).value = task.id;
        worksheet.getCell(`B${rowIndex}`).value = task.name;
        worksheet.getCell(`C${rowIndex}`).value = task.status;
        worksheet.getCell(`D${rowIndex}`).value = task.date;
        worksheet.getCell(`E${rowIndex}`).value = task.technician;
        rowIndex++;
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    throw new Error(`Failed to generate Excel from template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Edit an existing Excel file with modifications
 * @param filePath - Path to the Excel file to edit
 * @param modifications - Object containing modifications to apply
 * @returns Buffer containing the modified Excel file
 */
export async function editExistingFile(
  filePath: string,
  modifications: { [key: string]: any }
): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in file');
    }

    // Apply modifications
    Object.keys(modifications).forEach((cellRef) => {
      const cell = worksheet.getCell(cellRef);
      cell.value = modifications[cellRef];
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    throw new Error(`Failed to edit Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save a buffer to a file
 * @param buffer - Buffer containing file data
 * @param outputPath - Path where the file should be saved
 */
export async function saveToFile(buffer: Buffer, outputPath: string): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(outputPath, buffer);
  } catch (error) {
    throw new Error(`Failed to save Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a simple Excel template with headers
 * @param outputPath - Path where the template should be saved
 */
export async function createSimpleTemplate(outputPath: string): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Raport');

    // Title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Tytuł raportu';
    titleCell.font = { bold: true, size: 14 };
    worksheet.mergeCells('A1:E1');

    // Headers
    worksheet.getCell('A3').value = 'ID';
    worksheet.getCell('B3').value = 'Nazwa zadania';
    worksheet.getCell('C3').value = 'Status';
    worksheet.getCell('D3').value = 'Data';
    worksheet.getCell('E3').value = 'Technik';

    // Style headers
    ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => {
      const headerCell = worksheet.getCell(cell);
      headerCell.font = { bold: true };
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });

    // Set column widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 20;

    // Save
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await workbook.xlsx.writeFile(outputPath);
  } catch (error) {
    throw new Error(`Failed to create Excel template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
