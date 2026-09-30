<?php
return function($data) {
    $username = $data['username'] ?? '';
    $lang = $data['language'] ?? 'hu';

    if ($lang === 'sk') {
        return [
            'subject' => "Chýbaš nám, " . htmlspecialchars($username) . "!",
            'headerText' => "Vráť sa k učeniu",
            'bodyHtml' => "
                <p>Ahoj <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Všimli sme si, že si sa už pár dní neprihlásil/a do Lexipaws. Nedovoľ, aby tvoje doterajšie vedomosti vyšli nazmar!</p>
                <p>Vráť sa a sprav si jednu rýchlu lekciu ešte dnes.</p>
            ",
            'buttonText' => "Pokračovať v učení",
            'buttonLink' => lexipawsAppUrl('dashboard')
        ];
    } else {
        return [
            'subject' => "Lexi vár a következő leckével, " . htmlspecialchars($username) . "!",
            'headerText' => "A következő leckéd készen áll",
            'bodyHtml' => "
                <p>Szia <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Lexi már előkészítette a következő leckédet. Néhány perc gyakorlás, és máris több angol szót ismersz.</p>
                <p>Ott folytathatod, ahol abbahagytad.</p>
            ",
            'buttonText' => "Folytatom a tanulást",
            'buttonLink' => lexipawsAppUrl('dashboard')
        ];
    }
};
