# CAD Flow - Cliente
# Autentica pelo login Windows e abre o sistema no servidor da rede.
# Nao sobe nenhum servidor local — aponta para a maquina servidora.

Add-Type -AssemblyName System.Windows.Forms

$ServerIP = "192.168.15.4"   # <- IP da maquina servidora (Jones)
$ApiUrl   = "http://${ServerIP}:3000"
$AppUrl   = "http://${ServerIP}:5173"
$WinUser  = $env:USERNAME.ToLower()

try {
    $body     = '{"windows_username":"' + $WinUser + '"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/auth/windows-login" `
                    -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    $token    = $response.token

    if ($token) {
        Start-Process "$AppUrl/auto-login?token=$token"
    } else {
        Start-Process "$AppUrl/access-request?type=first_access"
    }
} catch {
    $msg = $_.Exception.Message
    if ($msg -like "*Unable to connect*" -or $msg -like "*refused*" -or $msg -like "*connect*") {
        [System.Windows.Forms.MessageBox]::Show(
            "Nao foi possivel conectar ao servidor CAD Flow ($ServerIP)." +
            "`nVerifique se o servidor esta ligado e na rede.",
            "CAD Flow - Servidor indisponivel",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning)
    } else {
        # Usuario nao vinculado — solicitar primeiro acesso
        Start-Process "$AppUrl/access-request?type=first_access"
    }
}
