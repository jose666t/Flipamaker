
import { GoogleGenAI } from "@google/genai";

export const generateAnimationIdea = async (topic: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Por favor configura tu API_KEY para usar el asistente creativo.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me a short, creative, and funny idea for a 5-10 frame loop animation about "${topic}". 
      Keep it under 30 words. Answer in Spanish.`,
    });

    return response.text || "No se pudo generar una idea.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hubo un error al conectar con la IA creativa.";
  }
};
