$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3005"
$script:hadFailure = $false

Write-Host "=== RBAC smoke test ==="

function Get-CookieValue {
    param([Microsoft.PowerShell.Commands.WebRequestSession]$session, [string]$host_, [string]$name)
    $jar = $session.Cookies.GetCookies("http://$host_")
    foreach ($c in $jar) { if ($c.Name -eq $name) { return $c.Value } }
    return $null
}

# Wraps Invoke-WebRequest so 4xx/5xx don't throw - returns @{ status; content }
function Invoke-Http {
    param(
        [Microsoft.PowerShell.Commands.WebRequestSession]$session,
        [string]$method,
        [string]$url,
        $body = $null,
        [hashtable]$extraHeaders = $null
    )
    $headers = @{}
    if ($extraHeaders) { foreach ($k in $extraHeaders.Keys) { $headers[$k] = $extraHeaders[$k] } }

    $params = @{
        Method      = $method
        Uri         = $url
        WebSession  = $session
        Headers     = $headers
        UseBasicParsing = $true
    }
    if ($null -ne $body) {
        $params["Body"]        = ($body | ConvertTo-Json -Compress)
        $params["ContentType"] = "application/json"
    }
    try {
        $resp = Invoke-WebRequest @params -ErrorAction Stop
        return @{ status = [int]$resp.StatusCode; content = $resp.Content }
    } catch [System.Net.WebException] {
        $ex = $_.Exception
        if ($ex.Response) {
            $code = [int]$ex.Response.StatusCode
            $stream = $ex.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body   = $reader.ReadToEnd()
            return @{ status = $code; content = $body }
        }
        throw
    } catch {
        # Catch newer Microsoft.PowerShell.Commands.HttpResponseException (PS7+) too
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            return @{ status = $code; content = "" }
        }
        throw
    }
}

function Invoke-WithCsrf {
    param(
        [Microsoft.PowerShell.Commands.WebRequestSession]$session,
        [string]$method,
        [string]$url,
        $body = $null
    )
    $csrf = Get-CookieValue -session $session -host_ "localhost" -name "yk_csrf_token"
    return Invoke-Http -session $session -method $method -url $url -body $body `
        -extraHeaders @{ "X-CSRF-Token" = $csrf }
}

function Assert-Status {
    param([int]$actual, [int]$expected, [string]$label, [string]$content = "")
    if ($actual -eq $expected) {
        Write-Host "  [OK]   $label  -> $actual"
    } else {
        Write-Host "  [FAIL] $label  -> expected $expected, got $actual" -ForegroundColor Red
        if ($content) { Write-Host "         body: $content" -ForegroundColor DarkRed }
        $script:hadFailure = $true
    }
}

# --- 1) login as admin -----------------------------------------------------

Write-Host "`n[admin] login..."
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Invoke-Http -session $adminSession -method POST -url "$baseUrl/auth/login" `
    -body @{ email = "admin@example.com"; password = "Admin@12345" }
Assert-Status $r.status 200 "admin login" $r.content

# --- 2) create role + grant perms ------------------------------------------

$suffix    = ([guid]::NewGuid().ToString("N").Substring(0, 8))
$roleSlug  = "smoke-procurement-$suffix"
$userEmail = "smoke-procurement-user-$suffix@example.com"
$userPwd   = "TempPass@123"

Write-Host "`n[admin] create role $roleSlug..."
$r = Invoke-WithCsrf -session $adminSession -method POST -url "$baseUrl/roles" `
    -body @{ slug = $roleSlug; name = "Procurement (smoke $suffix)" }
Assert-Status $r.status 201 "create role" $r.content
$role = ($r.content | ConvertFrom-Json).data
$roleId = $role.id

Write-Host "[admin] grant customers.read,view to role..."
$r = Invoke-WithCsrf -session $adminSession -method PUT -url "$baseUrl/roles/$roleId/permissions" `
    -body @{ permissions = @("customers.read", "customers.view") }
Assert-Status $r.status 200 "set role permissions" $r.content

# --- 3) create user, assign role -------------------------------------------

Write-Host "`n[admin] create user $userEmail..."
$r = Invoke-WithCsrf -session $adminSession -method POST -url "$baseUrl/users" `
    -body @{ email = $userEmail; name = "Smoke Procurement"; password = $userPwd }
Assert-Status $r.status 201 "create user" $r.content
$userId = ($r.content | ConvertFrom-Json).data.id

Write-Host "[admin] assign role $roleSlug to user..."
$r = Invoke-WithCsrf -session $adminSession -method POST -url "$baseUrl/users/$userId/roles" `
    -body @{ roles = @($roleSlug) }
# NestJS @Post default status is 201; envelope still says 200.
Assert-Status $r.status 201 "assign role to user" $r.content

# --- 4) login as the new user and exercise RBAC ----------------------------

Write-Host "`n[user] login..."
$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Invoke-Http -session $userSession -method POST -url "$baseUrl/auth/login" `
    -body @{ email = $userEmail; password = $userPwd }
Assert-Status $r.status 200 "procurement user login" $r.content

Write-Host "[user] expect 200 on GET /customers (has customers.read)"
$r = Invoke-WithCsrf -session $userSession -method GET -url "$baseUrl/customers"
Assert-Status $r.status 200 "GET /customers" $r.content

Write-Host "[user] expect 403 on POST /customers (lacks customers.create)"
$r = Invoke-WithCsrf -session $userSession -method POST -url "$baseUrl/customers" `
    -body @{ name = "x"; phone = "0700000000"; type = "rice_supplier" }
Assert-Status $r.status 403 "POST /customers" $r.content

Write-Host "[user] expect 403 on GET /jwali (has zero jwali permissions)"
$r = Invoke-WithCsrf -session $userSession -method GET -url "$baseUrl/jwali"
Assert-Status $r.status 403 "GET /jwali" $r.content

Write-Host "[user] expect 403 on GET /seasons (has zero seasons permissions)"
$r = Invoke-WithCsrf -session $userSession -method GET -url "$baseUrl/seasons"
Assert-Status $r.status 403 "GET /seasons" $r.content

Write-Host "[user] expect 403 on DELETE /customers/<random-uuid> (lacks customers.delete)"
$r = Invoke-WithCsrf -session $userSession -method DELETE -url "$baseUrl/customers/00000000-0000-0000-0000-000000000000"
Assert-Status $r.status 403 "DELETE /customers/:id" $r.content

# --- 5) cleanup ------------------------------------------------------------

Write-Host "`n[admin] cleanup..."
Invoke-WithCsrf -session $adminSession -method DELETE -url "$baseUrl/users/$userId" | Out-Null
Invoke-WithCsrf -session $adminSession -method DELETE -url "$baseUrl/roles/$roleId" | Out-Null
Write-Host "  cleanup done."

if ($script:hadFailure) {
    Write-Host "`n[FAIL] some assertions failed" -ForegroundColor Red
    exit 1
}
Write-Host "`n[PASS] all RBAC assertions held" -ForegroundColor Green
