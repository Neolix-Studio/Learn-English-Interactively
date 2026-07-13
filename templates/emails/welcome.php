<?php
return function($data) {
    $username = $data['username'] ?? '';
    $lang = $data['language'] ?? 'hu';

    if ($lang === 'sk') {
        return [
            'subject' => "Vitajte v Lexipaws!",
            'headerText' => "Úspešná registrácia",
            'bodyHtml' => "
                <p>Milý/á <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Sme veľmi radi, že si sa k nám pridal/a! S Lexipaws si teraz môžeš zábavne a interaktívne zlepšovať svoju angličtinu.</p>
                <p>Začni so svojou prvou lekciou ešte dnes a vybuduj si svoju sériu učenia (streak)!</p>
            ",
            'buttonText' => "Začať učiť sa!",
            'buttonLink' => "https://lexipaws.sk/"
        ];
    } else {
        return [
            'subject' => "Üdvözlünk a Lexipaws-nál!",
            'headerText' => "Sikeres regisztráció",
            'bodyHtml' => "
                <p>Kedves <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Nagyon örülünk, hogy csatlakoztál hozzánk! A Lexipaws segítségével mostantól szórakoztatóan és interaktívan fejlesztheted az angoltudásod.</p>
                <p>Kezdd el az első leckét még ma, és építsd fel a tanulási sorozatodat (streak)!</p>
            ",
            'buttonText' => "Irány a tanulás!",
            'buttonLink' => "https://lexipaws.hu/"
        ];
    }
};
