# CAD Flow - Launcher completo (sem janelas)

Add-Type -AssemblyName System.Windows.Forms

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BackendDir  = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$NpmCmd      = "C:\Program Files\nodejs\npm.cmd"
$ApiUrl      = "http://localhost:3000"
$WinUser     = $env:USERNAME.ToLower()
$LogFile     = Join-Path $ProjectRoot "backend\cad-server.log"

function Is-PortOpen($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $port)
        $tcp.Close()
        return $true
    } catch {}
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient([System.Net.Sockets.AddressFamily]::InterNetworkV6)
        $tcp.Connect("::1", $port)
        $tcp.Close()
        return $true
    } catch {}
    return $false
}

function Start-Server($dir, $npmArgs) {
    # Gravar bat temporario para evitar problemas de escape no Arguments
    $bat = Join-Path $env:TEMP ("cad_" + [System.IO.Path]::GetRandomFileName() + ".bat")
    $content = "@echo off`r`n`"" + $NpmCmd + "`" " + $npmArgs + " >> `"" + $LogFile + "`" 2>&1"
    [System.IO.File]::WriteAllText($bat, $content, [System.Text.Encoding]::ASCII)

    $psi                  = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName         = "cmd.exe"
    $psi.Arguments        = "/c `"$bat`""
    $psi.WorkingDirectory = $dir
    $psi.WindowStyle      = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $psi.CreateNoWindow   = $true
    $psi.UseShellExecute  = $false
    [System.Diagnostics.Process]::Start($psi) | Out-Null
}

function Wait-ForPort($port, $timeoutSec = 90) {
    $elapsed = 0
    while (-not (Is-PortOpen $port)) {
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
        if ($elapsed -ge $timeoutSec) { return $false }
    }
    return $true
}

function Get-FrontendPort {
    foreach ($p in @(5173, 5174, 5175, 5176)) {
        if (Is-PortOpen $p) { return $p }
    }
    return $null
}

# Garantir que o arquivo de log existe
if (-not (Test-Path $LogFile)) {
    New-Item -ItemType File -Path $LogFile -Force | Out-Null
}

# --- Backend (porta 3000) ---
if (-not (Is-PortOpen 3000)) {
    Start-Server $BackendDir "run dev"
    if (-not (Wait-ForPort 3000)) {
        Start-Process "http://localhost:5173/access-request?type=first_access"
        exit
    }
}

# --- Frontend (porta 5173) ---
if (-not (Get-FrontendPort)) {
    Start-Server $FrontendDir "run dev -- --host 0.0.0.0"
    Wait-ForPort 5173 90 | Out-Null
}

$frontendPort = Get-FrontendPort
if (-not $frontendPort) { $frontendPort = 5173 }

# --- Login automatico via usuario Windows ---
try {
    $body     = '{"windows_username":"' + $WinUser + '"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/auth/windows-login" `
                    -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    $token    = $response.token
    if ($token) {
        Start-Process "http://localhost:$frontendPort/auto-login?token=$token"
    } else {
        Start-Process "http://localhost:$frontendPort/access-request?type=first_access"
    }
} catch {
    Start-Process "http://localhost:$frontendPort/access-request?type=first_access"
}
