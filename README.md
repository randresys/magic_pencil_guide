# Drawing Tutorial App with Google Gemini

An advanced application for learning to draw using exclusively Google's Gemini AI models. This application allows users to upload an image and generate a step-by-step drawing tutorial with audio narration.

## Features

- Upload any image to generate a drawing tutorial
- Select from three difficulty levels (Beginner, Intermediate, Advanced)
- AI-generated pencil sketch reference
- Step-by-step drawing instructions
- Audio narration for each step using Gemini TTS
- Interactive navigation through tutorial steps

## How It Works

1. User uploads an image and selects a difficulty level
2. The app uses Nano-banana model to generate a pencil sketch of the main object
3. A step-by-step tutorial is generated with the appropriate complexity level
4. Each step includes visual guidance and audio narration
5. Users can navigate through steps at their own pace

## Technology Stack

- **Backend**: Node.js with Express
- **AI Models**: gemini-2.5-flash, gemini-2.5-flash-image-preview
- **Frontend**: HTML, CSS, JavaScript
- **APIs**: Google Generative AI SDK

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Open your browser to `http://localhost:3000`

## Note on Implementation

This is a prototype implementation that demonstrates the application structure and user flow. In a production environment:

1. Actual image generation would be implemented using appropriate Gemini models
2. Audio narration would be implemented using Google Cloud Text-to-Speech API
3. Additional error handling and validation would be added
4. User progress tracking could be implemented
5. More advanced UI/UX features could be added

## API Endpoints

- `POST /api/generate-tutorial` - Generate a drawing tutorial from an image
- `GET /api/health` - Health check endpoint

## Future Enhancements

- User account system for saving progress
- Community sharing of drawings
- Video tutorial generation
- Mobile app version
- Additional AI models for specialized drawing techniques