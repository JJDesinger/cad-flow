# CAD Flow - Instalador de atalho cliente
# Execute este script NO TERMINAL DO COLABORADOR (como Administrador).
# Copia o launch-cad-client.ps1 para a maquina e cria o atalho na area de trabalho.
#
# Uso no terminal do colaborador:
#   powershell -ExecutionPolicy Bypass -File "\\192.168.15.4\cad-scripts\create-client-shortcut.ps1"

param(
    [string]$ServerIP     = "192.168.15.4",
    [string]$ScriptSource = "\\$ServerIP\cad-scripts\launch-cad-client.ps1",
    [ValidateSet("Current","Public")]
    [string]$Desktop      = "Current"
)

# Pasta de destino do script no terminal do colaborador
$LocalDir    = "C:\CADFlow"
$LocalScript = "$LocalDir\launch-cad-client.ps1"

# Cria pasta e copia o launcher
if (-not (Test-Path $LocalDir)) {
    New-Item -ItemType Directory -Path $LocalDir | Out-Null
}

# Se estiver rodando de um compartilhamento de rede, copia; senao usa o caminho passado
if (Test-Path $ScriptSource) {
    Copy-Item $ScriptSource $LocalScript -Force
} else {
    # Fallback: usa o script do mesmo diretorio deste instalador
    $src = Join-Path $PSScriptRoot "launch-cad-client.ps1"
    Copy-Item $src $LocalScript -Force
}

# Caminho do atalho
if ($Desktop -eq "Public") {
    $shortcutPath = "C:\Users\Public\Desktop\CAD Flow.lnk"
} else {
    $shortcutPath = [System.IO.Path]::Combine(
        [System.Environment]::GetFolderPath("Desktop"), "CAD Flow.lnk")
}

# Cria atalho
$wsh           = New-Object -ComObject WScript.Shell
$shortcut      = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = "powershell.exe"
$shortcut.Arguments        = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$LocalScript`""
$shortcut.WorkingDirectory = $LocalDir
$shortcut.Description      = "Abrir CAD Flow"
$shortcut.WindowStyle      = 7
$shortcut.Save()

Write-Host "Atalho instalado em: $shortcutPath" -ForegroundColor Green
Write-Host "Script em:           $LocalScript"
Write-Host "Servidor:            $ServerIP"
