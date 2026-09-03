try:
    import flask
    import flask_cors
    import pdfplumber
    import spacy
    import openai
    import dotenv
    print("ALL_OK")
except ImportError as e:
    print(f"MISSING: {e.name}")
except Exception as e:
    print(f"ERROR: {str(e)}")
