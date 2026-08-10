$dir = "backups"
New-Item -ItemType Directory -Force $dir | Out-Null
$file = "$dir/finledger-$(Get-Date -Format yyyyMMdd-HHmmss).sql"
docker exec fin-ledger-db pg_dump -U finledger -d finledger | Set-Content -Encoding utf8 $file
Get-ChildItem $dir -Filter *.sql | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | Remove-Item
Write-Host "Создана резервная копия: $file"
