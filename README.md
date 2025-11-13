AI Knowledge Analyst

This project is a AI-powered web application that transforms passive document analysis into a dynamic, proactive, and context-aware experience.

Instead of a simple "Q&A" bot, this tool acts as an AI Knowledge Analyst. It runs a sequential, multi-step analysis to understand the purpose of a document before generating a rich, multi-part report that includes proactive suggestions for further research.

This entire application runs 100% in the browser using HTML, CSS, and Vanilla JavaScript, powered by the Google Gemini API.



Key Features

Multi-Page Animated UI: A clean, responsive, and animated interface that guides the user from input $\rightarrow$ analysis $\rightarrow$ results.

Dark Mode: A professional, polished UI with a persistent dark mode toggle (saves to localStorage).

Document Upload: Supports PDFs, TXT, DOCX, and even image formats (PNG, JPG) for analysis.

Step 1: AI-Powered JSON Analysis:

The agent's first step is to classify the document.

It uses Gemini's JSON Mode to reliably extract the documentType, sentiment, and an array of keywords with 100% accuracy.

This analysis is immediately shown to the user.

Step 2: Context-Aware Report:

The agent generates a detailed report (formatted with Marked.js) that directly answers the user's query.

Step 3: Proactive Follow-up Questions:

This is the app's "killer feature." The AI analyzes the document and the user's initial query to generate three new, insightful follow-up questions.

These questions are presented as clickable buttons, turning a passive report into an interactive research partner.

Follow-up Loop:

Clicking a suggested question instantly re-runs the analysis, using the new question as the query while preserving the original document context.

Robust & Resilient:

The app uses a 3-step sequential API call process, which is far more reliable than a single complex prompt.

Includes an exponential backoff (6 retries) function to automatically handle 503 "Server Overloaded" errors, making the demo incredibly stable.

Tech Stack

Front-End: Vanilla HTML5, CSS3, and JavaScript (ES6+)

AI/Brain: Google Gemini API (gemini-2.5-flash)

JSON Schema Mode for reliable, structured data extraction.

Text Generation Mode for the main report and follow-ups.

UI & Styling:

Tailwind CSS (via CDN): For all utility-first styling.

Custom CSS (style.css): For advanced components like the gradient button, card shadows, and dark mode variables.

Libraries (via CDN):

marked.js: For converting the AI's Markdown responses into clean HTML.

Development Server:

live-server: A simple, zero-config Node.js server for local development.



How to Run This Project

This project is built to be simple and has no complex build steps.

1. Prerequisites

You must have Node.js and npm installed on your machine to run the live-server.

2. Clone the Repository

git clone (https://github.com/Gowtham-S-dotcom/ai-document-agent))
cd <folder_name>


3. Install live-server

This is the only dependency, which runs the local web server.

npm install -g live-server


4. Get Your API Key

This project requires a Google Gemini API Key.

Go to Google AI Studio and generate a new API key.

Open the index.js file.

On line 6, paste your new key:

// BEFORE
const GEMINI_API_KEY = "PASTE_YOUR_BRAND_NEW_API_KEY_HERE";

// AFTER
const GEMINI_API_KEY = "AIza...your...key...here..."; 


5. Run the App!

Run the following command from the project's root folder:

live-server


Your default browser will automatically open to http://127.0.0.1:8080, and the application will be fully functional.

How the Agent Works: A 3-Step Flow

The "magic" of this app is in the generateInsights() function in index.js.

File Read & Classify (Call 1):

The user's file is read into a Base64 string.

The app calls the Gemini API with a responseSchema, forcing it to return a clean JSON object:
{ documentType, sentiment, keywords }

This analysis data is immediately displayed on the results page.

Generate Report & Follow-ups (Call 2):

The app builds a new prompt based on the user's query and the document type (e.g., "You are an analyst...").

It instructs the AI to generate both a main report AND a list of 3 "Suggested Follow-ups."

The AI's text response is parsed. The main report is rendered as HTML, and the follow-up questions are turned into clickable buttons.

Follow-up Loop (Call 3+):

When a user clicks a follow-up button, the generateInsights() function is called again.

It skips Step 1 (it re-uses the file) and runs Step 2 again, but with the new question.

This creates a seamless loop of analysis and discovery.
