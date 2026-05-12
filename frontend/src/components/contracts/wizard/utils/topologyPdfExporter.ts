import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A3_WIDTH_MM = 420;
const A3_HEIGHT_MM = 297;
const DPI_SCALE = 500 / 96;

export const exportTopologyToPDF = async (
  canvasElement: HTMLElement
): Promise<string> => {
  const root = document.documentElement;
  const previousTheme = root.getAttribute('data-theme');
  root.setAttribute('data-theme', 'grover');

  try {
    const canvas = await html2canvas(canvasElement, {
      scale: DPI_SCALE,
      backgroundColor: '#1e1e1e',
      logging: false,
      useCORS: true,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = A3_WIDTH_MM;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const renderHeight = Math.min(imgHeight, A3_HEIGHT_MM);

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, renderHeight);
    return pdf.output('dataurlstring');
  } finally {
    if (previousTheme) {
      root.setAttribute('data-theme', previousTheme);
    } else {
      root.removeAttribute('data-theme');
    }
  }
};
