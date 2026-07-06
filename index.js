import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-2.5-flash";

const DEFAULT_SYSTEM_INSTRUCTION =
  "Kamu adalah asisten produktivitas pribadi. Bantu pengguna menyusun to-do list, memprioritaskan tugas, memecah tugas besar jadi langkah kecil, dan memberi pengingat. Jawab singkat, praktis, dan terstruktur (pakai poin-poin bila perlu).";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ⬇️ ENDPOINT-ENDPOINT DITARUH DI SINI (poin 7-10)

// Endpoint 1: /generate-text
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

// Endpoint 2: /generate-from-image
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  const base64Image = req.file.buffer.toString("base64");
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt, type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

// Endpoint 3: /generate-from-document
app.post("/generate-from-document", upload.single("document"), async (req, res) => {
  const { prompt } = req.body;
  const base64Document = req.file.buffer.toString("base64");
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.", type: "text" },
        { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

// Endpoint 4: /generate-from-audio
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  const { prompt } = req.body;
  const base64Audio = req.file.buffer.toString("base64");
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buatkan transkrip dari rekaman berikut.", type: "text" },
        { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

// Endpoint 5 (Sesi 3): /api/chat — chatbot multi-turn dengan parameter Gemini
app.post('/api/chat', async (req, res) => {
  const { conversation, temperature, topP, topK, systemInstruction } = req.body;
  try {
    if (!Array.isArray(conversation)) {
      throw new Error('conversation must be an array!');
    }

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: temperature ?? 0.9,
        topP: topP ?? 0.95,
        topK: topK ?? 40,
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      },
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

// ⬆️ SEMUA ENDPOINT HARUS DI ATAS INI

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));