export interface CharacterItem {
  id: string;
  ipa: string;
  example: string;
}

export const charactersData = {
  vowels: [
    { id: 'v1', ipa: 'ɑ', example: 'hot' },
    { id: 'v2', ipa: 'æ', example: 'cat' },
    { id: 'v3', ipa: 'ʌ', example: 'but' },
    { id: 'v4', ipa: 'ɛ', example: 'bed' },
    { id: 'v5', ipa: 'eɪ', example: 'say' },
    { id: 'v6', ipa: 'ɚ', example: 'bird' },
    { id: 'v7', ipa: 'ɪ', example: 'ship' },
    { id: 'v8', ipa: 'i', example: 'sheep' },
    { id: 'v9', ipa: 'ə', example: 'about' },
    { id: 'v10', ipa: 'oʊ', example: 'boat' },
    { id: 'v11', ipa: 'ʊ', example: 'foot' },
    { id: 'v12', ipa: 'u', example: 'food' },
    { id: 'v13', ipa: 'aʊ', example: 'cow' },
    { id: 'v14', ipa: 'aɪ', example: 'time' },
    { id: 'v15', ipa: 'ɔɪ', example: 'boy' }
  ],
  consonants: [
    { id: 'c1', ipa: 'b', example: 'book' },
    { id: 'c2', ipa: 'tʃ', example: 'chair' },
    { id: 'c3', ipa: 'd', example: 'day' },
    { id: 'c4', ipa: 'f', example: 'fish' },
    { id: 'c5', ipa: 'g', example: 'go' },
    { id: 'c6', ipa: 'h', example: 'home' },
    { id: 'c7', ipa: 'dʒ', example: 'job' },
    { id: 'c8', ipa: 'k', example: 'key' },
    { id: 'c9', ipa: 'l', example: 'lion' },
    { id: 'c10', ipa: 'm', example: 'moon' },
    { id: 'c11', ipa: 'n', example: 'nose' },
    { id: 'c12', ipa: 'ŋ', example: 'sing' },
    { id: 'c13', ipa: 'p', example: 'pig' },
    { id: 'c14', ipa: 'ɹ', example: 'red' },
    { id: 'c15', ipa: 's', example: 'see' },
    { id: 'c16', ipa: 'ʒ', example: 'measure' },
    { id: 'c17', ipa: 'ʃ', example: 'shoe' },
    { id: 'c18', ipa: 't', example: 'time' },
    { id: 'c19', ipa: 'ð', example: 'then' },
    { id: 'c20', ipa: 'θ', example: 'think' },
    { id: 'c21', ipa: 'v', example: 'very' },
    { id: 'c22', ipa: 'w', example: 'water' },
    { id: 'c23', ipa: 'j', example: 'you' },
    { id: 'c24', ipa: 'z', example: 'zoo' }
  ]
};
