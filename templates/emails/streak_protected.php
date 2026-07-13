<?php
return function($data) {
    $username = $data['username'] ?? '';
    $currentStreak = $data['currentStreak'] ?? 0;
    $lang = $data['language'] ?? 'hu';

    if ($lang === 'sk') {
        return [
            'subject' => "Zachránili sme tvoju sériu, " . htmlspecialchars($username) . "!",
            'headerText' => "Štít aktivovaný 🛡️",
            'bodyHtml' => "
                <p>Ahoj <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Včera si nemal/a čas učiť sa, ale neboj sa! Použili sme jeden z tvojich štítov, takže tvoja <strong>" . (int)$currentStreak . "-dňová</strong> séria je v bezpečí.</p>
                <p>Vráť sa dnes na krátku lekciu, aby si nestratil/a tempo!</p>
            ",
            'buttonText' => "Pokračovať v učení",
            'buttonLink' => "https://lexipaws.sk/"
        ];
    } else {
        return [
            'subject' => "Megmentettük a sorozatodat, " . htmlspecialchars($username) . "!",
            'headerText' => "Pajzs aktiválva 🛡️",
            'bodyHtml' => "
                <p>Szia <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Tegnap nem volt időd tanulni, de ne aggódj! Felhasználtunk egyet a Streak Pajzsaid közül, így a(z) <strong>" . (int)$currentStreak . " napos</strong> sorozatod biztonságban van.</p>
                <p>Gyere vissza ma egy rövid leckére, nehogy elveszítsd a lendületet!</p>
            ",
            'buttonText' => "Tovább tanulok",
            'buttonLink' => "https://lexipaws.hu/"
        ];
    }
};
