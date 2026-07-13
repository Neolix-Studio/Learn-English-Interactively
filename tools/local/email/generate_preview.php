<?php
$projectRoot = dirname(__DIR__, 3);

$title = "Jelszó visszaállítása - Lexipaws";
$headerText = "Új jelszó kérése";
$bodyHtml = "<p>Szia <strong>Teszt Felhasználó</strong>!</p>";
$bodyHtml .= "<p>Jelszó-visszaállítási kérelem érkezett a Lexipaws fiókodhoz. Ha nem te kérted, nyugodtan hagyd figyelmen kívül ezt az e-mailt.</p>";
$bodyHtml .= "<p>A jelszavad megváltoztatásához kattints az alábbi gombra (a link 1 óráig érvényes):</p>";
$buttonText = "Jelszó visszaállítása";
$buttonLink = "#";

ob_start();
include $projectRoot . '/templates/email_template.php';
$html = ob_get_clean();
file_put_contents($projectRoot . '/email_preview.html', $html);
echo "Preview generated.";
