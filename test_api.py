import requests

# Test the parse endpoint
files = {'resume': ('test.txt', 'This is some test content for a resume.')}
r = requests.post('http://localhost:8000/parse', files=files)
print(f"Parse response: {r.status_code}, {r.json()}")

# Test the improve endpoint (AI service)
data = {'resume': 'Python Developer with 2 years experience.', 'jd': 'Looking for a Senior Python Developer with strong backend skills.'}
r = requests.post('http://localhost:8000/improve', json=data)
print(f"Improve (AI) response: {r.status_code}")
if r.status_code == 200:
    print(f"Improved Resume Length: {len(r.json().get('improved_resume', ''))}")
else:
    print(r.text)

if r.status_code == 200:
    test_resume = r.json().get('improved_resume', '')
    match_data = {'resume': test_resume, 'jd': data['jd']}
    r_match = requests.post('http://localhost:5000/match', json=match_data)
    print(f"Match (Backend) response on AI Resume: {r_match.status_code}, {r_match.json()}")
