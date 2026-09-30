<?php
/**
 * Mídia.OS / TV Brasília - Deploy API Runner para Hostinger
 * Executa descompactação atômica e reinicia o LiteSpeed Node.js (Passenger)
 */

header('Content-Type: application/json; charset=utf-8');

// Token de segurança estático
$authSecret = 'midiaos_deploy_sec_9938210491823712';
$providedToken = $_GET['token'] ?? $_POST['token'] ?? $_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '';

if (!hash_equals($authSecret, (string)$providedToken)) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: token inválido'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? 'extract';
$hbuildsNodejs = '/home/u233352823/domains/midiaos.online/hbuilds/current/nodejs';
$pubHtml = '/home/u233352823/domains/midiaos.online/public_html';
$zipFile = $pubHtml . '/hostinger_deploy.zip';

if ($action === 'ping') {
    echo json_encode([
        'status' => 'online',
        'php_version' => phpversion(),
        'zip_support' => class_exists('ZipArchive'),
        'hbuilds_exists' => file_exists($hbuildsNodejs),
        'hbuilds_writable' => is_writable($hbuildsNodejs),
        'pubhtml_writable' => is_writable($pubHtml),
        'zip_present' => file_exists($zipFile),
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'patch') {
    $file = '/home/u233352823/domains/midiaos.online/hbuilds/current/nodejs/server/_ssr/router-BQIgfEe0.mjs';
    if (!file_exists($file)) {
        echo json_encode(['error' => 'Arquivo não encontrado']);
        exit;
    }
    $content = file_get_contents($file);
    $replaced = str_replace('icon: Trash2, modulo: null', 'icon: Trash2$1, modulo: null', $content);
    $saved = file_put_contents($file, $replaced);
    
    // Restart passenger
    $tmpDir = '/home/u233352823/domains/midiaos.online/hbuilds/current/nodejs/tmp';
    @file_put_contents($tmpDir . '/restart.txt', (string)time());
    
    echo json_encode([
        'success' => true,
        'bytes_saved' => $saved,
        'changed' => $content !== $replaced,
        'timestamp' => date('c'),
    ]);
    exit;
}

if ($action === 'cmd') {
    $cmd = $_POST['cmd'] ?? $_GET['cmd'] ?? '';
    if (empty($cmd)) {
        echo json_encode(['error' => 'Comando não fornecido']);
        exit;
    }
    $output = shell_exec($cmd . ' 2>&1');
    echo json_encode(['cmd' => $cmd, 'output' => $output]);
    exit;
}

if ($action === 'diag') {
    $hbuildsDir = '/home/u233352823/domains/midiaos.online/hbuilds';
    $versionsDir = $hbuildsDir . '/versions';
    $versions = file_exists($versionsDir) ? scandir($versionsDir) : [];
    $currentLink = file_exists($hbuildsDir . '/current') ? readlink($hbuildsDir . '/current') : null;
    $currentReal = file_exists($hbuildsDir . '/current') ? realpath($hbuildsDir . '/current') : null;
    $htaccess = @file_get_contents($pubHtml . '/.htaccess');
    
    // Check router-BQIgfEe0.mjs
    $errFile = '/home/u233352823/domains/midiaos.online/hbuilds/versions/01a0b6f2-16c0-710f-8c15-5c727717cfe2/nodejs/server/_ssr/router-BQIgfEe0.mjs';
    $errFileExists = file_exists($errFile);
    $errSnippet = '';
    if ($errFileExists) {
        $lines = file($errFile);
        $start = max(0, 3774 - 15);
        $slice = array_slice($lines, $start, 30);
        $errSnippet = implode("", $slice);
    }
    
    $canExec = function_exists('exec');
    $canShellExec = function_exists('shell_exec');
    
    echo json_encode([
        'hbuilds_versions' => $versions,
        'current_link' => $currentLink,
        'current_real' => $currentReal,
        'htaccess' => $htaccess,
        'err_file_exists' => $errFileExists,
        'err_snippet' => $errSnippet,
        'can_exec' => $canExec,
        'can_shell_exec' => $canShellExec,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'logs') {
    $stderr = @file_get_contents($hbuildsNodejs . '/stderr.log');
    $console = @file_get_contents($hbuildsNodejs . '/console.log');
    echo json_encode([
        'stderr' => $stderr ? array_slice(explode("\n", trim($stderr)), -40) : [],
        'console' => $console ? array_slice(explode("\n", trim($console)), -40) : [],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'extract') {
    if (!file_exists($zipFile)) {
        http_response_code(400);
        echo json_encode(['error' => 'Arquivo hostinger_deploy.zip não encontrado em public_html'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!class_exists('ZipArchive')) {
        http_response_code(500);
        echo json_encode(['error' => 'Extensão ZipArchive não disponível no PHP'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $zip = new ZipArchive();
    $res = $zip->open($zipFile);
    if ($res !== true) {
        http_response_code(500);
        echo json_encode(['error' => 'Falha ao abrir zip (código: ' . $res . ')'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $numFiles = $zip->numFiles;

    // 1. Extrai diretamente para hbuilds/current/nodejs (onde o Passenger roda server/index.mjs)
    if (file_exists($hbuildsNodejs)) {
        $zip->extractTo($hbuildsNodejs);
    }

    // 2. Extrai também para public_html e public_html/.output
    $zip->extractTo($pubHtml);

    $pubOutput = $pubHtml . '/.output';
    if (!file_exists($pubOutput)) {
        @mkdir($pubOutput, 0755, true);
    }
    $zip->extractTo($pubOutput);
    $zip->close();

    // 3. Garante que .env esteja em hbuilds/current/nodejs
    if (file_exists($pubHtml . '/.env') && file_exists($hbuildsNodejs)) {
        @copy($pubHtml . '/.env', $hbuildsNodejs . '/.env');
    }

    // 3.1 Garante que .htaccess sempre tenha a configuração correta do Passenger e variáveis de ambiente
    $htaccessFile = $pubHtml . '/.htaccess';
    $htaccessContent = "PassengerAppRoot /home/u233352823/domains/midiaos.online/hbuilds/current/nodejs\n" .
        "PassengerAppType node\n" .
        "PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node\n" .
        "PassengerStartupFile server/index.mjs\n" .
        "PassengerBaseURI /\n" .
        "PassengerRestartDir /home/u233352823/domains/midiaos.online/hbuilds/current/nodejs/tmp\n" .
        "SetEnv NODE_OPTIONS \"--require /home/u233352823/domains/midiaos.online/hbuilds/config/preload-timestamp.js\"\n" .
        "SetEnv LSNODE_CONSOLE_LOG console.log\n" .
        "SetEnv SUPABASE_URL \"https://odgowgvhjhvpeazglsly.supabase.co\"\n" .
        "SetEnv SUPABASE_PUBLISHABLE_KEY \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ293Z3Zoamh2cGVhemdsc2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYwOTQsImV4cCI6MjA5NDY2MjA5NH0.X0-jxfLmUFTpxUm6O0-802xVK1iNt41He6Gho-oDb0E\"\n" .
        "SetEnv VITE_SUPABASE_URL \"https://odgowgvhjhvpeazglsly.supabase.co\"\n" .
        "SetEnv VITE_SUPABASE_PUBLISHABLE_KEY \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ293Z3Zoamh2cGVhemdsc2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYwOTQsImV4cCI6MjA5NDY2MjA5NH0.X0-jxfLmUFTpxUm6O0-802xVK1iNt41He6Gho-oDb0E\"\n";
    @file_put_contents($htaccessFile, $htaccessContent);

    // 4. Cria diretório tmp e atualiza restart.txt para reiniciar o Passenger Node.js
    $tmpDir = $hbuildsNodejs . '/tmp';
    if (!file_exists($tmpDir)) {
        @mkdir($tmpDir, 0755, true);
    }
    $restarted = @file_put_contents($tmpDir . '/restart.txt', (string)time());

    // 5. Remove o zip para liberar espaço
    @unlink($zipFile);

    echo json_encode([
        'success' => true,
        'message' => 'Deploy e extração concluídos com sucesso!',
        'files_extracted' => $numFiles,
        'passenger_restarted' => $restarted !== false,
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ação desconhecida: ' . $action]);
