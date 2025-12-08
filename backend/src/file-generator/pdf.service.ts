// src/file-generator/pdf.service.ts
// Service for editing PDF files using pdf-lib

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

/**
 * Fill form fields in a PDF document
 * @param templatePath - Path to the PDF template file
 * @param fieldValues - Object mapping field names to values
 * @returns Buffer containing the filled PDF document
 */
export async function fillFormFields(
  templatePath: string,
  fieldValues: { [key: string]: string }
): Promise<Buffer> {
  try {
    // Read the PDF file
    const pdfBytes = await fs.readFile(templatePath);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form
    const form = pdfDoc.getForm();

    // Fill in the form fields
    Object.keys(fieldValues).forEach((fieldName) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(fieldValues[fieldName]);
      } catch (error) {
        // Field might not exist or might be a different type, log and continue
        console.warn(`Warning: Could not set field "${fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Flatten the form (optional - makes fields non-editable)
    // form.flatten();

    // Serialize the PDF document to bytes
    const filledPdfBytes = await pdfDoc.save();

    return Buffer.from(filledPdfBytes);
  } catch (error) {
    throw new Error(`Failed to fill PDF form fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add text to a specific page in a PDF document
 * @param pdfPath - Path to the PDF file
 * @param text - Text to add
 * @param position - Position object with x, y coordinates and page number
 * @returns Buffer containing the modified PDF document
 */
export async function addTextToPage(
  pdfPath: string,
  text: string,
  position: { x: number; y: number; page: number; size?: number }
): Promise<Buffer> {
  try {
    // Read the PDF file
    const pdfBytes = await fs.readFile(pdfPath);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the specified page (0-indexed)
    const pages = pdfDoc.getPages();
    const pageIndex = Math.min(position.page, pages.length - 1);
    const page = pages[pageIndex];

    // Embed the standard Helvetica font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Draw the text on the page
    const fontSize = position.size || 12;
    page.drawText(text, {
      x: position.x,
      y: position.y,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Serialize the PDF document to bytes
    const modifiedPdfBytes = await pdfDoc.save();

    return Buffer.from(modifiedPdfBytes);
  } catch (error) {
    throw new Error(`Failed to add text to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    throw new Error(`Failed to save PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a simple PDF with form fields
 * @param outputPath - Path where the PDF should be saved
 */
export async function createSimpleFormTemplate(outputPath: string): Promise<void> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add a page
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add title
    page.drawText('Formularz faktury', {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Create form
    const form = pdfDoc.getForm();

    // Add text fields
    const invoiceNumberField = form.createTextField('invoiceNumber');
    invoiceNumberField.setText('');
    invoiceNumberField.addToPage(page, { x: 150, y: height - 100, width: 200, height: 20 });

    const clientNameField = form.createTextField('clientName');
    clientNameField.setText('');
    clientNameField.addToPage(page, { x: 150, y: height - 140, width: 200, height: 20 });

    const amountField = form.createTextField('amount');
    amountField.setText('');
    amountField.addToPage(page, { x: 150, y: height - 180, width: 200, height: 20 });

    const dateField = form.createTextField('date');
    dateField.setText('');
    dateField.addToPage(page, { x: 150, y: height - 220, width: 200, height: 20 });

    // Add labels
    page.drawText('Numer faktury:', { x: 50, y: height - 95, size: 12, font });
    page.drawText('Nazwa klienta:', { x: 50, y: height - 135, size: 12, font });
    page.drawText('Kwota:', { x: 50, y: height - 175, size: 12, font });
    page.drawText('Data:', { x: 50, y: height - 215, size: 12, font });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, pdfBytes);
  } catch (error) {
    throw new Error(`Failed to create PDF template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
