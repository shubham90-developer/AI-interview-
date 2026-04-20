import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const extractJSON = (text: string): any => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("AI returned malformed JSON");
  }
};

export const generateInterviewQuestions = async (
  context: string,
): Promise<string[]> => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in .env.local");
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Generate exactly 15 interview questions for: ${context}.
First 3 must be soft-skill questions. Exactly 5 total soft-skill, 10 technical.
Soft-skill at positions 1,2,3,8,13. Rest are technical.

Return ONLY this JSON, no other text:
{ "questions": ["question1", "question2", ...15 questions total] }`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = extractJSON(text);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid question format from AI");
    }

    return parsed.questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
};

export const analyzeResponse = async (
  question: string,
  answer: string,
): Promise<{
  score: number;
  technicalFeedback: string;
  communicationFeedback: string;
  improvementSuggestions: string[];
}> => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in .env.local");
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Analyze this interview answer and return ONLY a raw JSON object, nothing else.

Question: ${question}
Answer: ${answer}

Score 1-100 based on: Technical accuracy 40%, Communication 30%, Problem-solving 20%, Best practices 10%.

Return exactly this JSON:
{
  "score": <number 1-100>,
  "technicalFeedback": "<feedback on technical accuracy>",
  "communicationFeedback": "<feedback on clarity and structure>",
  "improvementSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = extractJSON(text);

    if (typeof parsed.score !== "number") {
      throw new Error("score is not a number");
    }
    if (typeof parsed.technicalFeedback !== "string") {
      throw new Error("technicalFeedback is not a string");
    }
    if (typeof parsed.communicationFeedback !== "string") {
      throw new Error("communicationFeedback is not a string");
    }
    if (!Array.isArray(parsed.improvementSuggestions)) {
      throw new Error("improvementSuggestions is not an array");
    }

    parsed.score = Math.min(100, Math.max(1, Math.round(parsed.score)));
    return parsed;
  } catch (error) {
    console.error("Error analyzing response:", error);
    throw error;
  }
};

export const generateInterviewFeedback = async (
  interview: any,
): Promise<{
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  nextSteps: string[];
}> => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in .env.local");
    }

    const questionsAndAnswers = interview.questions
      .map(
        (q: any, i: number) =>
          `Q${i + 1}: ${q.text}\nAnswer: ${q.answer || "No answer"}\nScore: ${q.analysis?.score || "N/A"}`,
      )
      .join("\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Generate interview feedback for a ${interview.jobRole} candidate with ${interview.yearsOfExperience} years experience in ${interview.techStack?.join(", ")}.

${questionsAndAnswers}

Return ONLY this JSON, no other text:
{
  "overallFeedback": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areasForImprovement": ["<area 1>", "<area 2>", "<area 3>"],
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>"]
}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = extractJSON(text);

    if (
      typeof parsed.overallFeedback !== "string" ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.areasForImprovement) ||
      !Array.isArray(parsed.nextSteps)
    ) {
      throw new Error("Invalid feedback format from AI");
    }

    return parsed;
  } catch (error) {
    console.error("Error generating feedback:", error);
    throw error;
  }
};
