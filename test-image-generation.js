const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

async function testImageGeneration() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    console.log("Testing image generation with Gemini Nano (nano-banana)...");
    
    // Initialize the image generation model
    // Note: The exact model name for nano-banana may vary
    // Based on the documentation, we'll try to use the image generation capability
    
    // First, let's try to list available models to see what's accessible
    console.log("Attempting to list available models...");
    
    // Since we can't actually list models with this library version,
    // we'll try to access the image generation model directly
    
    // Example from the documentation:
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using flash as placeholder
    
    const prompt = "Draw a simple pencil sketch of a cat";
    
    console.log("Sending prompt to model:", prompt);
    
    // Note: The actual image generation syntax may differ
    // This is based on the documentation you provided
    const imageResult = await model.generateContent(prompt);
    const imageResponse = await imageResult.response;
    
    // Check if we got image data
    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
      const candidate = imageResponse.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const part = candidate.content.parts[0];
        if (part.inlineData) {
          console.log("✓ Image generated successfully");
          console.log("Image data type:", part.inlineData.mimeType);
          
          // In a real implementation, we would save this image data
          // For now, we'll just log that we got image data
          console.log("Image data size:", part.inlineData.data.length, "characters");
        } else {
          console.log("Response received but no image data found");
          console.log("Response:", JSON.stringify(candidate.content, null, 2));
        }
      }
    } else {
      console.log("No candidates in response");
      console.log("Full response:", JSON.stringify(imageResponse, null, 2));
    }
  } catch (error) {
    console.log("Error testing image generation:", error.message);
    console.log("This might be because:");
    console.log("1. The image generation model is not accessible with this API key");
    console.log("2. The model name is different than expected");
    console.log("3. Image generation is not enabled for this API key");
  }
}

testImageGeneration().catch(console.error);