// js/data.js

const learningContent = {
    A1: {
        ToBe: {
            title: "Első lecke: A \"Lenni\" Ige (The Verb \"TO BE\")",
            explanation: "Az angol \"to be\" (lenni) ige az egyik legfontosabb és leggyakrabban használt ige az angol nyelvben. Jelen időben három alakja van: <strong>am, is, are</strong>. Használjuk állapotok, tulajdonságok és foglalkozások kifejezésére.",
            subsections: {
                explanation: {
                    title: "Magyarázat",
                    icon: "📚",
                    type: "explanation",
                    content: "Az angol \"to be\" (lenni) ige az egyik legfontosabb és leggyakrabban használt ige az angol nyelvben. Jelen időben három alakja van: <strong>am, is, are</strong>."
                },
                words: {
                    title: "Szavak",
                    icon: "📖",
                    type: "words",
                    items: [
                        { en: "I am", hu: "Én vagyok", example: "I am a student." },
                        { en: "You are", hu: "Te vagy", example: "You are my friend." },
                        { en: "He is", hu: "Ő (fiú) van", example: "He is tall." },
                        { en: "She is", hu: "Ő (lány) van", example: "She is a teacher." },
                        { en: "It is", hu: "Az/Ez van", example: "It is a cat." },
                        { en: "We are", hu: "Mi vagyunk", example: "We are happy." },
                        { en: "They are", hu: "Ők vannak", example: "They are at home." },
                        { en: "happy", hu: "boldog", example: "I am happy." },
                        { en: "tall", hu: "magas", example: "He is tall." },
                        { en: "student", hu: "diák", example: "She is a student." },
                        { en: "teacher", hu: "tanár", example: "He is a teacher." },
                        { en: "tired", hu: "fáradt", example: "We are tired." }
                    ]
                },
                fillBlanks: {
                    title: "Lyukas mondatok",
                    icon: "✏️",
                    type: "fill_blanks",
                    items: [
                        { sentence: "I ___ a student.", answer: "am", hint: "(én vagyok)" },
                        { sentence: "She ___ very tall.", answer: "is", hint: "(ő magas)" },
                        { sentence: "We ___ happy today.", answer: "are", hint: "(mi boldogak vagyunk)" },
                        { sentence: "He ___ my brother.", answer: "is", hint: "(ő a testvérem)" },
                        { sentence: "They ___ at school.", answer: "are", hint: "(ők iskolában vannak)" },
                        { sentence: "You ___ a good friend.", answer: "are", hint: "(te jó barát vagy)" },
                        { sentence: "It ___ a beautiful day.", answer: "is", hint: "(szép nap van)" },
                        { sentence: "I ___ not tired.", answer: "am", hint: "(nem vagyok fáradt)" }
                    ]
                },
                wordOrder: {
                    title: "Szórendezés",
                    icon: "🔀",
                    type: "word_order",
                    items: [
                        { scrambled: ["am", "I", "student", "a"], correct: "I am a student.", hu: "Én diák vagyok." },
                        { scrambled: ["is", "She", "teacher", "a"], correct: "She is a teacher.", hu: "Ő tanár." },
                        { scrambled: ["are", "happy", "We"], correct: "We are happy.", hu: "Mi boldogak vagyunk." },
                        { scrambled: ["is", "tall", "He", "very"], correct: "He is very tall.", hu: "Ő nagyon magas." },
                        { scrambled: ["are", "at", "They", "home"], correct: "They are at home.", hu: "Ők otthon vannak." },
                        { scrambled: ["is", "It", "cold", "today"], correct: "It is cold today.", hu: "Ma hideg van." }
                    ]
                },
                trueFalse: {
                    title: "Igaz vagy Hamis",
                    icon: "✅",
                    type: "true_false",
                    items: [
                        { question: "\"I am\" – Ez helyes: \"Én vagyok\".", answer: true, explanation: "Helyes! Az \"I am\" valóban azt jelenti: \"Én vagyok\"." },
                        { question: "\"She are happy.\" – Ez helyes angol mondat.", answer: false, explanation: "Helytelen! A helyes forma: \"She is happy.\" – Egyes szám harmadik személlyel \"is\"-t használunk." },
                        { question: "\"They is at home.\" – Ez helyes angol mondat.", answer: false, explanation: "Helytelen! A helyes forma: \"They are at home.\" – Többes számban \"are\"-t használunk." },
                        { question: "\"We are students.\" – Ez helyes angol mondat.", answer: true, explanation: "Helyes! Többes szám első személlyel az \"are\"-t használjuk." },
                        { question: "Az \"is\" alakot az \"I\" (én) névmással használjuk.", answer: false, explanation: "Helytelen! Az \"I\" névmással az \"am\" alakot használjuk: \"I am\"." },
                        { question: "\"You is tired.\" – Ez helyes angol mondat.", answer: false, explanation: "Helytelen! A helyes forma: \"You are tired.\"" },
                        { question: "A \"to be\" igének jelen időben három alakja van: am, is, are.", answer: true, explanation: "Helyes! Ez a három alak: I am, he/she/it is, you/we/they are." }
                    ]
                },
                sectionExam: {
                    title: "Fejezet vizsga",
                    icon: "🏆",
                    type: "section_exam",
                    items: [
                        { question: "I ___ a student.", type: "fill", answer: "am" },
                        { question: "\"He are happy\" – ez helyes?", type: "tf", answer: false, explanation: "A helyes: \"He is happy.\"" },
                        { question: "She ___ my sister.", type: "fill", answer: "is" },
                        { question: "Rendezd: \"are / We / tired\"", type: "order", correct: "We are tired.", scrambled: ["are", "We", "tired"] },
                        { question: "They ___ at school.", type: "fill", answer: "are" },
                        { question: "\"It am cold\" – ez helyes mondat?", type: "tf", answer: false, explanation: "A helyes: \"It is cold.\"" },
                        { question: "You ___ very kind.", type: "fill", answer: "are" },
                        { question: "Rendezd: \"is / He / tall / very\"", type: "order", correct: "He is very tall.", scrambled: ["is", "He", "tall", "very"] },
                        { question: "\"We are happy\" – ez helyes?", type: "tf", answer: true, explanation: "Helyes! Többes szám első személlyel az \"are\"-t használjuk." },
                        { question: "It ___ a beautiful day.", type: "fill", answer: "is" }
                    ]
                }
            }
        }
    },
    A2: {
        ToBe: {
            title: "Első lecke: A \"Lenni\" Ige (The Verb \"TO BE\")",
            explanation: "Az A2 szinten a \"to be\" ige haladó használatát tanuljuk meg, beleértve a múlt idejű alakokat (was/were) és a tagadó formákat.",
            subsections: {
                explanation: {
                    title: "Magyarázat",
                    icon: "📚",
                    type: "explanation",
                    content: "Az A2 szinten a \"to be\" ige haladó használatát tanuljuk meg, beleértve a múlt idejű alakokat (<strong>was/were</strong>) és a tagadó formákat."
                },
                words: {
                    title: "Szavak",
                    icon: "📖",
                    type: "words",
                    items: []
                },
                fillBlanks: {
                    title: "Lyukas mondatok",
                    icon: "✏️",
                    type: "fill_blanks",
                    items: []
                },
                wordOrder: {
                    title: "Szórendezés",
                    icon: "🔀",
                    type: "word_order",
                    items: []
                },
                trueFalse: {
                    title: "Igaz vagy Hamis",
                    icon: "✅",
                    type: "true_false",
                    items: []
                },
                sectionExam: {
                    title: "Fejezet vizsga",
                    icon: "🏆",
                    type: "section_exam",
                    items: []
                }
            }
        }
    }
};
