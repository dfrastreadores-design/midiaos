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

if ($action === 'patch') {
    $patchedFiles = [];

    // 1. Corrige bundle SSR
    $ssrFile = $hbuildsNodejs . '/server/_ssr/router-BQIgfEe0.mjs';
    if (file_exists($ssrFile)) {
        $c = file_get_contents($ssrFile);
        $r = str_replace('icon: Trash2, modulo: null', 'icon: Trash2$1, modulo: null', $c);
        if ($c !== $r) {
            file_put_contents($ssrFile, $r);
            $patchedFiles[] = $ssrFile;
        }
    }

    // 2. Corrige bundle client-side (index-9YO_f6Z8.js)
    $clientFiles = [
        $pubHtml . '/assets/index-9YO_f6Z8.js',
        $pubHtml . '/public/assets/index-9YO_f6Z8.js',
        $pubHtml . '/.output/public/assets/index-9YO_f6Z8.js',
        $hbuildsNodejs . '/public/assets/index-9YO_f6Z8.js',
    ];

    // Encontra qualquer outra cópia em versions
    $versionsDir = dirname(dirname($hbuildsNodejs)) . '/versions';
    if (file_exists($versionsDir)) {
        foreach (scandir($versionsDir) as $v) {
            if ($v === '.' || $v === '..') continue;
            $candidate = $versionsDir . '/' . $v . '/nodejs/public/assets/index-9YO_f6Z8.js';
            if (file_exists($candidate) && !in_array($candidate, $clientFiles)) {
                $clientFiles[] = $candidate;
            }
        }
    }

    foreach ($clientFiles as $f) {
        if (file_exists($f)) {
            $c = file_get_contents($f);
            $r = str_replace('icon:Trash2,modulo:null', 'icon:LO,modulo:null', $c);
            if ($c !== $r) {
                file_put_contents($f, $r);
                $patchedFiles[] = $f;
            }
        }
    }

    // 3. Garante que os assets de public/ estejam diretamente em public_html/
    if (file_exists($pubHtml . '/public/assets') && !file_exists($pubHtml . '/assets')) {
        @mkdir($pubHtml . '/assets', 0755, true);
    }
    if (file_exists($pubHtml . '/public/assets')) {
        foreach (scandir($pubHtml . '/public/assets') as $a) {
            if ($a === '.' || $a === '..') continue;
            @copy($pubHtml . '/public/assets/' . $a, $pubHtml . '/assets/' . $a);
        }
    }

    // 4. Reinicia passenger
    $tmpDir = $hbuildsNodejs . '/tmp';
    if (!file_exists($tmpDir)) @mkdir($tmpDir, 0755, true);
    @file_put_contents($tmpDir . '/restart.txt', (string)time());

    echo json_encode([
        'success' => true,
        'patched_count' => count($patchedFiles),
        'patched_files' => $patchedFiles,
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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
        "SetEnv SUPABASE_URL \"https://tvniawyweymutjiybxyo.supabase.co\"\n" .
        "SetEnv SUPABASE_PUBLISHABLE_KEY \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ\"\n" .
        "SetEnv VITE_SUPABASE_URL \"https://tvniawyweymutjiybxyo.supabase.co\"\n" .
        "SetEnv VITE_SUPABASE_PUBLISHABLE_KEY \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ\"\n";
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
