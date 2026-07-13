<?php
return function($data) {
    $username = $data['username'] ?? '';
    $resetLink = $data['resetLink'] ?? '#';
    $lang = $data['language'] ?? 'hu';

    if ($lang === 'sk') {
        return [
            'subject' => "Obnova hesla - Lexipaws",
            'headerText' => "Žiadosť o nové heslo",
            'bodyHtml' => "
                <p>Ahoj <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Dostali sme žiadosť o obnovenie hesla pre tvoj účet na Lexipaws. Ak si o ňu nepožiadal/a, môžeš tento e-mail pokojne ignorovať.</p>
                <p>Pre zmenu hesla klikni na tlačidlo nižšie (odkaz je platný 1 hodinu):</p>
            ",
            'buttonText' => "Obnoviť heslo",
            'buttonLink' => $resetLink
        ];
    } else {
        return [
            'subject' => "Jelszó visszaállítása - Lexipaws",
            'headerText' => "Új jelszó kérése",
            'bodyHtml' => "
                <p>Szia <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>Jelszó-visszaállítási kérelem érkezett a Lexipaws fiókodhoz. Ha nem te kérted, nyugodtan hagyd figyelmen kívül ezt az e-mailt.</p>
                <p>A jelszavad megváltoztatásához kattints az alábbi gombra (a link 1 óráig érvényes):</p>
            ",
            'buttonText' => "Jelszó visszaállítása",
            'buttonLink' => $resetLink
        ];
    }
};
