
export interface VocabWord {
    en: string;
    hu: string;
    example?: string;
    imageUrl?: string;
}

export type ExerciseType = "image_choice" | "match_pairs" | "dictation" | "word_order" | "fill_blanks" | "true_false";

export interface QuestionData {
    type: ExerciseType | string;
    [key: string]: any;
}

export class DynamicExerciseEngine {

    static generate(vocabBank: VocabWord[]): QuestionData[] {
        if (!vocabBank || vocabBank.length === 0) return [];

        let sessionWords = this._shuffleArray([...vocabBank]);
        if (sessionWords.length < 3) {
            sessionWords = [...sessionWords, ...sessionWords, ...sessionWords].slice(0, 3);
        }

        const questions: QuestionData[] = [];

        questions.push(this._createImageChoice(sessionWords[0], vocabBank));
        if (sessionWords.length > 1) questions.push(this._createImageChoice(sessionWords[1], vocabBank));
        if (sessionWords.length > 2) questions.push(this._createImageChoice(sessionWords[2], vocabBank));

        questions.push(this._createMatchPairs(sessionWords.slice(0, 4)));

        if (sessionWords[0].example) {
            questions.push(this._createTrueFalse(sessionWords[0], vocabBank));
        }
        if (sessionWords.length > 1 && sessionWords[1].example) {
            questions.push(this._createWordOrder(sessionWords[1]));
        }

        if (sessionWords.length > 2 && sessionWords[2].example) {
            questions.push(this._createDictation(sessionWords[2]));
        }

        if (sessionWords.length > 3) {
            questions.push(this._createImageChoice(sessionWords[3], vocabBank));
        }

        questions.push(this._createWordOrder(sessionWords[0]));
        if (sessionWords.length > 1) {
            questions.push(this._createWordOrder(sessionWords[1]));
        }

        if (sessionWords.length > 2) {
            questions.push(this._createFillBlank(sessionWords[2], vocabBank));
        }
        if (sessionWords.length > 3) {
            questions.push(this._createFillBlank(sessionWords[3], vocabBank));
        }

        if (sessionWords.length > 4) {
             questions.push(this._createDictation(sessionWords[4]));
             questions.push(this._createWordOrder(sessionWords[4]));
        }

        return questions;
    }

    static _createImageChoice(targetWord: VocabWord, fullBank: VocabWord[]): QuestionData {
        let distractors = this._shuffleArray(fullBank.filter(w => w.en !== targetWord.en)).slice(0, 3);
        while (distractors.length < 3) {
            distractors.push({ en: "dummy" + distractors.length, hu: "dummy" });
        }

        const options = [targetWord, ...distractors].map(w => ({
            id: w.en,
            text: w.en,
            correct: w.en === targetWord.en
        }));

        return {
            type: "image_choice",
            word: targetWord.hu,
            correctAnswer: targetWord.en,
            options: this._shuffleArray(options)
        };
    }

    static _createMatchPairs(words: VocabWord[]): QuestionData {
        const pairs = words.map(w => ({ en: w.en, hu: w.hu }));
        return {
            type: "match_pairs",
            pairs: pairs
        };
    }

    static _createDictation(targetWord: VocabWord): QuestionData {
        const sentence = targetWord.example || targetWord.en;
        return {
            type: "dictation",
            sentence: sentence,
            correctAnswer: sentence
        };
    }

    static _createWordOrder(targetWord: VocabWord): QuestionData {
        const sentence = targetWord.example || targetWord.en;
        let cleanSentence = sentence.replace(/[.,!?]/g, '').trim();
        let words = cleanSentence.split(' ');

        let scrambled = this._shuffleArray([...words]);

        return {
            type: "word_order",
            hu: `Rakd sorba a szavakat, hogy megkapd ezt a mondatot (tartalmazza: ${targetWord.hu})`,
            correctAnswer: cleanSentence,
            scrambledWords: scrambled
        };
    }

    static _createFillBlank(targetWord: VocabWord, fullBank: VocabWord[]): QuestionData {
        const sentence = targetWord.example || `This is a ${targetWord.en}.`;
        const regex = new RegExp(targetWord.en, "i");
        let questionSentence = sentence.replace(regex, "___");
        if (questionSentence === sentence) {
            questionSentence = `The word for '${targetWord.hu}' is ___`;
        }

        let distractors = this._shuffleArray(fullBank.filter(w => w.en !== targetWord.en)).slice(0, 3).map(w => w.en);

        return {
            type: "fill_blanks",
            hu: "Egészítsd ki a mondatot!",
            sentence: questionSentence,
            answer: targetWord.en,
            opts: this._shuffleArray([targetWord.en, ...distractors])
        };
    }

    static _createTrueFalse(targetWord: VocabWord, fullBank: VocabWord[]): QuestionData {
        const isTrue = Math.random() > 0.5;
        let statementWord = targetWord.en;

        if (!isTrue) {
            let distractor = fullBank.find(w => w.en !== targetWord.en);
            if (distractor) statementWord = distractor.en;
        }

        return {
            type: "true_false",
            instruction: "Igaz vagy Hamis?",
            statement: statementWord,
            translation: targetWord.hu,
            isTrue: isTrue,
            answer: isTrue
        };
    }

    static _shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
