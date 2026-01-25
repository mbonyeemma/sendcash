import { OpenAI } from "openai";

interface PredictionQuestion {
  category_id: string;
  question: string;
  start_date_time?: string;
  duration?: number;
}

class DailyMessageGenerator {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY in environment variables");
    }

    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  private async generatePrompt(): Promise<string> {
    const today = new Date().toISOString().split("T")[0]; // e.g. "2025-05-11"

    return `Today's date is ${today}. Generate 1 prediction question for each of the following categories. Each question should:
  - Have a clear Yes or No answer.
  - Be phrased naturally.
  - Be tied to real or plausible events happening today or in the next 7 days.
  - Avoid past dates or generic questions.
  - Avoid repeating topics.
  
  Return only a valid JSON array. Do not include any explanation, title, or extra text.
  
  Each item must have:
  - "category_id":  (from 1 to 5)
  - "question": string
  - "start_date_time": ISO 8601 format (e.g., "2025-05-12T18:00:00")
  - "end_date_time": ISO 8601 format (e.g., "2025-05-12T19:30:00")
  - "title": string
  -possible_anser:string(yes,no)
  - "duration": number (in minutes)
  
  Categories:
  1. Soccer(English Premier League,Champions League,La Liga,UEFA Champions League)  
  2. basket ball(NBA,WNBA)
  3. Athletics  
  Example:
  [
    {
      "category_id": 1,
      "title": "Arsenal vs Manchester City",
      "question": "Will Arsenal win their game on May 12, 2025?",
      "start_date_time": "2025-05-12T18:00:00",
      "end_date_time": "2025-05-12T19:30:00",
      "possible_answer": "yes"
    }
  ]`;
  }


  public async generateMessage(): Promise<PredictionQuestion[] | { status: string; message: string }> {
    console.log("generateMessage STARTED");
    try {
      const prompt = await this.generatePrompt();

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.9,
      });

      const content = response.choices[0]?.message?.content || "";
      console.log("Raw response content:", content);

      // Extract the first JSON array from the response
      const jsonMatch = content.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in the response.");
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);
      console.log("Parsed JSON response:", jsonResponse);
      return jsonResponse;
    } catch (error: any) {
      console.error("Error generating message:", error);
      return { status: "error", message: error.message || "Failed to generate a message." };
    }
  }
}

export default DailyMessageGenerator;
