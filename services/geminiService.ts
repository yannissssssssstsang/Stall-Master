
import { GoogleGenAI, Type } from "@google/genai";
import { AIExtractionResult } from "../types";

/**
 * Basic extraction of price, cost, and category from a product image.
 * Name is now primarily handled by filename in the UI.
 */
export const extractProductInfo = async (base64Image: string): Promise<AIExtractionResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const mimeType = base64Image.split(';')[0].split(':')[1] || "image/jpeg";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: "Extract product price, cost, and category from this image. Return zero for numbers if not found.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Identify the product name briefly if possible" },
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
    console.error("AI Extraction failed:", error);
    return null;
  }
};
