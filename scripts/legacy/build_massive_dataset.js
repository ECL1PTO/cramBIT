const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function buildDatabase() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  const prompt = `
You are building the official course database for BIT Mesra (Noida Campus).
Please provide a comprehensive JSON object mapping course codes to their official Course Names and a brief syllabus summary.
Include ALL standard subjects for:
- BCA (CA codes like CA101, CA25209, etc.)
- BBA (MT/MN codes like MT101, MN25109, etc.)
- MCA (CA codes for PG)
- MBA (MT codes for PG)
- BSc CS, BSc Animation, BSc AIDS, BSc VC

Include the specific course: "CA25209": "Statistics with R".
Include at least 50 core courses across these programs.

OUTPUT STRICTLY VALID JSON ONLY. No markdown wrapping.
Format:
{
  "CA25209": { "name": "Statistics with R", "syllabus": "Introduction to Statistics..." },
  "CA101": { "name": "Problem Solving and Programming with C", "syllabus": "..." }
}
`;

  try {
    console.log("Fetching official BIT Mesra course data via Gemini Knowledge Graph...");
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(text);
    
    // We'll wrap them in a "Global" namespace since Program is removed
    const finalData = { "Global": data };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'src', 'data', 'courses.json'), 
      JSON.stringify(finalData, null, 2)
    );
    console.log("Successfully rebuilt massive courses.json database.");
  } catch(e) {
    console.error("Failed to build DB:", e);
  }
}

buildDatabase();
