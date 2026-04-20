import pdfParse from "pdf-parse";

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    if (!file) {
      console.warn("No PDF file provided");
      return "";
    }

    if (!file.type || file.type !== "application/pdf") {
      console.warn("File is not a PDF:", file.type);
      return "";
    }

    // Convert File to Buffer so pdf-parse can read it
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text content from the PDF
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      console.warn("PDF appears to be empty or image-only (no extractable text)");
      return "";
    }

    console.log(`Extracted ${data.text.length} characters from PDF: ${file.name}`);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return "";
  }
};
