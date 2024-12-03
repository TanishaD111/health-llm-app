import path from "path";
import { spawn } from "child_process";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { symptoms, gender } = body;

    if (!symptoms || !gender) {
      throw new Error("Symptoms and gender are required.");
    }

    console.log("Received symptoms:", symptoms);
    console.log("Received gender:", gender);

    const parsedData = { ...symptoms, gender };

    const pythonPath = path.resolve(process.cwd(), "src/venv/bin/python3");
    console.log("Resolved Python path:", pythonPath);

    const pythonProcess = spawn(pythonPath, ["src/python/symptom_checker.py", JSON.stringify(parsedData)]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    const exitCode = await new Promise((resolve, reject) => {
      pythonProcess.on("close", resolve);
      pythonProcess.on("error", reject);
    });

    if (exitCode !== 0) {
      throw new Error(`Python script failed: ${errorOutput}`);
    }

    console.log("Python output:", output);

    const matchedDiseases = output
      .trim()
      .split("\n") 
      .filter((line) => !line.startsWith("Loaded DataFrame") && !line.startsWith("[") && line.trim() !== ""); // check this

    if (matchedDiseases.length === 0) {
      return NextResponse.json({ diseases: [], suggestions: "No matching conditions found." });
    }

    // to fix formatting to send llamafile
    const formattedDiseases = matchedDiseases
      .map((disease, index) => `${index + 1}. ${disease}`)
      .join("\n");

    // what to send llamafile
    const llamaEndpoint = "http://localhost:8887/v1/chat/completions";
    const input = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a healthcare assistant. Provide detailed, actionable, and unique suggestions for each condition listed.",
        },
        {
          role: "user",
          content: `The patient has the following symptoms:
                Fever: ${symptoms.fever}, Cough: ${symptoms.cough}, Fatigue: ${symptoms.fatigue}, Difficulty Breathing: ${symptoms.difficulty_breathing}, Gender: ${gender}.
                Based on these symptoms, the dataset matched the following conditions: ${formattedDiseases}
                For each condition, provide specific and actionable healthcare suggestions tailored to the symptoms.`,
        },
      ],
      max_tokens: 2000,
    };

    console.log("Sent to LLaMA:", input);

    const llamaResponse = await fetch(llamaEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error("LLaMA server error:", errorText);
      throw new Error("LLaMA server returned an error");
    }

    const llamaData = await llamaResponse.json();
    const suggestions = llamaData.choices[0].message.content;

    return NextResponse.json({ diseases: matchedDiseases, suggestions });
  } catch (error) {
    console.error("Error in API route:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
