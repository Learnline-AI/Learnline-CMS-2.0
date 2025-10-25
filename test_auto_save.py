#!/usr/bin/env python3

import requests
import json

# Test auto-save functionality with component sequence

# First, create a session
session_response = requests.post("http://localhost:8000/session/create")
session_data = session_response.json()
session_id = session_data["session_id"]
print(f"Created session: {session_id}")

# Test component sequence auto-save
test_content = {
    "components": [
        {
            "type": "heading",
            "order": 0,
            "parameters": {
                "type": "heading",
                "text": "Understanding Fractions"
            },
            "confidence": 1.0,
            "styling": "background: transparent;"
        },
        {
            "type": "paragraph", 
            "order": 1,
            "parameters": {
                "type": "paragraph",
                "text": "Fractions represent parts of a whole number. They are written as a/b where a is the numerator and b is the denominator."
            },
            "confidence": 1.0,
            "styling": "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px; border-radius: 6px;"
        },
        {
            "type": "definition",
            "order": 2,
            "parameters": {
                "type": "definition",
                "term": "Numerator",
                "definition": "The top number in a fraction that represents how many parts we have"
            },
            "confidence": 1.0,
            "styling": "background: transparent;"
        },
        {
            "type": "step-sequence",
            "order": 3,
            "parameters": {
                "type": "step-sequence",
                "steps": [
                    "Look at the numerator (top number)",
                    "Look at the denominator (bottom number)", 
                    "Understand the relationship between them"
                ]
            },
            "confidence": 1.0,
            "styling": "background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 12px; border-radius: 6px;"
        },
        {
            "type": "memory-trick",
            "order": 4,
            "parameters": {
                "type": "memory-trick",
                "text": "Remember: Bigger denominator = smaller pieces!"
            },
            "confidence": 1.0,
            "styling": "background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 12px; border-radius: 6px;"
        }
    ],
    "suggested_template": "text-heavy",
    "overall_confidence": 1.0
}

# Test auto-save
auto_save_response = requests.put(
    f"http://localhost:8000/session/{session_id}/nodes/N001/auto-save",
    headers={"Content-Type": "application/json"},
    data=json.dumps(test_content)
)

print(f"Auto-save response: {auto_save_response.status_code}")
print(f"Auto-save result: {auto_save_response.json()}")

# Verify the data was saved by checking the database directly
import sqlite3
conn = sqlite3.connect("/Users/user/Downloads/CMS_Project_1/python-services/cms_development.db")
cursor = conn.cursor()

cursor.execute("SELECT * FROM node_components ORDER BY component_order")
saved_components = cursor.fetchall()
print(f"\nSaved components in database:")
for comp in saved_components:
    print(f"  Order {comp[3]}: {comp[2]} - {comp[4]}")

conn.close()