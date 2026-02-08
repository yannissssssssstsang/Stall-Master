
import { GoogleGenAI, Type } from "@google/genai";
import { AIExtractionResult } from "../types";

/**
 * Basic extraction of price, cost, and category from a product image.
 * Retries on failure and uses a streamlined prompt for faster response.
 */
export const extractProductInfo = async (base64Image: string, retryCount = 0): Promise<AIExtractionResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const mimeType = base64Image.includes(';') ? base64Image.split(';')[0].split(':')[1] : "image/jpeg";
    const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: "Act as a fast POS scanner. Extract: price, cost, category. Return JSON only." }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            price: { type: Type.NUMBER },
            cost: { type: Type.NUMBER },
            category: { type: Type.STRING },
          },
          required: ["name", "price", "cost", "category"],
        },
      },
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as AIExtractionResult;
  } catch (error) {
    if (retryCount < 2) {
      console.warn(`Extraction failed, retrying... (${retryCount + 1})`);
      return extractProductInfo(base64Image, retryCount + 1);
    }
    console.error("AI Extraction failed after retries:", error);
    return null;
  }
};
