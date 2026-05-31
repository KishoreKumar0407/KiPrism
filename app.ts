import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Accept large payloads (typical for dataset uploads or complex summaries)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Shared Gemini client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Route: Insights
app.post(["/api/generate-insights", "*/api/generate-insights"], async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error:
          "Gemini API client not initialized. Please configure GEMINI_API_KEY in your Secrets.",
      });
    }
    const {
      datasetName,
      rowsCount,
      columnsCount,
      columns,
      summaryStats,
      sampleRows,
      categoricalAnalysis,
    } = req.body;

    const prompt = `You are an expert Senior Data Analyst. Analyze the following dataset summary and provide 3-4 highly impressive, specific, actionable, and deep insights about the data. Do NOT use generic comments. Be extremely analytical.

Dataset Name: ${datasetName || "Uploaded Dataset"}
Dimensions: ${rowsCount} rows, ${columnsCount} columns

Columns and Detected Types:
${JSON.stringify(columns, null, 2)}

Statistical Summaries of Numeric Columns:
${JSON.stringify(summaryStats, null, 2)}

Categorical Frequencies:
${JSON.stringify(categoricalAnalysis, null, 2)}

Sample Data Rows (JSON format):
${JSON.stringify(sampleRows, null, 2)}

Please write your response in beautiful Markdown. Structure it with professional headings, bullet points, and highlight key metrics. Use clear numerical comparisons and percentages if possible. Focus purely on the data's business and analytical stories. Do NOT discuss system processes or logs.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ insights: response.text });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate insights" });
  }
});

// API Route: Natural Language Query
app.post(["/api/query-dataset", "*/api/query-dataset"], async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error:
          "Gemini API client not initialized. Please configure GEMINI_API_KEY in your Secrets.",
      });
    }
    const {
      query,
      datasetName,
      columns,
      summaryStats,
      categoricalAnalysis,
      groupByAnalysis,
      sampleRows,
    } = req.body;

    const prompt = `You are an elite business analyst and database oracle. A user is querying the dataset titled "${
      datasetName || "dataset"
    }" with the following question:
"${query}"

To help you answer accurately, here is the dataset schema and pre-computed summaries:

Columns and Detected Types:
${JSON.stringify(columns, null, 2)}

Statistical Summaries of Numeric Columns:
${JSON.stringify(summaryStats, null, 2)}

Categorical Column Frequencies (value counts):
${JSON.stringify(categoricalAnalysis, null, 2)}

Pre-computed Group-By Aggregations (Sums & Means of numeric metrics by categorical columns):
${JSON.stringify(groupByAnalysis, null, 2)}

Small Sample of Raw Data (first few rows):
${JSON.stringify(sampleRows, null, 2)}

Instructions:
1. Examine the user's question. Use the pre-computed summaries and group-by aggregations if they fit the question (e.g., if the user asks for sales by region, check if there's a group-by aggregate of some numeric column grouped by a categorical column representing Regions).
2. Answer the question directly with high numerical precision. Show calculations where relevant.
3. If the user asks for lists or selections, return a beautiful, high-contrast Markdown table.
4. If some data is missing or the question is impossible to answer given the summary, politely explain what data would be required.
5. Keep the answer concise, extremely professional, and data-driven. Always prefer showing exact answers in human-readable analytics format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ answer: response.text });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to query dataset" });
  }
});

export default app;
