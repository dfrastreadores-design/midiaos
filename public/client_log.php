<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$logFile = __DIR__ . '/client_errors.log';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    
    $entry = "[" . date('Y-m-d H:i:s') . "] " . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n----------------------------------------\n";
    file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    
    header('Content-Type: application/json');
    echo json_encode(['ok' => true]);
    exit;
}

// GET: Exibir log
header('Content-Type: text/plain; charset=utf-8');
if (file_exists($logFile)) {
    echo file_get_contents($logFile);
} else {
    echo "Nenhum erro registrado ainda.";
}
