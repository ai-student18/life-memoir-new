
# LifeMemoir Project Knowledge

## Project Overview
LifeMemoir is a platform that helps users write, enhance, and save their life stories. It uses AI to improve narrative flow, correct grammar, and make stories more engaging.

## Key Features
- Story writing with auto-save functionality
- AI enhancement of stories using the Gemini API
- User authentication via Supabase
- Story saving and management
- Customizable AI instructions

## Technical Architecture

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Router for navigation
- Context API for state management

### Backend
- Supabase for authentication and database
- Supabase Edge Functions for serverless backend logic
- Gemini API for AI text enhancement

### Database Schema
- **stories** table
  - id: UUID (primary key)
  - user_id: UUID (foreign key to auth.users)
  - title: TEXT
  - original_text: TEXT
  - enhanced_text: TEXT (nullable)
  - file_path: TEXT (nullable)
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP

## Edge Functions
- **enhance-story**: Calls the Gemini API to enhance user stories with improved narrative flow and grammar corrections

## Environment Variables and Secrets
- GEMINI_API_KEY: API key for the Gemini AI service

## Project Structure
- `/src/components`: UI components
- `/src/components/dashboard`: Dashboard-specific components
- `/src/components/ui`: Reusable UI components
- `/src/context`: Context providers
- `/src/hooks`: Custom React hooks
- `/src/integrations`: Integration with external services
- `/src/pages`: Page components
- `/src/services`: Service classes for API calls
- `/src/types`: TypeScript type definitions
- `/supabase/functions`: Supabase Edge Functions

## State Management
The project uses React's Context API for state management. The main context providers are:
- `StoriesContext`: Manages the state of the user's stories, including the current story being worked on, saving functionality, and auto-save features.

## Development Guidelines
1. Create small, focused components
2. Use TypeScript interfaces for type safety
3. Implement responsive design for all components
4. Use Tailwind CSS for styling
5. Follow React best practices (hooks, functional components)
6. Create custom hooks for reusable logic
7. Use Context API for global state management
8. Add appropriate error handling
9. Use toast notifications for user feedback

## Deployment
The project is deployed using Lovable's publishing feature. To deploy:
1. Open the project in Lovable
2. Click on Share -> Publish
3. Follow the instructions to deploy the application

## Additional Resources
- [Lovable Documentation](https://docs.lovable.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Gemini API Documentation](https://ai.google.dev/gemini-api)
