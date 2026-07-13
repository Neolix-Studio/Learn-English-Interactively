# Curriculum Data Model

The learning curriculum is structured as a series of JSON files representing **Modules**, **Nodes**, and **Lessons**. This architecture underwent a massive refactor to centralize data and reduce file sizes.

## 1. File Structure
Curriculum data is stored in `data/A1/`:
```
data/A1/
├── Module_1_Hello_World/
│   ├── node1_ordering_a_drink.json
│   ├── node2_beverages.json
│   └── ...
├── Module_2_Introductions/
└── ...
```

## 2. Centralized Dictionaries
To prevent massive duplication and keep JSON sizes small, two central dictionaries are used globally by the `LessonPlayer`:

### `data/vocabulary.json`
A master JSON object mapping English vocabulary words to their Hungarian translations. 
*Example:* `{"coffee": "kávé", "apple": "alma"}`
This completely replaces the need for per-file `"dictionary"` objects.

### `src/assets/svgDictionary.json`
A master JSON object mapping string IDs (like `lemon`, `sugar`, `apple`) to their raw SVG string equivalents. This is imported synchronously by `ImageChoice.tsx` to render beautiful icons without bloating the curriculum JSONs.

## 3. Node Structure
A single `node*.json` file represents a node on the learning map. 
```json
{
  "id": "A1_M1_Node2",
  "title": "Beverages",
  "type": "lesson_node",
  "lessons": [
    {
      "id": "lesson_1",
      "introducedWords": ["lemon", "sugar", "apple"],
      "items": [
         // Exercise objects
      ]
    }
  ]
}
```

## 4. "New Word" Auto-Detection
We **do not** manually tag words with `"newWord": true` in the JSON anymore!

Instead, `LessonPlayer.tsx` automatically detects new words on the fly:
1. It reads the `introducedWords` array from the current lesson.
2. It parses the entire text of the current exercise item (the question, the answer, the options).
3. If any word in the exercise matches an `introducedWord`, it automatically triggers the "✨ Új szó / New Word" bubble UI and highlights the word in the `InteractiveSentence` component.

## 5. Exercise Items
Every exercise item inside a lesson's `items` array has a deterministic UUID (e.g., `"id": "item_8b8c5678"`). 

Supported Exercise Types include:
- `image_choice`: Select the correct image for a word (pulls from `svgDictionary`).
- `word_order`: Scrambled sentence builder.
- `fill_blanks`: Type or select the missing word.
- `interactive_sentence`: Tap to reveal translations.
- `dictation`: Listen and type.
- `true_false`: Read a statement and validate it.
- `phonics_*`: Specialized pronunciation and listening exercises.
