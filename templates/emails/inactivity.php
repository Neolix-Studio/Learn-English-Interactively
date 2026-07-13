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
            'buttonLink' => lexipawsAppUrl()
        ];
    } else {
        return [
            'subject' => "Hiányzol nekünk, " . htmlspecialchars($username) . "!",
            'headerText' => "Térj vissza a tanuláshoz",
            'bodyHtml' => "
                <p>Szia <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Észrevettük, hogy már pár napja nem léptél be a Lexipaws-ba. Ne hagyd, hogy az eddig megszerzett tudásod elvesszen!</p>
                <p>Gyere vissza, és csinálj meg egy gyors leckét még ma.</p>
            ",
            'buttonText' => "Folytatom a tanulást",
            'buttonLink' => lexipawsAppUrl()
        ];
    }
};
