const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAvailableModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // List of models to test
  const modelsToTest = [
    "gemini-2.5-flash-image-preview",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-pro-vision"
  ];
  
  console.log("Testing available Gemini models with your API key...\n");
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Test with a simple prompt
      const prompt = "Say hello in 3 different languages";
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`✓ ${modelName} is available and working`);
      console.log(`  Sample response: ${text.substring(0, 50)}...\n`);
    } catch (error) {
      console.log(`✗ ${modelName} is not available: ${error.message.substring(0, 100)}...\n`);
    }
  }
}

testAvailableModels().catch(console.error);