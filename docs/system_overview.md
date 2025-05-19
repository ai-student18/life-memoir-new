system overview:

1. Introduction LifeMemoir is a web-based platform designed to allow users, especially older populations, to create and organize their life story in a professional, exciting and accessible book format. The system helps the user throughout the process using artificial intelligence tools to develop content and improve the quality of writing.
2. Main goals - Simplicity and accessibility: An intuitive interface that is friendly even to users who are not technologically skilled.
Guidance in the writing process: A smart questionnaire and automatic treatment to create a chronological writing plan.
Content quality: AI engine for editing, improving style and tone, checking spelling and grammar.
Flexibility and download: Save, download and export in Word and EPUB.
3. Target audience - Older people without technical or literary knowledge.
Families who want to document memories.
Users who need guidance in the planning, writing and improving content stages.
4. Key Technologies - Backend & Auth & Database & Storage: Supabase
AI Integration: Google Gemini Flash 1.5 (including JSON protocol system calls)
Frontend: React (e.g. using lovable.dev)
File Export: generation library for Word & EPUB
5. MVP — Main Features
5.1. Home Page - Showing a summary of processes and a link to log in/register.
5.2. Authentication - Registering a new user (Email/Password).
Authentication and Security (Session tokens, JWT).
5.3. Creating a new biography
1. Smart Form: Leading questions (free-text), encouraging memory and chronological order.
Send to AI:
Initial reading of all answers to obtain an initial plan (TOC).
User approval/editing of the TOC structure.
Second reading to Gemini Flash1.5:
System prompt: Structure and table of contents for creating biography chapters.
Context: All questions and answers in a JSON file.
Options to select style, tone, and writing language.
Text editor view:
WYSIWYG design with direct editing option.
Automatic saving to Supabase Storage.
5.4. Export and sharing
Download or share WORD/ EPUB files
6. Functional requirements .
Dynamic questionnaire interface: Loading questions and storing answers in DB.
AI call service: Integrating Gemini Flash1.5 via a defined endpoint.
Rich text editor: Using a component such as Quill or Slate.js.
Project management system: List of personal biographies, status (draft, published).
Access levels: Standard user only.

8. UX/UI Color Palette:
Background: #FFFFFF
Primary CTA: #FFD217 (Chromatic Yellow)
Text: #333333 (Dark Gray)
Secondary accents: #5B9AA0 (Light Blue-Gray)