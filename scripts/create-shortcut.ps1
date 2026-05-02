# CAD Flow — Gerador de atalho na área de trabalho
# Execute este script UMA VEZ em cada terminal de trabalho (como Administrador ou via GPO).
# O atalho criado chama o launch-cad.ps1 silenciosamente ao ser clicado.
#
# Uso:
#   .\create-shortcut.ps1
#   .\create-shortcut.ps1 -LauncherPath "\\servidor\cad\scripts\launch-cad.ps1"
#   .\create-shortcut.ps1 -Desktop "Public"   # coloca em C:\Users\Public\Desktop (todos os usuários)

param(
    [string]$LauncherPath = "$PSScriptRoot\launch-cad.ps1",
    [ValidateSet("Current","Public")]
    [string]$Desktop = "Current"
)

# Resolve caminho do atalho
if ($Desktop -eq "Public") {
    $shortcutPath = "C:\Users\Public\Desktop\CAD Flow.lnk"
} else {
    $shortcutPath = [System.IO.Path]::Combine(
        [System.Environment]::GetFolderPath("Desktop"),
        "CAD Flow.lnk"
    )
}

# Resolve ícone — usa o ícone do PowerShell se não houver um .ico dedicado
$iconPath = [System.IO.Path]::Combine($PSScriptRoot, "cad-flow.ico")
if (-not (Test-Path $iconPath)) {
    $iconPath = "C:\Windows\System32\shell32.dll,13"   # ícone de globo padrão
}

# Cria o atalho
$wsh     = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)

$shortcut.TargetPath       = "powershell.exe"
$shortcut.Arguments        = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$LauncherPath`""
$shortcut.WorkingDirectory = Split-Path $LauncherPath
$shortcut.Description      = "Abrir CAD Flow"
$shortcut.IconLocation     = $iconPath
$shortcut.WindowStyle      = 7   # minimizado/oculto — sem janela piscando

$shortcut.Save()

Write-Host "Atalho criado em: $shortcutPath" -ForegroundColor Green
Write-Host "Launcher:         $LauncherPath"
