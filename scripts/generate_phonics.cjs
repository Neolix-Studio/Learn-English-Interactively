const fs = require('fs');
const path = require('path');

const groups = [
    {
        id: "vowels_short_long_i",
        characters: ["ɪ", "i"],
        levels: [
            [["ship", "sheep"], ["slip", "sleep"]],
            [["dip", "deep"], ["bit", "beat"]],
            [["hit", "heat"], ["fit", "feet"]],
            [["lip", "leap"], ["sit", "seat"]],
            [["pitch", "peach"], ["rich", "reach"]]
        ]
    },
    {
        id: "vowels_a_e",
        characters: ["æ", "ɛ"],
        levels: [
            [["bat", "bet"], ["pan", "pen"]],
            [["sand", "send"], ["bad", "bed"]],
            [["mat", "met"], ["pat", "pet"]],
            [["sad", "said"], ["tan", "ten"]],
            [["land", "lend"], ["man", "men"]]
        ]
    },
    {
        id: "vowels_u_o",
        characters: ["ʌ", "ɑ"],
        levels: [
            [["but", "hot"], ["cup", "cop"]],
            [["duck", "dock"], ["nut", "not"]],
            [["hut", "hot"], ["rub", "rob"]],
            [["cut", "cot"], ["bug", "bog"]],
            [["sung", "song"], ["mutt", "mot"]]
        ]
    },
    {
        id: "vowels_oo_oo",
        characters: ["ʊ", "u"],
        levels: [
            [["pull", "pool"], ["full", "fool"]],
            [["look", "luke"], ["wood", "wooed"]],
            [["soot", "suit"], ["hood", "who'd"]],
            [["stood", "stewed"], ["could", "cooed"]],
            [["should", "shoed"], ["book", "boo"]]
        ]
    },
    {
        id: "vowels_schwa_r",
        characters: ["ə", "ɚ"],
        levels: [
            [["sofa", "surfer"], ["comma", "corner"]],
            [["pasta", "pastor"], ["panda", "ponder"]],
            [["ahead", "bird"], ["about", "dirt"]],
            [["upon", "turn"], ["away", "word"]],
            [["again", "girl"], ["china", "chirp"]]
        ]
    },
    {
        id: "vowels_o_ow",
        characters: ["oʊ", "aʊ"],
        levels: [
            [["no", "now"], ["bow", "bow"]],
            [["sow", "sow"], ["row", "row"]],
            [["know", "now"], ["boat", "bout"]],
            [["coat", "cow"], ["float", "flout"]],
            [["goat", "gout"], ["moan", "mound"]]
        ]
    },
    {
        id: "vowels_a_i_oy",
        characters: ["eɪ", "aɪ", "ɔɪ"],
        levels: [
            [["say", "time", "boy"], ["mate", "might", "moit"]],
            [["late", "light", "loit"], ["pain", "pine", "poin"]],
            [["tail", "tile", "toil"], ["bait", "bite", "boit"]],
            [["sale", "aisle", "soil"], ["main", "mine", "moin"]],
            [["fail", "file", "foil"], ["wait", "white", "woit"]]
        ]
    },
    {
        id: "cons_s_z",
        characters: ["s", "z"],
        levels: [
            [["sip", "zip"], ["sap", "zap"]],
            [["sink", "zinc"], ["seal", "zeal"]],
            [["bus", "buzz"], ["ice", "eyes"]],
            [["face", "phase"], ["racer", "razor"]],
            [["lacy", "lazy"], ["fleece", "fleas"]]
        ]
    },
    {
        id: "cons_th_th",
        characters: ["θ", "ð"],
        levels: [
            [["thigh", "thy"], ["ether", "either"]],
            [["teeth", "teethe"], ["mouth", "mouth"]],
            [["wreath", "wreathe"], ["sheath", "sheathe"]],
            [["bath", "bathe"], ["cloth", "clothe"]],
            [["loath", "loathe"], ["sooth", "soothe"]]
        ]
    },
    {
        id: "cons_th_s_f",
        characters: ["θ", "s", "f"],
        levels: [
            [["think", "sink", "fink"], ["thick", "sick", "fick"]],
            [["thought", "sought", "fought"], ["thin", "sin", "fin"]],
            [["math", "mass", "maf"], ["path", "pass", "paf"]],
            [["theme", "seem", "feem"], ["thumb", "some", "fum"]],
            [["thaw", "saw", "faw"], ["third", "surd", "furd"]]
        ]
    },
    {
        id: "cons_th_d_z",
        characters: ["ð", "d", "z"],
        levels: [
            [["then", "den", "zen"], ["they", "day", "zay"]],
            [["there", "dare", "zare"], ["those", "doze", "zoze"]],
            [["breathe", "breed", "breeze"], ["teethe", "teed", "tease"]],
            [["clothe", "code", "close"], ["bathe", "bade", "bays"]],
            [["loathe", "load", "lows"], ["soothe", "sued", "sues"]]
        ]
    },
    {
        id: "cons_v_w",
        characters: ["v", "w"],
        levels: [
            [["vet", "wet"], ["vine", "wine"]],
            [["veil", "wail"], ["vest", "west"]],
            [["vary", "wary"], ["vow", "wow"]],
            [["veal", "weal"], ["vent", "went"]],
            [["verse", "worse"], ["viper", "wiper"]]
        ]
    },
    {
        id: "cons_ch_j",
        characters: ["tʃ", "dʒ"],
        levels: [
            [["chair", "job"], ["choke", "joke"]],
            [["rich", "ridge"], ["chin", "gin"]],
            [["cheer", "jeer"], ["chest", "jest"]],
            [["chain", "jane"], ["cherry", "jerry"]],
            [["chunk", "junk"], ["chug", "jug"]]
        ]
    },
    {
        id: "cons_sh_zh",
        characters: ["ʃ", "ʒ"],
        levels: [
            [["shoe", "measure"], ["dilution", "delusion"]],
            [["pressure", "pleasure"], ["fission", "vision"]],
            [["glacier", "glazier"], ["assure", "azure"]],
            [["ruche", "rouge"], ["mesh", "measure"]],
            [["bash", "beige"], ["crash", "massage"]]
        ]
    },
    {
        id: "cons_m_n_ng",
        characters: ["m", "n", "ŋ"],
        levels: [
            [["sum", "sun", "sung"], ["ram", "ran", "rang"]],
            [["sim", "sin", "sing"], ["bam", "ban", "bang"]],
            [["clam", "clan", "clang"], ["rum", "run", "rung"]],
            [["rim", "rin", "ring"], ["dam", "dan", "dang"]],
            [["plum", "plun", "plung"], ["grim", "grin", "gring"]]
        ]
    },
    {
        id: "cons_p_b",
        characters: ["p", "b"],
        levels: [
            [["pig", "big"], ["pat", "bat"]],
            [["peak", "beak"], ["pin", "bin"]],
            [["pack", "back"], ["pear", "bear"]],
            [["pie", "buy"], ["pug", "bug"]],
            [["pull", "bull"], ["push", "bush"]]
        ]
    },
    {
        id: "cons_t_d",
        characters: ["t", "d"],
        levels: [
            [["time", "dime"], ["tie", "die"]],
            [["tear", "dear"], ["town", "down"]],
            [["ten", "den"], ["toe", "doe"]],
            [["toll", "doll"], ["to", "do"]],
            [["tank", "dank"], ["tart", "dart"]]
        ]
    },
    {
        id: "cons_k_g",
        characters: ["k", "g"],
        levels: [
            [["key", "go"], ["curl", "girl"]],
            [["coat", "goat"], ["cold", "gold"]],
            [["cave", "gave"], ["came", "game"]],
            [["cap", "gap"], ["class", "glass"]],
            [["crow", "grow"], ["could", "good"]]
        ]
    },
    {
        id: "cons_l_r",
        characters: ["l", "ɹ"],
        levels: [
            [["light", "right"], ["lip", "rip"]],
            [["lock", "rock"], ["lead", "read"]],
            [["long", "wrong"], ["lamp", "ramp"]],
            [["lack", "rack"], ["load", "road"]],
            [["low", "row"], ["late", "rate"]]
        ]
    },
    {
        id: "cons_h_j_f",
        characters: ["h", "j", "f"],
        levels: [
            [["home", "you", "fish"], ["hat", "yet", "fat"]],
            [["heat", "yeet", "feet"], ["hill", "yill", "fill"]],
            [["hair", "yeah", "fair"], ["hall", "y'all", "fall"]],
            [["horn", "yorn", "forn"], ["ham", "yam", "fam"]],
            [["hut", "yut", "fut"], ["hope", "yope", "fope"]]
        ]
    }
];

// Helper to generate the JSON content for a group
function generateGroupJSON(group) {
    const lessons = [];

    group.levels.forEach((levelWordSets, levelIndex) => {
        let items = [];
        let speakItems = [];
        
        levelWordSets.forEach((wordSet) => {
            // Generate ListenChoose for EVERY word in the set
            wordSet.forEach((correctWord, correctWordIndex) => {
                items.push({
                    type: "phonics_listen_choose",
                    instruction: "Mit hallasz?",
                    audioUrl: null,
                    options: wordSet.map((w, idx) => ({
                        id: `opt_${idx}`,
                        text: w,
                        correct: idx === correctWordIndex
                    }))
                });

                // Collect Speak for EVERY word in the set to pick from later
                speakItems.push({
                    type: "phonics_speak",
                    instruction: "Mondd ki ezt a szót!",
                    word: correctWord,
                    audioUrl: null,
                    targetLang: "en-US"
                });
            });

            // Generate Compare (1 per wordSet)
            // 50% chance same, 50% chance different
            const isSame = Math.random() > 0.5;
            let word1 = wordSet[0];
            let word2 = isSame ? wordSet[0] : wordSet[1]; // Always compare against the second word if different
            
            items.push({
                type: "phonics_compare",
                instruction: "Hallgasd meg és válaszolj!",
                questionText: "Melyik szavakat hallod?",
                audioUrl1: null,
                audioUrl2: null,
                word1: word1,
                word2: word2,
                isSame: isSame
            });
        });

        // Generate 1 PhonicsMatch for ALL words in this level (usually 4 to 6 words)
        const allWords = levelWordSets.flat();
        items.push({
            type: "phonics_match",
            instruction: "Válaszd ki az összetartozó párokat!",
            pairs: allWords.map(w => ({ text: w, audioUrl: null }))
        });

        // Shuffle the items
        items.sort(() => Math.random() - 0.5);

        // Pick exactly 2 random speak items
        speakItems.sort(() => Math.random() - 0.5);
        const selectedSpeakItems = speakItems.slice(0, 2);

        // Append speak items at the end
        items = [...items, ...selectedSpeakItems];

        lessons.push({
            id: `${group.id}_level_${levelIndex + 1}`,
            title: `Szint ${levelIndex + 1}`,
            items: items
        });
    });

    return {
        id: group.id,
        type: "character_lesson",
        title: group.id.replace(/_/g, " ").toUpperCase(),
        characters: group.characters,
        lessons: lessons
    };
}

const targetDir = path.join(__dirname, '../public/data/characters');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

groups.forEach(group => {
    const data = generateGroupJSON(group);
    const filePath = path.join(targetDir, `${group.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Generated ${filePath}`);
});

console.log("Done generating all 20 JSON files.");
