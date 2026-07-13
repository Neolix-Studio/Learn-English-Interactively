<?php
return function($data) {
    $username = $data['username'] ?? '';
    $milestoneMessage = $data['milestoneMessage'] ?? '';
    $lang = $data['language'] ?? 'hu';

    if ($lang === 'sk') {
        return [
            'subject' => "Gratulujeme, " . htmlspecialchars($username) . "!",
            'headerText' => "Nový míľnik! 🎉",
            'bodyHtml' => "
                <p>Ahoj <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Odvádzaš úžasnú prácu! Oficiálne si dosiahol/a nový míľnik:</p>
                <p style='font-size: 20px; font-weight: bold; color: #14C864; text-align: center; margin: 30px 0;'>
                    " . htmlspecialchars($milestoneMessage) . "
                </p>
                <p>Sme na teba veľmi hrdí, len tak ďalej!</p>
            ",
            'buttonText' => "Poďme na ďalší cieľ",
            'buttonLink' => lexipawsAppUrl()
        ];
    } else {
        return [
            'subject' => "Gratulálunk, " . htmlspecialchars($username) . "!",
            'headerText' => "Új mérföldkő! 🎉",
            'bodyHtml' => "
                <p>Szia <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Elképesztő munkát végzel! Hivatalosan is elértél egy új mérföldkövet:</p>
                <p style='font-size: 20px; font-weight: bold; color: #14C864; text-align: center; margin: 30px 0;'>
                    " . htmlspecialchars($milestoneMessage) . "
                </p>
                <p>Nagyon büszkék vagyunk rád, csak így tovább!</p>
            ",
            'buttonText' => "Nézzük a következő célt",
            'buttonLink' => lexipawsAppUrl()
        ];
    }
};
