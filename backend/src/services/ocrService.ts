import Tesseract from 'tesseract.js';

export const ocrService = {
  extractText: async (filePath: string): Promise<string> => {
    const { data } = await Tesseract.recognize(filePath, 'tur+eng');
    return data.text.trim();
  }
};
