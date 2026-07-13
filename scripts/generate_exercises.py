import json
import random

# For Basics1 Nouns
with open("data/A1/Basics1_Nouns/words.json", "r", encoding="utf-8") as f:
    nouns = json.load(f)

# imageChoice
image_choice_qs = []
for n in nouns[:10]:  # Just take 10 for the exercise
    # create 3 random wrong options
    wrong_options = random.sample([w for w in nouns if w['en'] != n['en']], min(3, len(nouns)-1))
    options = [{"text": n['hu'], "correct": True}] + [{"text": w['hu'], "correct": False} for w in wrong_options]
    random.shuffle(options)
    
    image_choice_qs.append({
        "type": "image_choice",
        "word": n['en'],
        "options": options
    })

with open("data/A1/Basics1_Nouns/imageChoice.json", "w", encoding="utf-8") as f:
    json.dump(image_choice_qs, f, ensure_ascii=False, indent=4)

# matchPairs for Basics1
# We usually group 5 pairs per question
match_pairs_qs1 = []
chunk_size = 5
for i in range(0, len(nouns), chunk_size):
    chunk = nouns[i:i+chunk_size]
    if len(chunk) < 3:
        break
    pairs = [{"en": w['en'], "hu": w['hu']} for w in chunk]
    match_pairs_qs1.append({
        "type": "match_pairs",
        "pairs": pairs
    })

with open("data/A1/Basics1_Nouns/matchPairs.json", "w", encoding="utf-8") as f:
    json.dump(match_pairs_qs1, f, ensure_ascii=False, indent=4)

# For Basics2 Adjectives
with open("data/A1/Basics2_Adjectives/words.json", "r", encoding="utf-8") as f:
    adjectives = json.load(f)

# matchPairs for Basics2
match_pairs_qs2 = []
for i in range(0, len(adjectives), chunk_size):
    chunk = adjectives[i:i+chunk_size]
    if len(chunk) < 3:
        break
    pairs = [{"en": w['en'], "hu": w['hu']} for w in chunk]
    match_pairs_qs2.append({
        "type": "match_pairs",
        "pairs": pairs
    })

with open("data/A1/Basics2_Adjectives/matchPairs.json", "w", encoding="utf-8") as f:
    json.dump(match_pairs_qs2, f, ensure_ascii=False, indent=4)

# trueFalse for Basics2
true_false_qs = [
    {
        "type": "true_false",
        "statement": "A big house",
        "translation": "Egy nagy ház",
        "isTrue": True
    },
    {
        "type": "true_false",
        "statement": "A small cat",
        "translation": "Egy nagy macska",
        "isTrue": False
    },
    {
        "type": "true_false",
        "statement": "Cold milk",
        "translation": "Hideg tej",
        "isTrue": True
    },
    {
        "type": "true_false",
        "statement": "Beautiful day",
        "translation": "Éhes nap",
        "isTrue": False
    },
    {
        "type": "true_false",
        "statement": "A green car",
        "translation": "Egy zöld autó",
        "isTrue": True
    }
]

with open("data/A1/Basics2_Adjectives/trueFalse.json", "w", encoding="utf-8") as f:
    json.dump(true_false_qs, f, ensure_ascii=False, indent=4)

print("Exercises generated successfully!")
