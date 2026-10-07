# WithDKIS 시작하기 (Windows)
# 시작하기.bat 을 더블클릭하면 이 스크립트가 실행된다.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root
$appUrl = 'http://localhost:3000'

function Say($text, $color = 'White') { Write-Host $text -ForegroundColor $color }
function Finish($code) {
    Write-Host ''
    Read-Host '엔터를 누르면 창이 닫힙니다'
    exit $code
}

Say ''
Say '=== WithDKIS 시작하기 ===' Cyan
Say ''

# 1. Docker Desktop 설치 확인
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Say 'Docker Desktop이 설치되어 있지 않습니다.' Red
    Say '열리는 페이지에서 Docker Desktop을 설치한 뒤 다시 실행해주세요.'
    Start-Process 'https://www.docker.com/products/docker-desktop/'
    Finish 1
}

# 2. Docker 엔진이 켜져 있는지 확인하고, 꺼져 있으면 켠다
function Test-DockerRunning {
    # Windows PowerShell 5.1은 리디렉션한 stderr를 오류로 바꿔 'Stop'이면 멈춘다
    $ErrorActionPreference = 'Continue'
    & docker info *> $null
    return $LASTEXITCODE -eq 0
}

if (-not (Test-DockerRunning)) {
    Say 'Docker Desktop을 켜는 중입니다... (처음엔 1~2분 걸릴 수 있어요)' Yellow
    $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $desktop) { Start-Process $desktop }
    $deadline = (Get-Date).AddMinutes(3)
    while (-not (Test-DockerRunning)) {
        if ((Get-Date) -gt $deadline) {
            Say 'Docker Desktop이 켜지지 않았습니다. Docker Desktop을 직접 실행한 뒤 다시 시도해주세요.' Red
            Finish 1
        }
        Start-Sleep -Seconds 3
    }
}
Say '[1/4] Docker 준비 완료' Green

# 3. .env 준비: 없으면 만들고, 비밀번호는 자동으로 채운다
$envPath = Join-Path $root '.env'
if (-not (Test-Path $envPath)) {
    Copy-Item (Join-Path $root '.env.example') $envPath
    Say '설정 파일(.env)을 새로 만들었습니다.'
}

function New-Secret([int]$bytes = 32) {
    $buffer = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return ([Convert]::ToBase64String($buffer) -replace '[+/=]', '')
}

$lines = [System.Collections.Generic.List[string]](Get-Content $envPath -Encoding UTF8)
function Get-EnvValue($name) {
    foreach ($line in $lines) {
        if ($line -match "^\s*$name=(.*)$") { return $Matches[1].Trim() }
    }
    return $null
}
function Set-EnvValue($name, $value) {
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$name=") { $lines[$i] = "$name=$value"; return }
    }
    $lines.Add("$name=$value")
}

$changed = $false
foreach ($name in @('POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET')) {
    if (-not (Get-EnvValue $name)) {
        Set-EnvValue $name (New-Secret)
        $changed = $true
    }
}
if ($null -eq (Get-EnvValue 'SEOUL_OPENAPI_KEY')) {
    Set-EnvValue 'SEOUL_OPENAPI_KEY' ''
    $changed = $true
}
if ($changed) {
    # docker compose는 BOM이 없는 UTF-8을 기대한다
    [System.IO.File]::WriteAllLines($envPath, $lines, (New-Object System.Text.UTF8Encoding $false))
    Say '비밀번호를 자동으로 만들어 .env에 저장했습니다. 따로 외울 필요는 없어요.'
}

if (-not (Get-EnvValue 'SEOUL_OPENAPI_KEY')) {
    Say ''
    Say '서울시 인증키(SEOUL_OPENAPI_KEY)가 아직 없습니다.' Yellow
    Say '키가 있으면 지금 넣을 수 있어요. 없으면 N을 눌러도 앱은 켜집니다.'
    $answer = Read-Host '지금 넣을까요? (Y/N)'
    if ($answer -match '^[Yy]') {
        Say '메모장에서 SEOUL_OPENAPI_KEY= 뒤에 키를 붙여넣고 저장(Ctrl+S)한 다음 메모장을 닫아주세요.'
        Start-Process notepad.exe -ArgumentList "`"$envPath`"" -Wait
    }
}
Say '[2/4] 설정 확인 완료' Green

# 4. 앱 켜기
Say ''
Say '[3/4] 앱을 켜는 중입니다... (처음엔 5~10분 걸릴 수 있어요)' Yellow
$composeArgs = @('compose')
$lines = [System.Collections.Generic.List[string]](Get-Content $envPath -Encoding UTF8)
if (Get-EnvValue 'CLOUDFLARE_TUNNEL_TOKEN') { $composeArgs += @('--profile', 'tunnel') }
$composeArgs += @('up', '-d', '--build')

$ErrorActionPreference = 'Continue'
& docker @composeArgs
$exitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($exitCode -ne 0) {
    Say ''
    Say '앱을 켜지 못했습니다. 위에 나온 내용을 복사해서 보내주시면 원인을 찾아드릴게요.' Red
    Finish 1
}

# 5. 웹이 응답할 때까지 기다렸다가 브라우저 열기
$deadline = (Get-Date).AddMinutes(3)
$ready = $false
while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-WebRequest -Uri "$appUrl/login" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 3
}

if (-not $ready) {
    Say '앱은 켜졌지만 아직 화면이 준비되지 않았습니다. 1~2분 뒤 브라우저에서 아래 주소를 열어주세요.' Yellow
    Say "  $appUrl"
    Finish 0
}

Say '[4/4] 완료! 브라우저를 엽니다.' Green
Say "  주소: $appUrl"
Say '  끌 때는 중지하기.bat 을 더블클릭하세요.'
Start-Process $appUrl
Finish 0
