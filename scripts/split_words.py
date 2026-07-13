import json
import os

words_file = "data/A1/Lesson1_ToBe/words.json"
with open(words_file, 'r', encoding='utf-8') as f:
    words = json.load(f)

basics1_nouns = ["student", "teacher", "doctor", "mother", "father", "sister", "friend", "children", 
                 "house", "car", "cat", "bed", "chair", "table", "room", "kitchen", "school", 
                 "apple", "milk", "fish", "day"]

basics2_adjectives = ["happy", "tall", "tired", "beautiful", "big", "small", "cold", "green", "hungry", "kind"]

nouns_data = []
adj_data = []
tobe_data = []

for w in words:
    en_lower = w['en'].lower().strip()
    if en_lower in basics1_nouns:
        nouns_data.append(w)
    elif en_lower in basics2_adjectives:
        adj_data.append(w)
    else:
        tobe_data.append(w)

os.makedirs("data/A1/Basics1_Nouns", exist_ok=True)
os.makedirs("data/A1/Basics2_Adjectives", exist_ok=True)

with open("data/A1/Basics1_Nouns/words.json", "w", encoding="utf-8") as f:
    json.dump(nouns_data, f, ensure_ascii=False, indent=4)

with open("data/A1/Basics2_Adjectives/words.json", "w", encoding="utf-8") as f:
    json.dump(adj_data, f, ensure_ascii=False, indent=4)

with open("data/A1/Lesson1_ToBe/words.json", "w", encoding="utf-8") as f:
    json.dump(tobe_data, f, ensure_ascii=False, indent=4)

print(f"Split complete. Nouns: {len(nouns_data)}, Adjectives: {len(adj_data)}, Core: {len(tobe_data)}")
