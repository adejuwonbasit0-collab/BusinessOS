$ErrorActionPreference = 'Continue'
$BASE = "http://localhost:4000/api/v1"
$fail = 0

function Login($email, $password) {
  $b = @{ email=$email; password=$password } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 20
  return $r.data.tokens.accessToken
}

# Every POST/PATCH endpoint that accepts a body. Sending an empty body must
# yield a 4xx (validation) - a 5xx means the controller forwards garbage to
# Postgres instead of validating.
$posts = @(
  "/contacts","/invoices","/branches","/roles","/departments",
  "/inventory/products","/inventory/categories","/inventory/warehouses",
  "/inventory/stock/adjust","/inventory/transfers","/inventory/suppliers","/inventory/purchase-orders",
  "/sales/orders","/sales/quotations","/sales/refunds",
  "/hr/leave-types","/hr/leave-requests","/hr/payroll/runs","/hr/payroll/compensation",
  "/hr/recruitment/openings","/hr/recruitment/candidates","/hr/reviews",
  "/projects","/projects/tasks","/projects/milestones",
  "/bookings/resources","/bookings",
  "/documents","/documents/approvals",
  "/communication/threads","/communication/send-email",
  "/accounting/accounts","/accounting/journal-entries","/accounting/budgets","/accounting/tax-rates",
  "/industries/select","/industries/custom",
  "/workflows","/portals","/forms","/tables","/marketplace/submit",
  "/integrations/connect","/white-label","/white-label/resellers"
)

$tok = Login "james@acmecorp.com" "Demo@acme123"
$h = @{ Authorization = "Bearer $tok" }
$serverErrors = @()

Write-Host "=== POST with empty body (expect 4xx, flag 5xx) ===" -ForegroundColor Cyan
foreach ($p in $posts) {
  try {
    $r = Invoke-WebRequest -Uri "$BASE$p" -Method POST -Headers $h -Body "{}" -ContentType "application/json" -TimeoutSec 25 -UseBasicParsing
    Write-Host ("  {0,-4} {1}  (created anyway)" -f $r.StatusCode, $p) -ForegroundColor DarkYellow
  } catch {
    $code = 0; try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $m = $_.ErrorDetails.Message; if (-not $m) { $m = $_.Exception.Message }
    if ($code -ge 500) {
      $fail++
      $serverErrors += $p
      Write-Host ("  {0,-4} {1}  :: {2}" -f $code, $p, $m) -ForegroundColor Red
    } else {
      Write-Host ("  {0,-4} {1}" -f $code, $p) -ForegroundColor DarkGray
    }
  }
}

Write-Host "`n=== ADMIN POSTs ===" -ForegroundColor Cyan
$adminTok = Login "admin@nexos.app" "Admin@nexos123"
$ah = @{ Authorization = "Bearer $adminTok" }
foreach ($p in @("/admin/tenants/00000000-0000-0000-0000-000000000000/suspend")) {
  try {
    $r = Invoke-WebRequest -Uri "$BASE$p" -Method POST -Headers $ah -Body "{}" -ContentType "application/json" -TimeoutSec 25 -UseBasicParsing
    Write-Host ("  {0,-4} {1}" -f $r.StatusCode, $p) -ForegroundColor DarkYellow
  } catch {
    $code = 0; try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $m = $_.ErrorDetails.Message; if (-not $m) { $m = $_.Exception.Message }
    if ($code -ge 500) { $fail++; $serverErrors += $p; Write-Host ("  {0,-4} {1}  :: {2}" -f $code, $p, $m) -ForegroundColor Red }
    else { Write-Host ("  {0,-4} {1}" -f $code, $p) -ForegroundColor DarkGray }
  }
}

Write-Host "`n=== 5xx endpoints: $($serverErrors.Count) ===" -ForegroundColor Yellow
$serverErrors | ForEach-Object { "   - $_" }
