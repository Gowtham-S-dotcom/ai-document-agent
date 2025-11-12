// --- 6. INITIALIZATION / EVENT LISTENERS ---
// We wrap the *ENTIRE* application in this listener.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURATION ---
    // IMPORTANT: Paste your brand-new Gemini API key here.
    const GEMINI_API_KEY = "PASTE_YOUR_BRAND_NEW_API_KEY_HERE"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const RESULT_TOKEN_LIMIT = 4096; 

    // --- 2. DOM ELEMENT REFERENCES ---
    const inputPage = document.getElementById('input-page');
    const loadingPage = document.getElementById('loading-page');
    const resultsPage = document.getElementById('results-page');

    const fileUpload = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const userQueryInput = document.getElementById('user-query');
    const generateButton = document.getElementById('generate-button');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    const loadingStatus = document.getElementById('loading-status');

    const backButton = document.getElementById('back-button');
    
    // *** FIX: Corrected the ID to 'analysis-card' to match the HTML ***
    const classificationCard = document.getElementById('analysis-card'); 
    
    const docType = document.getElementById('doc-type');
    const sentimentDisplay = document.getElementById('sentiment-display');
    const keywordsDisplay = document.getElementById('keywords-display');

    const reportOutput = document.getElementById('report-output');
    
    // Follow-up question references
    const followupContainer = document.getElementById('followup-container');
    const followupButtons = document.getElementById('followup-buttons');
    const followupPlaceholder = document.getElementById('followup-placeholder');
    
    // We keep a reference to the file for follow-up questions
    let currentDocumentPart = null;

    // --- 3. THEME TOGGLE LOGIC ---

    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark');
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark');
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
            localStorage.setItem('theme', 'light');
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('dark');
        applyTheme(!isDark);
    }


    // --- 4. UI HELPER FUNCTIONS ---

    function setPage(pageName) {
        // *** DEBUG: Add null checks for safety ***
        if (inputPage) inputPage.classList.add('hidden');
        if (loadingPage) loadingPage.classList.add('hidden');
        if (resultsPage) resultsPage.classList.add('hidden');

        if (pageName === 'input' && inputPage) {
            inputPage.classList.remove('hidden');
        } else if (pageName === 'loading' && loadingPage) {
            loadingPage.classList.remove('hidden');
        } else if (pageName === 'results' && resultsPage) {
            resultsPage.classList.remove('hidden');
        }
    }

    function fileToGenerativePart(file) {
        const mimeType = file.type || 'application/octet-stream';
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = e.target.result.split(',')[1];
                if (base64Data) {
                    resolve({ inlineData: { data: base64Data, mimeType: mimeType } });
                } else {
                    reject(new Error("Failed to read file contents into base64."));
                }
            };
            reader.onerror = (e) => { reject(new Error("FileReader failed to read file.")); };
            reader.readAsDataURL(file);
    });
    }

    function updateFileName() {
        const file = fileUpload && fileUpload.files[0]; 
        if (file) {
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.classList.add('text-blue-600');
            fileNameDisplay.classList.remove('text-gray-600', 'dark:text-gray-300');
        } else {
            fileNameDisplay.textContent = 'Click to upload or drag & drop';
            fileNameDisplay.classList.remove('text-blue-600');
            fileNameDisplay.classList.add('text-gray-600', 'dark:text-gray-300');
        }
    }

    async function callGeminiApi(systemInstruction, documentPart, jsonSchema = null) {
        
        const generationConfig = { 
            maxOutputTokens: RESULT_TOKEN_LIMIT, 
            responseMimeType: jsonSchema ? "application/json" : "text/plain",
        };

        if (jsonSchema) {
            generationConfig.responseSchema = jsonSchema;
        }

        const payload = {
            contents: [
                {
                    parts: [
                        { text: systemInstruction }, 
                        { text: "Here is the document content:" },
                        documentPart
                    ]
                }
            ],
            generationConfig: generationConfig,
        };

        let responseJson;
        for (let i = 0; i < 6; i++) { 
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(`HTTP Error: ${response.status} - ${errorBody.error?.message || 'Unknown error'}`); 
                }
                
                responseJson = await response.json();
                const text = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    return text; // Success
                } else {
                    throw new Error("API returned an empty response.");
                }

            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                if (i === 5 || error.message.includes('403')) {
                    throw error; 
                }
                await new Promise(resolve => setTimeout(resolve, 2000 * (2 ** i))); 
            }
        }
        throw new Error("All API retries failed. The model might be temporarily unavailable.");
    }


    // --- 5. MAIN AGENT LOGIC (3-STEP SEQUENTIAL ANALYSIS) ---

    async function generateInsights(followUpQuery = null) {
        
        const file = fileUpload.files[0];
        const query = followUpQuery || userQueryInput.value.trim();

        if (!file && !currentDocumentPart) {
             alert("Please upload a document first.");
             return;
        }
        if (!query) {
            alert("Please enter a query.");
            return;
        }
        
        setPage('loading');
        loadingStatus.textContent = "Preparing document...";
        
        let docAnalysis = {};

        try {
            // STEP 1: Get Document Part
            if (!followUpQuery) {
                currentDocumentPart = await fileToGenerativePart(file);
            }
            
            // STEP 2: Document Classification, Sentiment & Keywords (Sequential Call 1)
            loadingStatus.textContent = "Step 1/3: Analyzing document context (JSON Mode)...";
            
            const analysisPrompt = "Analyze the document's content. Provide a full analysis.";
            
            const analysisSchema = {
                type: "OBJECT",
                properties: {
                    "documentType": { "type": "STRING" },
                    "sentiment": { "type": "STRING", "enum": ["Positive", "Negative", "Neutral"] },
                    "keywords": {
                        "type": "ARRAY",
                        "items": { "type": "STRING" }
                    }
                },
                required: ["documentType", "sentiment", "keywords"]
            };

            const rawAnalysisJson = await callGeminiApi(analysisPrompt, currentDocumentPart, analysisSchema);
            docAnalysis = JSON.parse(rawAnalysisJson);

            // Update loading status
            loadingStatus.textContent = `Step 2/3: Generating ${docAnalysis.documentType} report...`;
            
            // --- Populate Analysis Card immediately ---
            // *** FIX: Add a null check to prevent the crash ***
            if (classificationCard) { 
                classificationCard.classList.remove('hidden');
                docType.textContent = docAnalysis.documentType;
                sentimentDisplay.textContent = docAnalysis.sentiment;
                
                // Render Keyword Tags
                keywordsDisplay.innerHTML = ''; // Clear placeholders
                if (docAnalysis.keywords && docAnalysis.keywords.length > 0) {
                    docAnalysis.keywords.forEach(keyword => {
                        const tag = document.createElement('span');
                        tag.className = 'keyword-tag';
                        tag.textContent = keyword;
                        keywordsDisplay.appendChild(tag);
                    });
                } else {
                    keywordsDisplay.innerHTML = '<span class="keyword-placeholder">No keywords found.</span>';
                }
            } else {
                console.error("CRITICAL DEBUG: 'analysis-card' element not found. Check your HTML file.");
            }


            // STEP 3: Main Report & NEW Follow-up Questions (Sequential Call 2)
            let mainReportPrompt = `You are an expert AI document analyst. Based on the document (which you classified as a ${docAnalysis.documentType}), your primary goal is to generate a comprehensive report that addresses the user's specific query: "${query}".\n\n`;
            mainReportPrompt += `**A. FINAL REPORT:** Respond with a markdown-formatted report that first gives a "## Executive Summary" (5 sentences max) and then a "## Detailed Q&A Response" section to fully answer the specific query.\n\N`;
            mainReportPrompt += `**B. FOLLOW-UP QUESTIONS:** After the report, append a section titled '## SUGGESTED FOLLOW-UPS' containing three new, insightful questions a user might want to ask next based on the document and the query you just answered. Format this as a simple markdown bulleted list.`;

            
            const rawReport = await callGeminiApi(mainReportPrompt, currentDocumentPart);

            // --- Process Report & Follow-ups ---
            loadingStatus.textContent = "Step 3/3: Finalizing report...";

            const followupRegex = /(## SUGGESTED FOLLOW-UPS[\s\S]*)/i;
            let reportMarkdown = rawReport;
            let followupMarkdown = null;

            const followupMatch = reportMarkdown.match(followupRegex);
            if (followupMatch) {
                followupMarkdown = followupMatch[1];
                reportMarkdown = reportMarkdown.replace(followupRegex, '').trim();
            }
            
            reportOutput.innerHTML = marked.parse(reportMarkdown);

            // Render the new Follow-up Buttons
            followupButtons.innerHTML = ''; // Clear old buttons
            if (followupMarkdown) {
                const questions = followupMarkdown.match(/^[ \t]*[\*\-]\s+(.*)/gm);
                if (questions) {
                    followupPlaceholder.classList.add('hidden');
                    questions.map(q => q.replace(/^[ \t]*[\*\-]\s+/, '')) 
                             .forEach(questionText => {
                                const btn = document.createElement('button');
                                btn.className = 'followup-btn';
                                btn.textContent = questionText;
                                btn.onclick = () => {
                                    userQueryInput.value = questionText; 
                                    generateInsights(questionText); // Re-run with new query
                                };
                                followupButtons.appendChild(btn);
                             });
                } else {
                    followupPlaceholder.classList.remove('hidden');
                }
            } else {
                followupPlaceholder.classList.remove('hidden');
            }

            // --- 4F. Show the final page ---
            setPage('results');

        } catch (error) {
            // Show error on the input page for simplicity
            setPage('input');
            alert(`Critical Failure: ${error.message}`);
            console.error("Critical Failure in generateInsights:", error);
        }
    }


    // --- 6. INITIALIZATION ---
    
    // Theme setup
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches));

    // Attach event listeners
    generateButton.addEventListener('click', () => generateInsights(null)); // Main button
    fileUpload.addEventListener('change', updateFileName);
    themeToggle.addEventListener('click', toggleTheme); 
    backButton.addEventListener('click', () => {
        currentDocumentPart = null; 
        fileUpload.value = null;
        updateFileName();
        setPage('input');
    });

    // Initial state setup
    setPage('input');
    
    // API key check
    if (GEMINI_API_KEY === "PASTE_YOUR_BRAND_NEW_API_KEY_HERE" || !GEMINI_API_KEY) {
        alert("API Key is missing! Please obtain a NEW key and replace the placeholder in index.js to use this app.");
        generateButton.disabled = true;
    }
});