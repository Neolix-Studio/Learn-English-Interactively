<?php
return function($data) {
    $username = $data['username'] ?? '';
    $weeklyXp = $data['weeklyXp'] ?? 0;
    $streak = $data['streak'] ?? 0;
    $leagueName = $data['leagueName'] ?? 'Bronz';
    $rank = $data['rank'] ?? 0;
    $lang = $data['language'] ?? 'hu';

    $rankStr = $rank > 0 ? $rank . "." : "-";

    if ($lang === 'sk') {
        $greetingMessage = "Výborná práca tento týždeň!";
        if ($weeklyXp > 1000) {
            $greetingMessage = "Úžasný výkon tento týždeň!";
        } elseif ($weeklyXp < 100) {
            $greetingMessage = "Každý krok sa počíta!";
        }

        return [
            'subject' => "Tvoje týždenné zhrnutie Lexipaws 📈",
            'headerText' => "Týždenné zhrnutie",
            'bodyHtml' => "
                <p>Ahoj <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>" . $greetingMessage . " Tu je tvoj výkon za posledných 7 dní:</p>
                
                <div style='background-color: #ffffff; border: 2px solid #F8F9FA; border-radius: 12px; padding: 20px; margin: 30px 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05);'>
                    <div style='flex: 1; min-width: 120px;'>
                        <div style='font-size: 28px; font-weight: 900; color: #14C864; margin-bottom: 5px;'>" . $weeklyXp . "</div>
                        <div style='font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;'>Získané XP</div>
                    </div>
                    <div style='flex: 1; min-width: 120px; border-left: 2px solid #F8F9FA; border-right: 2px solid #F8F9FA;'>
                        <div style='font-size: 28px; font-weight: 900; color: #FF9600; margin-bottom: 5px;'>🔥 " . $streak . "</div>
                        <div style='font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;'>Séria dní</div>
                    </div>
                    <div style='flex: 1; min-width: 120px;'>
                        <div style='font-size: 28px; font-weight: 900; color: #3B82F6; margin-bottom: 5px;'>" . $rankStr . "</div>
                        <div style='font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;'>Umiestnenie v Lige (" . htmlspecialchars($leagueName) . ")</div>
                    </div>
                </div>

                <p>Si pripravený/á na výzvy ďalšieho týždňa? Prihlás sa a pokračuj v učení!</p>
            ",
            'buttonText' => "Ďalšia lekcia",
            'buttonLink' => "https://lexipaws.sk/dashboard"
        ];
    } else {
        $greetingMessage = "Szép munka volt a héten!";
        if ($weeklyXp > 1000) {
            $greetingMessage = "Elképesztő teljesítmény a héten!";
        } elseif ($weeklyXp < 100) {
            $greetingMessage = "Minden lépés számít!";
        }

        return [
            'subject' => "A heti Lexipaws összefoglalód 📈",
            'headerText' => "Heti Összefoglaló",
            'bodyHtml' => "
                <p>Szia <strong>" . htmlspecialchars($username) . "</strong>!</p>
                <p>" . $greetingMessage . " Itt van, hogyan teljesítettél az elmúlt 7 napban:</p>
                
                <div style='background-color: #ffffff; border: 2px solid #F8F9FA; border-radius: 12px; padding: 20px; margin: 30px 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05);'>
                    <div style='flex: 1; min-width: 120px;'>
                        <div style='font-size: 28px; font-weight: 900; color: #14C864; margin-bottom: 5px;'>" . $weeklyXp . "</div>
                        <div style='font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;'>Megszerzett XP</div>
                    </div>
                    <div style='flex: 1; min-width: 120px; border-left: 2px solid #F8F9FA; border-right: 2px solid #F8F9FA;'>
                        <div style='font-size: 28px; font-weight: 900; color: #FF9600; margin-bottom: 5px;'>🔥 " . $streak . "</div>
                        <div style='font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;'>Napi Sorozat</div>
                    </div>
                    <div style='flex: 1; min-width: 120px;'>
                        <div style='font-size: 28px; font-weight: 900; color: #3B82F6; margin-bottom: 5px;'>" . $rankStr . "</div>
                        <div style='font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;'>" . htmlspecialchars($leagueName) . " Liga Helyezés</div>
                    </div>
                </div>

                <p>Készen állsz a következő hét kihívásaira? Lépj be, és folytasd a tanulást!</p>
            ",
            'buttonText' => "Következő lecke",
            'buttonLink' => "https://lexipaws.hu/dashboard"
        ];
    }
};
