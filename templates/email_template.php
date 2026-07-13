<?php
// templates/email_template.php

/**
 * Variables expected:
 * - $title (string) Browser tab title
 * - $headerText (string) Header title
 * - $bodyHtml (string) The main content of the email
 * - $buttonText (string|null) The text for the CTA button
 * - $buttonLink (string|null) The URL for the CTA button
 */

if (!isset($title)) $title = "Lexipaws Notification";
if (!isset($headerText)) $headerText = "Hello from Lexipaws!";
if (!isset($bodyHtml)) $bodyHtml = "<p>No content provided.</p>";
if (!isset($buttonText)) $buttonText = null;
if (!isset($buttonLink)) $buttonLink = null;

// Primary Colors:
// Background: #F8F9FA
// Primary Green: #14C864
// Green Shadow/Border: #0f8f4a
// Text: #333333

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($title); ?></title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #F8F9FA;
            font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            margin-top: 40px;
            margin-bottom: 40px;
        }

        .header {
            background-color: #ffffff;
            padding: 30px;
            text-align: center;
            border-bottom: 2px solid #F8F9FA;
        }

        .header img {
            max-width: 150px;
            height: auto;
        }

        .content {
            padding: 40px 30px;
            font-size: 16px;
            line-height: 1.6;
        }

        .content h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 20px;
        }

        .button-container {
            text-align: center;
            margin: 40px 0 20px 0;
        }

        .btn-3d {
            display: inline-block;
            background-color: #14C864;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
            padding: 16px 32px;
            border-radius: 12px;
            /* Rounded corners */
            box-shadow: 0 4px 0 #0f8f4a;
            /* 3D bottom shadow */
            transition: all 0.2s ease;
            text-align: center;
            border: 2px solid #0f8f4a;
        }

        .footer {
            background-color: #F8F9FA;
            padding: 30px;
            text-align: center;
            font-size: 12px;
            color: #888888;
        }

        .footer a {
            color: #14C864;
            text-decoration: none;
        }
    </style>
</head>

<body>
    <div style="background-color: #F8F9FA; padding: 20px;">
        <div class="container">
            <div class="header">
                <!-- Replace with actual logo URL once hosted -->
                <img src="https://dev.lexipaws.eu/lexipaws-logo-email.png" alt="Lexipaws" style="max-height: 40px; width: auto; font-size: 24px; font-weight: bold; color: #14C864;" />
            </div>

            <div class="content">
                <h1><?php echo htmlspecialchars($headerText); ?></h1>

                <?php echo $bodyHtml; ?>

                <?php if ($buttonText && $buttonLink): ?>
                    <div class="button-container">
                        <a href="<?php echo htmlspecialchars($buttonLink); ?>" class="btn-3d">
                            <?php echo htmlspecialchars($buttonText); ?>
                        </a>
                    </div>
                <?php endif; ?>
            </div>

            <div class="footer">
                <p>&copy; <?php echo date('Y'); ?> Lexipaws. All rights reserved.</p>
                <p>
                    <a href="https://dev.lexipaws.eu/profile">Notification Settings</a> |
                    <a href="https://dev.lexipaws.eu/privacy-policy">Privacy Policy</a>
                </p>
                <p>If you don't want to receive these emails, you can update your preferences in your account.</p>
            </div>
        </div>
    </div>
</body>

</html>