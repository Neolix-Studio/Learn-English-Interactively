<?php
// mailer.php
// Helper file for sending HTML emails using our Master Template

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/libs/PHPMailer/src/Exception.php';
require_once __DIR__ . '/libs/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/libs/PHPMailer/src/SMTP.php';

/**
 * Sends an HTML email using the templates/email_template.php
 * 
 * @param string $to Email address of the recipient
 * @param string $subject Subject of the email
 * @param string $headerText The big text at the top of the email
 * @param string $bodyHtml The main HTML content of the email
 * @param string|null $buttonText Text for the call-to-action button
 * @param string|null $buttonLink URL for the call-to-action button
 * @return bool True if mail was accepted for delivery, false otherwise
 */
function sendLexipawsEmail($to, $subject, $headerText, $bodyHtml, $buttonText = null, $buttonLink = null) {
    // 1. Render the HTML using output buffering
    ob_start();
    
    // Variables for the template
    $title = $subject;
    
    include __DIR__ . '/templates/email_template.php';
    
    $htmlContent = ob_get_clean();
    
    // 2. Set up PHPMailer
    $mail = new PHPMailer(true);
    
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = defined('SMTP_HOST') ? SMTP_HOST : 'smtp.m1.websupport.sk';
        $mail->SMTPAuth   = true;
        $mail->Username   = defined('SMTP_USER') ? SMTP_USER : 'noreply@lexipaws.eu';
        $mail->Password   = defined('SMTP_PASS') ? SMTP_PASS : '';
        
        // Handle encryption based on port/config
        $secureType = defined('SMTP_SECURE') ? strtolower(SMTP_SECURE) : 'ssl';
        if ($secureType === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else if ($secureType === 'tls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = ''; // no encryption if not set to ssl/tls
        }
        
        $mail->Port       = defined('SMTP_PORT') ? SMTP_PORT : 465;

        // Ensure proper encoding
        $mail->CharSet = 'UTF-8';

        // Recipients
        $mail->setFrom($mail->Username, 'Lexipaws');
        $mail->addAddress($to);
        $mail->addReplyTo($mail->Username, 'Lexipaws');

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlContent;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '</p>'], "\n", $htmlContent));

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}

/**
 * Helper to send a predefined template email.
 * 
 * @param string $to Email address
 * @param string $templateName Name of the file inside templates/emails/ without .php
 * @param array $data Variables to extract into the template scope (e.g. ['username' => 'Test'])
 * @return bool
 */
function sendTemplateEmail($to, $templateName, $data = []) {
    // Extract variables so they are available in the included template
    extract($data);
    
    $templatePath = __DIR__ . '/templates/emails/' . $templateName . '.php';
    if (!file_exists($templatePath)) {
        error_log("Email template not found: " . $templatePath);
        return false;
    }
    
    // The template file should return an array or a callable that returns an array.
    $template = include $templatePath;
    
    if (is_callable($template)) {
        $emailData = $template($data);
    } else {
        $emailData = $template;
    }
    
    if (!is_array($emailData)) {
        error_log("Email template did not return an array: " . $templatePath);
        return false;
    }
    
    return sendLexipawsEmail(
        $to,
        $emailData['subject'] ?? 'Lexipaws Notification',
        $emailData['headerText'] ?? '',
        $emailData['bodyHtml'] ?? '',
        $emailData['buttonText'] ?? null,
        $emailData['buttonLink'] ?? null
    );
}
