import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ScannedItem {
  name: string;
  category: string;
  quantity: string;
}

export async function scanInventory(base64Image: string): Promise<ScannedItem[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Identify all food items, fruits, and vegetables in this image. Return a JSON array of objects with 'name', 'category', and 'quantity' (estimate if possible). Only return the JSON." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            quantity: { type: Type.STRING }
          },
          required: ["name", "category", "quantity"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse inventory scan", e);
    return [];
  }
}

export interface MealPlanResponse {
  plan: string;
  dishes: string[];
  seasonalTips: string;
  pregnancyAdvice?: string;
  childNutritionTable?: string;
  childDietaryWarnings?: string;
}

export async function generateMealPlan(
  items: string[],
  duration: string,
  isPregnant: boolean,
  isNursing: boolean = false,
  childAge: string = ""
): Promise<MealPlanResponse> {
  const prompt = `
    Based on these available ingredients: ${items.join(", ")}.
    Generate a meal plan for a ${duration}.
    
    Requirements:
    1. Rationalize a plan (daily/weekly breakdown).
    2. Suggest specific dishes that can be made with these ingredients.
    3. Give alternative situations based on seasonal availability.
    ${isPregnant ? "4. Provide specialized advice for pregnancy: high-nutrient, easy-to-digest foods, and warnings for unsafe foods." : ""}
    ${isNursing && childAge ? `5. The mother is nursing/lactating and has a child aged ${childAge}. Provide a markdown table labeled 'Child Nutritional Plan (${childAge})' with appropriate weaning/solid food suggestions or purees using some of the ingredients available. 6. Provide specific dietary warnings for a child of this age (e.g., choking hazards, common allergens to introduce cautiously, or foods to strictly avoid like honey for infants under 1 year).` : ""}
    
    Return the response in JSON format with fields: 
    'plan' (markdown string), 
    'dishes' (array of strings), 
    'seasonalTips' (string), 
    ${isPregnant ? "'pregnancyAdvice' (string)," : ""}
    ${isNursing && childAge ? "'childNutritionTable' (markdown string formatted as a table), 'childDietaryWarnings' (string)," : ""}
    Ensure you always include 'plan', 'dishes', and 'seasonalTips'.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plan: { type: Type.STRING },
          dishes: { type: Type.ARRAY, items: { type: Type.STRING } },
          seasonalTips: { type: Type.STRING },
          pregnancyAdvice: { type: Type.STRING },
          childNutritionTable: { type: Type.STRING },
          childDietaryWarnings: { type: Type.STRING }
        },
        required: ["plan", "dishes", "seasonalTips"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse meal plan", e);
    throw new Error("Failed to generate meal plan");
  }
}

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: string;
  nutritionalValue: string;
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
  const prompt = `
    Extract the recipe from this URL: ${url}.
    If it's a social media link (TikTok, IG, Facebook), use your knowledge of common recipes from those platforms or search for the content if possible.
    Provide a "local" version of the recipe (easy to find ingredients, clear steps).
    
    Return the response in JSON format with fields: 'title', 'ingredients' (array of strings), 'instructions' (markdown string), and 'nutritionalValue' (string).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.STRING },
          nutritionalValue: { type: Type.STRING }
        },
        required: ["title", "ingredients", "instructions", "nutritionalValue"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to extract recipe", e);
    throw new Error("Failed to extract recipe from URL");
  }
}

export async function chatWithGemini(
  message: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  userContext: { isPregnant: boolean; isNursing: boolean; childAge: string },
  imageBase64?: string
): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      history: history as any,
      config: {
        systemInstruction: `You are Mumify AI, a supportive nutrition assistant for mothers. You help with meal planning, nutrition advice, and inventory management. Be warm, empathetic, and professional.
        
User Context:
- Pregnant: ${userContext.isPregnant ? 'Yes' : 'No'}
- Nursing/Lactating: ${userContext.isNursing ? 'Yes' : 'No'}
${userContext.isNursing ? `- Child Age: ${userContext.childAge}` : ''}

Important Guidelines:
${userContext.isNursing ? 'When giving advice for the nursing child, explicitly mention specific dietary warnings relevant to their age (e.g., common allergens to introduce cautiously, choking hazards, or foods to strictly avoid like honey for infants under 1 year).' : 'Provide safe, nutrient-dense advice appropriate for the mother.'}`,
      }
    });

    const parts: any[] = [{ text: message }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await chat.sendMessage({ message: parts });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    const msg = error?.message || "";
    if (error?.status === "RESOURCE_EXHAUSTED" || msg.includes("429") || msg.includes("credits are depleted")) {
      return "⚠️ **Service Unavailable**: Your AI Studio prepayment credits are depleted. Please go to https://ai.studio/projects to manage your project and billing.";
    }
    return "⚠️ I apologize, but I encountered a network error while connecting to the AI. Please try again later.";
  }
}

export async function generateSpeech(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate speech");
    return base64Audio;
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    const msg = error?.message || "";
    if (error?.status === "RESOURCE_EXHAUSTED" || msg.includes("429") || msg.includes("credits are depleted")) {
      throw new Error("AI Studio credits are depleted. Please check your billing at https://ai.studio/projects.");
    }
    throw new Error("Text-to-Speech failed. Please try again later.");
  }
}

