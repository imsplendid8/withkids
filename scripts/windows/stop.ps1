# WithDKIS 중지하기 (Windows)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)

Write-Host ''
Write-Host '=== WithDKIS 중지하기 ===' -ForegroundColor Cyan
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'Docker Desktop이 설치되어 있지 않습니다.' -ForegroundColor Red
} else {
    # 데이터는 지우지 않는다. 다음에 시작하기.bat 으로 그대로 이어서 쓴다.
    & docker compose --profile tunnel --profile tools stop
    if ($LASTEXITCODE -eq 0) {
        Write-Host '앱을 껐습니다. 저장된 데이터는 그대로 남아 있어요.' -ForegroundColor Green
    } else {
        Write-Host '끄는 중 문제가 있었습니다. 위 내용을 확인해주세요.' -ForegroundColor Red
    }
}
Write-Host ''
Read-Host '엔터를 누르면 창이 닫힙니다'
