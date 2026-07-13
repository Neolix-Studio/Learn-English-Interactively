import json
import os

svg_coffee = "<svg viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='25' y='30' width='50' height='45' rx='10' fill='#a0522d'/><path d='M75 40C85 40 85 60 75 60' stroke='#a0522d' stroke-width='8' stroke-linecap='round'/><path d='M35 15C40 20 30 25 35 30' stroke='#888' stroke-width='3' stroke-linecap='round'/><path d='M50 15C55 20 45 25 50 30' stroke='#888' stroke-width='3' stroke-linecap='round'/><path d='M65 15C70 20 60 25 65 30' stroke='#888' stroke-width='3' stroke-linecap='round'/></svg>"
svg_tea = "<svg viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='25' y='30' width='50' height='45' rx='10' fill='#8fbc8f'/><path d='M75 40C85 40 85 60 75 60' stroke='#8fbc8f' stroke-width='8' stroke-linecap='round'/><path d='M50 30V15' stroke='#444' stroke-width='2'/><rect x='45' y='5' width='10' height='10' fill='#fff' stroke='#444' stroke-width='2'/></svg>"
svg_milk = "<svg viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='30' y='30' width='40' height='60' rx='2' fill='#f5f5f5' stroke='#ccc' stroke-width='4'/><path d='M30 30 L 50 10 L 70 30 Z' fill='#e0e0e0' stroke='#ccc' stroke-width='4'/><text x='50' y='60' font-size='12' fill='#333' text-anchor='middle' font-weight='bold'>MILK</text></svg>"
svg_water = "<svg viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='30' y='20' width='40' height='60' rx='5' fill='#e0f7fa' stroke='#4dd0e1' stroke-width='4'/><path d='M30 50 Q 50 60 70 50 L 70 75 Q 50 85 30 75 Z' fill='#4dd0e1'/></svg>"

def create_image_choice(word_hu, correct_en, options_tuple):
    # options_tuple is a list of (id, text, svg)
    opts = []
    for (id_val, text_val, svg_val) in options_tuple:
        opts.append({
            "id": id_val,
            "text": text_val,
            "correct": text_val == correct_en,
            "svg": svg_val
        })
    return {
        "type": "image_choice",
        "word": word_hu,
        "correctAnswer": correct_en,
        "options": opts,
        "newWord": True
    }

def create_word_order(hu, en, scrambled, new_word=False):
    return {
        "type": "word_order",
        "newWord": new_word,
        "hu": hu,
        "correctAnswer": en,
        "scrambledWords": scrambled
    }

def create_fill_blanks(hu, en_sentence, answer, options, new_word=False):
    return {
        "type": "fill_blanks",
        "newWord": new_word,
        "hu": hu,
        "sentence": en_sentence,
        "answer": answer,
        "options": options
    }


node = {
    "title": "Első találkozások",
    "type": "multi_level_node",
    "targetWords": ["coffee", "tea", "please", "thanks", "milk", "water", "yes", "no", "hello", "goodbye", "and"],
    "dictionary": {
        "coffee": "kávé",
        "tea": "tea",
        "please": "kérem",
        "thanks": "köszönöm",
        "milk": "tej",
        "water": "víz",
        "yes": "igen",
        "no": "nem",
        "hello": "szia",
        "goodbye": "viszlát",
        "and": "és"
    },
    "lessons": []
}

options_full = [
    ("coffee", "coffee", svg_coffee),
    ("tea", "tea", svg_tea),
    ("milk", "milk", svg_milk),
    ("water", "water", svg_water)
]

# LESSON 1: coffee, tea, please, thanks
lesson1 = {
    "id": "lesson_1",
    "title": "Part 1/4",
    "introducedWords": ["coffee", "tea", "please", "thanks"],
    "items": [
        create_image_choice("kávé", "coffee", options_full),
        create_image_choice("tea", "tea", options_full),
        create_word_order("Kávé, kérem.", "Coffee, please.", ["Coffee,", "tea,", "hello", "please.", "or"], True),
        create_word_order("Tea, kérem.", "Tea, please.", ["Coffee", "Tea,", "please.", "hello", "thanks."], False),
        create_fill_blanks("Kérem", "Coffee, ____.", "please", ["please", "thanks", "tea", "coffee"], True),
        create_word_order("Köszönöm.", "Thanks.", ["Coffee,", "Tea", "please", "Thanks."], True),
        create_fill_blanks("Kávé, köszönöm.", "____, thanks.", "Coffee", ["Coffee", "Tea", "please", "water"], False),
        create_word_order("Tea, köszönöm.", "Tea, thanks.", ["Thanks.", "Coffee,", "Tea,", "please", "and"], False),
        create_fill_blanks("Tea, kérem.", "____, please.", "Tea", ["Coffee", "Tea", "thanks", "water"], False),
        create_word_order("Kávé, kérem. Köszönöm.", "Coffee, please. Thanks.", ["Coffee,", "Tea", "please.", "Thanks.", "hello"], False),
    ]
}

# LESSON 2: milk, water, yes, no
lesson2 = {
    "id": "lesson_2",
    "title": "Part 2/4",
    "introducedWords": ["milk", "water", "yes", "no"],
    "items": [
        create_image_choice("tej", "milk", options_full),
        create_image_choice("víz", "water", options_full),
        create_word_order("Igen.", "Yes.", ["No.", "Yes.", "Please", "Thanks", "Tea"], True),
        create_word_order("Nem.", "No.", ["Yes.", "No.", "Coffee", "Thanks.", "Water"], True),
        create_word_order("Igen, kérem.", "Yes, please.", ["No,", "Yes,", "please.", "thanks", "coffee"], False),
        create_word_order("Nem, köszönöm.", "No, thanks.", ["Yes,", "No,", "thanks.", "please", "water"], False),
        create_fill_blanks("Víz, kérem.", "____, please.", "Water", ["Milk", "Water", "Coffee", "Tea"], False),
        create_fill_blanks("Tej, köszönöm.", "____, thanks.", "Milk", ["Milk", "Water", "Coffee", "Yes"], False),
        create_word_order("Igen, víz kérem.", "Yes, water please.", ["Yes,", "No,", "water", "milk", "please."], False),
        create_word_order("Nem, tej, köszönöm.", "No, milk, thanks.", ["No,", "Yes,", "milk,", "thanks.", "water,"], False),
    ]
}

# LESSON 3: hello, goodbye, and
lesson3 = {
    "id": "lesson_3",
    "title": "Part 3/4",
    "introducedWords": ["hello", "goodbye", "and"],
    "items": [
        create_word_order("Szia.", "Hello.", ["Goodbye.", "Hello.", "Yes.", "No."], True),
        create_word_order("Viszlát.", "Goodbye.", ["Goodbye.", "Hello.", "Thanks.", "Please."], True),
        create_word_order("Szia, kávé kérem.", "Hello, coffee please.", ["Hello,", "Goodbye,", "coffee", "tea", "please."], False),
        create_word_order("Kávé és tea.", "Coffee and tea.", ["Coffee", "water", "and", "hello", "tea."], True),
        create_fill_blanks("Víz és tej.", "Water ____ milk.", "and", ["and", "yes", "no", "hello"], False),
        create_word_order("Szia, víz és kávé, kérem.", "Hello, water and coffee, please.", ["Hello,", "water", "and", "coffee,", "please."], False),
        create_word_order("Viszlát, köszönöm.", "Goodbye, thanks.", ["Goodbye,", "Hello,", "thanks.", "please."], False),
        create_fill_blanks("Tej és víz, kérem.", "Milk and ____, please.", "water", ["water", "coffee", "tea", "hello"], False),
        create_word_order("Szia, tea és tej, kérem.", "Hello, tea and milk, please.", ["Hello,", "tea", "and", "milk,", "please."], False),
        create_word_order("Igen, kávé és víz, köszönöm.", "Yes, coffee and water, thanks.", ["Yes,", "No,", "coffee", "and", "water,", "thanks."], False),
    ]
}

# LESSON 4: Boss Level (no new words, funny combos)
lesson4 = {
    "id": "lesson_4",
    "title": "Part 4/4 - Boss Level",
    "introducedWords": [],
    "items": [
        create_word_order("Kávé és tej, kérem.", "Coffee and milk, please.", ["Coffee", "and", "milk,", "please.", "water"], False),
        create_fill_blanks("Nem, kávé és víz, köszönöm.", "No, coffee and water, ____.", "thanks", ["thanks", "please", "yes", "no"], False),
        create_word_order("Szia, tej és víz, kérem.", "Hello, milk and water, please.", ["Hello,", "milk", "and", "water,", "please.", "thanks"], False),
        create_word_order("Viszlát, kávé és tea.", "Goodbye, coffee and tea.", ["Goodbye,", "coffee", "and", "tea.", "hello"], False),
        create_word_order("Igen, tea és kávé kérem.", "Yes, tea and coffee please.", ["Yes,", "tea", "and", "coffee", "please.", "milk"], False),
        create_word_order("Nem, víz, köszönöm. Viszlát.", "No, water, thanks. Goodbye.", ["No,", "water,", "thanks.", "Goodbye.", "Yes,"], False),
        create_word_order("Szia, kávé és víz, kérem.", "Hello, coffee and water, please.", ["Hello,", "coffee", "and", "water,", "please."], False),
        create_word_order("Kávé tej és víz, köszönöm.", "Coffee milk and water, thanks.", ["Coffee", "milk", "and", "water,", "thanks.", "hello"], False),
        create_word_order("Szia! Igen, tea kérem.", "Hello! Yes, tea please.", ["Hello!", "Yes,", "tea", "please.", "No,"], False),
        create_word_order("Kávé és tea és tej és víz, kérem!", "Coffee and tea and milk and water, please!", ["Coffee", "and", "tea", "and", "milk", "and", "water,", "please!"], False),
    ]
}

node["lessons"] = [lesson1, lesson2, lesson3, lesson4]

output_path = "/Users/ladislav/Documents/Documents - Ladislav’s MacBook Pro/Neolix Studio/Learn English Website with NeolixStudio/data/A1/Module_1_Hello_World/node1_ordering_a_drink.json"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(node, f, indent=4, ensure_ascii=False)

print(f"Generated {output_path} successfully!")
