
import { GoogleGenAI, Type } from "@google/genai";
import { AIExtractionResult } from "../types";

export interface MultiModalExtractionResult extends AIExtractionResult {
  image?: string;
}

export const extractProductInfo = async (base64Image: string): Promise<AIExtractionResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: "Extract product details from this label or invoice. Provide the name, price (numerical), cost (numerical), and a likely category. If you can't find one, estimate reasonable values based on context.",
            },
          ],
        },
      ],
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
    console.error("AI Extraction failed:", error);
    return null;
  }
};

export const extractBulkProductsWithImages = async (dataString: string, base64Images: string[]): Promise<MultiModalExtractionResult[] | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    
    // Construct parts: Prompt first, then all images
    const imageParts = base64Images.slice(0, 15).map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1] || img
      }
    }));

    const promptText = `
      I have a data dump from an Excel file: "${dataString}".
      I also have ${base64Images.length} images extracted from the same file.
      
      Please extract a list of products. For each product:
      1. Find the name, price, cost, and category from the text.
      2. If one of the provided images corresponds to the product, return that image data in the 'image' field.
      3. Use your vision capabilities to match the products described in the text with the visual content of the images.
      
      Return a JSON array of objects.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: promptText },
            ...imageParts
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              category: { type: Type.STRING },
              image: { type: Type.STRING, description: "The base64 image data matched to this product, if found." }
            },
            required: ["name", "price", "cost", "category"],
          },
        },
      },
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as MultiModalExtractionResult[];
  } catch (error) {
    console.error("AI Multi-modal Bulk Extraction failed:", error);
    return null;
  }
};

// Keep existing for backward compatibility or pure text files
export const extractBulkProductsFromText = async (dataString: string): Promise<AIExtractionResult[] | null> => {
  return extractBulkProductsWithImages(dataString, []);
};
