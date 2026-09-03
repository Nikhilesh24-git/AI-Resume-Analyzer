from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()

app = Flask(__name__)
CORS(app)

def extract_text(file_path):
    text = ""
    try:
        print(f"Reading PDF from {file_path}")
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        print(f"Extraction successful, got {len(text)} characters.")
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
    return text

def match_score(resume_text, jd_text):
    if not resume_text or not jd_text:
        return 0
    resume_words = set(resume_text.lower().split())
    jd_words = set(jd_text.lower().split())
    if not jd_words:
        return 0
    match = resume_words.intersection(jd_words)
    return (len(match) / len(jd_words)) * 100

from werkzeug.utils import secure_filename

@app.route('/parse', methods=['POST'])
def parse_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400
    
    file = request.files['resume']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    temp_path = f"temp_{filename}"
    file.save(temp_path)
    
    text = extract_text(temp_path)
    
    if os.path.exists(temp_path):
        os.remove(temp_path)
    
    if not text.strip():
        return jsonify({"error": "Failed to extract text from the provided PDF. It might be empty or image-based."}), 422
        
    return jsonify({"text": text})

@app.route('/match', methods=['POST'])
def match():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400
        
    resume_text = data.get('resume', '')
    jd_text = data.get('jd', '')
    
    score = match_score(resume_text, jd_text)
    return jsonify({"score": score})

@app.route('/improve', methods=['POST'])
def improve_resume():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400
        
    resume_text = data.get('resume', '')
    jd_text = data.get('jd', '')
    
    if not resume_text or not jd_text:
        return jsonify({"error": "Missing resume or job description"}), 400
        
    if "GEMINI_API_KEY" not in os.environ:
        return jsonify({"error": "Gemini API key is missing"}), 500

    prompt = f"""
You are an expert ATS optimizer and resume writer. 
Review the following Resume and Job Description.

Your ONLY goal is to rewrite the resume so that it mathematically scores 100% on a STRICT EXACT-MATCH ATS parser.
The parser works by splitting the Job Description into individual words by whitespace, and checking if those EXACT words exist anywhere in the resume. 

CRITICAL INSTRUCTIONS:
1. Identify EVERY SINGLE NOUN, VERB, and ADJECTIVE from the Job Description.
2. You MUST organically weave ALL of these exact words into the candidate's experience bullets, summary, and skills section. Do not use synonyms. Do not change the capitalization or tense if possible.
3. NEVER simply list the keywords at the bottom. They MUST be integrated into natural, professional resume sentences.
4. Ensure the output is entirely the completely rewritten resume in clean markdown format. Do not include introductory, closing, or conversational text.

## Job Description
{jd_text}

## Original Resume
{resume_text}
"""
    
    try:
        max_retries = 3
        response = None

        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                break
            except Exception as e:
                error_msg = str(e)
                if "503" in error_msg or "UNAVAILABLE" in error_msg or "429" in error_msg:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        print(f"Gemini API busy. Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                raise e

        return jsonify({"improved_resume": response.text})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Gemini API Error: {error_details}")
        return jsonify({"error": f"Failed to rewrite resume using AI: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
