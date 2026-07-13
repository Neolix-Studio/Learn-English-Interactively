<?php
$projectRoot = dirname(__DIR__, 3);

$title = "Üdvözlünk a Lexipaws-nál!";
$headerText = "Sikeres regisztráció";
$bodyHtml = "<p>Kedves <strong>Teszt Felhasználó</strong>!</p>";
$bodyHtml .= "<p>Nagyon örülünk, hogy csatlakoztál hozzánk! A Lexipaws segítségével mostantól szórakoztatóan és interaktívan fejlesztheted az angoltudásod.</p>";
$bodyHtml .= "<p>Kezdd el az első leckét még ma, és építsd fel a tanulási sorozatodat (streak)!</p>";
$buttonText = "Irány a tanulás!";
$buttonLink = "#";

ob_start();
include $projectRoot . '/templates/email_template.php';
$html = ob_get_clean();
file_put_contents($projectRoot . '/email_preview_welcome.html', $html);
echo "Preview generated.";
