// src/file-generator/word.service.ts
// Service for generating Word documents using docxtemplater

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate a Word document from a template and fill it with data
 * @param templatePath - Path to the Word template file (.docx)
 * @param data - Data object containing values to replace placeholders
 * @returns Buffer containing the generated Word document
 */
export async function generateFromTemplate(
  templatePath: string,
  data: any
): Promise<Buffer> {
  try {
    // Read the template file
    const content = await fs.readFile(templatePath);

    // Load the template with PizZip
    const zip = new PizZip(content);

    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    try {
      // Render the document (replace placeholders with data)
      doc.render(data);
    } catch (error: any) {
      throw new Error(`Error during template rendering: ${error.message}`);
    }

    // Generate the document as a buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buffer;
  } catch (error) {
    throw new Error(`Failed to generate Word document from template: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    throw new Error(`Failed to save Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
