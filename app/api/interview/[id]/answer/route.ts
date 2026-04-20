import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Interview from "@/models/Interview";
import { getUserIdFromToken } from "@/lib/auth";
import { analyzeResponse } from "@/lib/gemini";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Received request for interview:", id);

    try {
      await connectDB();
      console.log("MongoDB connected successfully");
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        { message: "Database connection error", error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let userId;
    try {
      userId = getUserIdFromToken(token);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return NextResponse.json(
        { message: "Invalid or expired token", error: "Authentication failed" },
        { status: 401 }
      );
    }

    const { questionIndex, answer } = await request.json();
    console.log("Received answer for question index:", questionIndex);

    if (questionIndex === undefined || !answer) {
      return NextResponse.json(
        {
          message: "Question index and answer are required",
          received: { questionIndex, answer: answer ? "present" : "missing" },
        },
        { status: 400 }
      );
    }

    const interview = await Interview.findById(id);
    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    if (interview.user.toString() !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (questionIndex < 0 || questionIndex >= interview.questions.length) {
      return NextResponse.json(
        {
          message: "Invalid question index",
          received: questionIndex,
          validRange: `0 to ${interview.questions.length - 1}`,
        },
        { status: 400 }
      );
    }

    try {
      const question = interview.questions[questionIndex].text;
      console.log(`Analyzing answer for question ${questionIndex}: "${answer.substring(0, 50)}..."`);

      const analysis = await analyzeResponse(question, answer);
      console.log(`Analysis complete with score: ${analysis.score}`);

      interview.questions[questionIndex].answer = answer;
      interview.questions[questionIndex].analysis = analysis;

      let totalScore = 0;
      let answeredCount = 0;
      for (const q of interview.questions) {
        if (q.answer && q.analysis && q.analysis.score) {
          totalScore += q.analysis.score;
          answeredCount++;
        }
      }
      if (answeredCount > 0) {
        interview.overallScore = Math.round(totalScore / answeredCount);
      }

      await interview.save();
      console.log(`Interview saved for question: ${questionIndex}`);

      return NextResponse.json(
        {
          message: "Answer submitted successfully",
          analysis,
          interview: {
            _id: interview._id,
            jobRole: interview.jobRole,
            techStack: interview.techStack,
            yearsOfExperience: interview.yearsOfExperience,
            questions: interview.questions,
            overallScore: interview.overallScore,
            status: interview.status,
            createdAt: interview.createdAt,
          },
        },
        { status: 200 }
      );
    } catch (analysisError: any) {
      // FIX: Surface the real error message from gemini.ts instead of wrapping
      // it in a generic "Failed to analyze interview response" that hides the cause
      console.error("Error during answer analysis:", analysisError);
      return NextResponse.json(
        {
          message: "Error analyzing answer",
          error: analysisError?.message || "Unknown analysis error",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in answer submission route:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error?.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
