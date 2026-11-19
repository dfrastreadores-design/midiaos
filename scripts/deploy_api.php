<?php
/**
 * Mídia.OS / TV Brasília - Deploy API Runner para Hostinger
 * Executa descompactação atômica e reinicia o LiteSpeed Node.js (Passenger)
 */

header('Content-Type: application/json; charset=utf-8');

// Token de segurança estático
$authSecret = 'midiaos_sec_1f0bc7fa7464023df90a652715c83e85f1366459d8c27e336fc00013c345709c';
$providedToken = $_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? $_POST['token'] ?? $_GET['token'] ?? '';

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

if ($action === 'upload') {
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $dest = $pubHtml . '/hostinger_deploy.zip';
        if (move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
            echo json_encode([
                'success' => true,
                'message' => 'hostinger_deploy.zip recebido com sucesso via HTTP POST!',
                'size' => filesize($dest),
                'timestamp' => date('c'),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Falha ao mover arquivo enviado']);
            exit;
        }
    } else {
        http_response_code(400);
        $err = $_FILES['file']['error'] ?? 'Nenhum arquivo recebido no campo file';
        echo json_encode(['error' => 'Erro no upload: ' . $err]);
        exit;
    }
}

if ($action === 'sync_env') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
        exit;
    }
    $rawEnv = file_get_contents('php://input');
    if (!empty($rawEnv)) {
        if (!file_exists($hbuildsNodejs)) {
            @mkdir($hbuildsNodejs, 0755, true);
        }
        @file_put_contents($hbuildsNodejs . '/.env', $rawEnv);
        if (file_exists($pubHtml . '/.env')) @unlink($pubHtml . '/.env');
        if (file_exists($pubHtml . '/.output/.env')) @unlink($pubHtml . '/.output/.env');
        echo json_encode(['success' => true, 'message' => 'Variáveis de ambiente sincronizadas no diretório seguro do Node.js']);
        exit;
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Conteúdo do .env vazio']);
        exit;
    }
}

// Ações 'cmd' e 'patch' foram permanentemente desativadas por política de segurança
if ($action === 'cmd' || $action === 'patch') {
    http_response_code(403);
    echo json_encode([
        'error' => 'Acesso negado: a funcionalidade solicitada foi desativada por diretriz de segurança.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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
    if (!file_exists($hbuildsNodejs)) {
        @mkdir($hbuildsNodejs, 0755, true);
    }
    $zip->extractTo($hbuildsNodejs);

    // 2. Extrai também para public_html e public_html/.output
    $zip->extractTo($pubHtml);

    $pubOutput = $pubHtml . '/.output';
    if (!file_exists($pubOutput)) {
        @mkdir($pubOutput, 0755, true);
    }
    $zip->extractTo($pubOutput);
    $zip->close();

    // 2.1 Garante cópia de public/assets diretamente em public_html/assets
    if (file_exists($pubHtml . '/public/assets')) {
        if (!file_exists($pubHtml . '/assets')) {
            @mkdir($pubHtml . '/assets', 0755, true);
        }
        foreach (scandir($pubHtml . '/public/assets') as $a) {
            if ($a === '.' || $a === '..') continue;
            @copy($pubHtml . '/public/assets/' . $a, $pubHtml . '/assets/' . $a);
        }
    }

    // 3. Garante que .env esteja em hbuilds/current/nodejs e seja removido da raiz pública
    if (file_exists($pubHtml . '/.env')) {
        if (!file_exists($hbuildsNodejs . '/.env')) {
            @copy($pubHtml . '/.env', $hbuildsNodejs . '/.env');
        }
        @unlink($pubHtml . '/.env');
    }
    if (file_exists($pubOutput . '/.env')) {
        @unlink($pubOutput . '/.env');
    }

    // 3.1 Garante existência de preload-timestamp.js
    $configDir = '/home/u233352823/domains/midiaos.online/hbuilds/config';
    if (!file_exists($configDir)) {
        @mkdir($configDir, 0755, true);
    }
    $preloadFile = $configDir . '/preload-timestamp.js';
    if (!file_exists($preloadFile)) {
        @file_put_contents($preloadFile, "// Mídia.OS Preload\nconsole.log('Mídia.OS Server boot:', new Date().toISOString());\n");
    }

    // 3.2 Garante que .htaccess sempre tenha a configuração correta do Passenger, MIME types e bloqueio de arquivos sensíveis
    $htaccessFile = $pubHtml . '/.htaccess';
    $htaccessContent = "# Configurações do ambiente Node.js / Passenger (Hostinger)\n" .
        "PassengerAppRoot /home/u233352823/domains/midiaos.online/hbuilds/current/nodejs\n" .
        "PassengerAppType node\n" .
        "PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node\n" .
        "PassengerStartupFile server/index.mjs\n" .
        "PassengerBaseURI /\n" .
        "PassengerRestartDir /home/u233352823/domains/midiaos.online/hbuilds/current/nodejs/tmp\n" .
        "SetEnv NODE_OPTIONS \"--require /home/u233352823/domains/midiaos.online/hbuilds/config/preload-timestamp.js\"\n" .
        "SetEnv LSNODE_CONSOLE_LOG console.log\n" .
        "SetEnv SUPABASE_URL \"https://tvniawyweymutjiybxyo.supabase.co\"\n" .
        "SetEnv SUPABASE_PUBLISHABLE_KEY \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ\"\n" .
        "SetEnv VITE_SUPABASE_URL \"https://tvniawyweymutjiybxyo.supabase.co\"\n" .
        "SetEnv VITE_SUPABASE_PUBLISHABLE_KEY \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ\"\n\n" .
        "# Tipos MIME corretos para módulos JavaScript e CSS\n" .
        "<IfModule mod_mime.c>\n" .
        "  AddType application/javascript .js .mjs .cjs\n" .
        "  AddType text/css .css\n" .
        "</IfModule>\n\n" .
        "# 🔒 Bloqueio estrito de arquivos ocultos e extensões sensíveis\n" .
        "<FilesMatch \"(^\\.|\\.(env|bak|config|sql|log|zip|tar|gz|sh|md)$)\">\n" .
        "  <IfModule mod_authz_core.c>\n" .
        "    Require all denied\n" .
        "  </IfModule>\n" .
        "  <IfModule !mod_authz_core.c>\n" .
        "    Order allow,deny\n" .
        "    Deny from all\n" .
        "  </IfModule>\n" .
        "</FilesMatch>\n";
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
        'zip_purged' => !file_exists($zipFile),
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'cleanup') {
    $removed = [];
    if (file_exists($zipFile)) {
        if (@unlink($zipFile)) $removed[] = 'hostinger_deploy.zip';
    }
    foreach (glob($pubHtml . '/*.zip') as $f) {
        if (@unlink($f)) $removed[] = basename($f);
    }
    if (file_exists($pubHtml . '/.env')) {
        if (@unlink($pubHtml . '/.env')) $removed[] = '.env';
    }
    if (file_exists($pubOutput . '/.env')) {
        if (@unlink($pubOutput . '/.env')) $removed[] = '.output/.env';
    }
    echo json_encode([
        'success' => true,
        'message' => 'Limpeza de arquivos temporários e zips no servidor concluída!',
        'removed' => $removed,
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ação desconhecida: ' . $action]);
