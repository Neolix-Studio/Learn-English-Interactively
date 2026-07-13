# `data.js` (Curriculum Structure)

This file serves as the static configuration for the entire learning curriculum. It defines the tree structure of Levels -> Sections -> Subsections.

## Structure Example
```javascript
const learningContent = {
    "A1": {
        "Basics1_Nouns": {
            title: "Alapok 1 (Főnevek)",
            icon: "fas fa-apple-alt",
            color: "var(--color-primary)",
            subsections: {
                "explanation": { type: "explanation", title: "Nyelvtan", file: "data/A1/Basics1_Nouns/explanation.html" },
                "words": { type: "words", title: "Szavak", file: "data/A1/Basics1_Nouns/words.json" },
                // ...
            }
        },
        // ...
    }
};
```

## How it is used
- **`dashboard.js`** reads this object to generate the Sidebar (listing A1, A2, etc.) and the Roadmap (listing the specific nodes inside a section).
- When a user clicks a node on the map, the application looks up the `file` attribute (e.g., `data/A1/Basics1_Nouns/words.json`) and fetches that JSON. The JSON is then passed to `interactive.js` (and potentially `engine.js` if it's dynamic).
