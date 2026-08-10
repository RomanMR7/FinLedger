param([Parameter(Mandatory=$true)][string]$BackupFile)
if (!(Test-Path $BackupFile)) { throw "Файл не найден: $BackupFile" }
& .\backup.ps1
docker exec -i fin-ledger-db psql -U finledger -d finledger -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
Get-Content -Raw $BackupFile | docker exec -i fin-ledger-db psql -U finledger -d finledger
Write-Host "База восстановлена из: $BackupFile"
