import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits for handling uploads of large documents
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Healthy Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Lazy load Gemini client to prevent crashing if the key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please configure it in Settings > Secrets in the AI Studio UI.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to process images/PDF OCR using Gemini
app.post("/api/ocr", async (req, res): Promise<any> => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: fileBase64 and mimeType" });
    }

    const ai = getGeminiClient();

    // Prepare content parts
    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: fileBase64,
      },
    };

    const promptText = `
You are an extremely advanced OCR and Document Layout Expert. 
Your task is to analyze the provided page or document image/PDF and convert it into high-fidelity markdown, following these strict parameters:

1. **Language-Adaptive Extraction**:
   - If the document is in English, extract and keep the output in English.
   - If the document is in Hindi or Sanskrit (Devanagari script), extract and keep the output in Hindi/Sanskrit.
   - If the document is bilingual/multilingual (contains both Hindi and English words or mixed sentences), extract each word in its original script and language exactly as written (e.g. Devanagari script for Hindi, Latin script for English). DO NOT translate or convert any words/phrases between Hindi and English under any circumstances.

2. **Skip Embedded Images / Figures & Reserve Proportional Space**:
   - IMPORTANT: If there are any embedded images, photos, drawings, charts, diagrams, or visual illustrations in between the text, you MUST NOT scan, transcribe, or describe their internal elements. SKIP them completely.
   - You MUST estimate the vertical size or layout height occupied by each embedded image.
   - In the markdown output, at the exact relative visual position where the skipped image was located, you MUST insert a clean HTML spacer placeholder block representing that empty space, so the user can insert an image later.
   - Use this exact spacer format, substituting the height value (e.g. between 100px and 450px) based on how much relative vertical footprint that image takes on the page:
     <div style="height: 220px; border: 1px dashed #cbd5e1; border-radius: 8px; margin: 16px 0; background-color: #f8fafc; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 11px; font-family: sans-serif;">[Image Slot - Skipped for Manual Placement]</div>

3. **Layout & Flow Preservation**:
   - Maintain the line sequence, bullet points, tabular layouts, indentation, and paragraph boundaries perfectly.
   - Use appropriate heading syntax: '#' for main document headers, '##' or '###' for section titles.

4. **Illegible Words / Bad Handwriting Handling**:
   - If some handwritten words are entirely illegible, fuzzy, or cut-off, mark them inline with: \`==⚠️ High Alert: [illegible word]==\` (or if the surrounding text is Hindi, use: \`==⚠️ High Alert: [अस्पष्ट शब्द]==\`). Add these instances to the 'alerts' array with appropriate context.

Please format your response strictly as valid JSON matching the specified responseSchema. Only return the JSON object, do not markdown-wrap the JSON.
    `;

    // We use gemini-3.5-flash which is perfect for visually rich OCR and layout preservation
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        filePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdown: {
              type: Type.STRING,
              description: "The complete structured Markdown output of the document matching all language-adaptive and image-skipping spacer requirements."
            },
            confidenceEstimate: {
              type: Type.INTEGER,
              description: "Estimated OCR accuracy/confidence percentage from 0 to 100."
            },
            wordCount: {
              type: Type.INTEGER,
              description: "Calculated count of words processed in the document."
            },
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fragment: {
                    type: Type.STRING,
                    description: "The illegible fragment of text detected."
                  },
                  context: {
                    type: Type.STRING,
                    description: "The sentence or surrounding words where this word was positioned."
                  },
                  reason: {
                    type: Type.STRING,
                    description: "Why this fragment was flagged as illegible/unclear."
                  }
                },
                required: ["fragment", "context", "reason"]
              },
              description: "Any fuzzy, overlapping, or bad handwriting alerts detected in the document."
            }
          },
          required: ["markdown", "confidenceEstimate", "wordCount", "alerts"]
        }
      }
    });

    const parsedOCRResult = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsedOCRResult);

  } catch (error: any) {
    console.error("OCR API error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error in OCR processing",
      details: error.stack
    });
  }
});

// Configure Vite middleware or Static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OCR Server] Server active on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}

startServer();
