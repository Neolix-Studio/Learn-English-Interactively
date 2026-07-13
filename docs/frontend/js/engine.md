# `engine.js` (Dynamic Exercise Engine)

This file contains the core logic for dynamically generating lesson content on the fly. Instead of hardcoding 15 questions for every lesson, the `DynamicExerciseEngine` takes a small "vocabulary bank" (e.g., 5 words) and generates a structured, pedagogically sound sequence of exercises.

## Core Class: `DynamicExerciseEngine`

### `static generate(vocabBank)`
This is the main entry point. It takes an array of vocabulary objects and returns a 15-question array ready for the interactive UI.

**Input Format (`vocabBank`):**
```json
[
  { "en": "apple", "hu": "alma", "example": "I eat an apple." },
  { "en": "dog", "hu": "kutya", "example": "The dog barks." }
]
```

**Phases of Learning (The Duolingo Loop):**
1. **Phase 1: Introduction (Low Cognitive Load)**
   - Introduces words via `image_choice`.
   - Consolidates with `match_pairs`.
2. **Phase 2: Context & Translation (Medium Cognitive Load)**
   - Uses `true_false` and `word_order` to practice the words in sentence context.
   - Introduces `dictation` for listening skills.
3. **Phase 3: Production (High Cognitive Load)**
   - Requires the user to actively produce the language using `word_order` (Native -> Target) and `fill_blanks`.

### Exercise Generators
The class uses private static methods to build the specific question objects.

#### `_createImageChoice(targetWord, fullBank)`
Generates an image choice question. Uses the target word and picks 3 random distractors from the `fullBank`.

#### `_createMatchPairs(words)`
Takes a slice of words and creates a matching pairs exercise (pairing English and Hungarian).

#### `_createDictation(targetWord)`
Uses the `example` sentence for a listening exercise.

#### `_createWordOrder(targetWord, targetLanguage)`
Takes the `example` sentence, strips punctuation, and scrambles the words for the user to reconstruct.

#### `_createFillBlank(targetWord, fullBank)`
Replaces the target word in the `example` sentence with `___` and provides options including 3 distractors.

#### `_createTrueFalse(targetWord, fullBank)`
Has a 50% chance of matching a Hungarian word with its correct English translation, or a false distractor.

## Dependencies
- Does not have external dependencies.
- Output is consumed by `interactive.js`.
