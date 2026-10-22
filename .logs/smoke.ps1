$ErrorActionPreference = 'Continue'
$BASE = "http://localhost:4000/api/v1"
$pass = 0; $fail = 0
$results = @()

function Login($email, $password) {
  $b = @{ email=$email; password=$password } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 20
  return $r.data.tokens.accessToken
}

function Hit($method, $path, $body, $token) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  try {
    if ($body) {
      $r = Invoke-WebRequest -Uri "$BASE$path" -Method $method -Headers $h -Body ($body | ConvertTo-Json -Depth 10) -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
      return @{ ok=$true; status=$r.StatusCode; body=$r.Content }
    } else {
      $r = Invoke-WebRequest -Uri "$BASE$path" -Method $method -Headers $h -TimeoutSec 30 -UseBasicParsing
      return @{ ok=$true; status=$r.StatusCode; body=$r.Content }
    }
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $msg = $_.ErrorDetails.Message
    if (-not $msg) { $msg = $_.Exception.Message }
    if ($msg.Length -gt 260) { $msg = $msg.Substring(0,260) }
    return @{ ok=$false; status=$code; body=$msg }
  }
}

function Check($name, $method, $path, $body, $token, $expect = 200) {
  $r = Hit $method $path $body $token
  if ($r.ok -and $r.status -eq $expect) {
    $script:pass++
    Write-Host ("PASS {0,-4} {1,-6} {2}" -f $r.status, $method, $path) -ForegroundColor DarkGreen
    return $r.body
  } else {
    $script:fail++
    Write-Host ("FAIL {0,-4} {1,-6} {2}  :: {3}" -f $r.status, $method, $path, $r.body) -ForegroundColor Red
    return $null
  }
}

$tok = Login "james@acmecorp.com" "Demo@acme123"
$adminTok = Login "admin@nexos.app" "Admin@nexos123"
Write-Host "--- tokens acquired ---"

# ── READ endpoints ───────────────────────────────────────────────────────────
$reads = @(
  "/auth/me","/auth/sessions",
  "/analytics/dashboard","/analytics/executive","/analytics/revenue","/analytics/kpis",
  "/analytics/sales","/analytics/customers","/analytics/inventory","/analytics/staff",
  "/contacts","/contacts/stats",
  "/invoices","/invoices/stats/summary",
  "/branches","/branches/regional-report",
  "/roles","/roles/permissions-catalog","/roles/access-matrix",
  "/departments",
  "/inventory/products","/inventory/categories","/inventory/warehouses","/inventory/stock",
  "/inventory/transfers","/inventory/suppliers","/inventory/purchase-orders","/inventory/stats",
  "/sales/orders","/sales/quotations","/sales/stats",
  "/hr/staff","/hr/attendance","/hr/leave-types","/hr/leave-requests","/hr/payroll/runs",
  "/hr/payroll/payslips","/hr/recruitment/openings","/hr/recruitment/candidates","/hr/reviews","/hr/stats",
  "/projects","/projects/stats","/projects/tasks/all",
  "/bookings/resources","/bookings","/bookings/availability","/bookings/stats",
  "/documents","/documents/stats","/documents/approvals/list",
  "/communication/threads","/communication/logs","/communication/notifications","/communication/stats",
  "/accounting/accounts","/accounting/journal-entries","/accounting/general-ledger",
  "/accounting/budgets","/accounting/tax-rates","/accounting/cash-flow","/accounting/profit-and-loss",
  "/industries","/industries/modules","/industries/current",
  "/workflows","/workflows/stats",
  "/portals","/forms","/tables",
  "/marketplace","/marketplace/featured","/marketplace/categories","/marketplace/installed",
  "/integrations","/integrations/catalog",
  "/white-label","/white-label/preview"
)
foreach ($r in $reads) { Check "read" "GET" $r $null $tok | Out-Null }

# ── Admin (super_admin) ──────────────────────────────────────────────────────
foreach ($r in @("/admin/stats","/admin/tenants","/admin/users","/admin/audit-logs","/admin/revenue")) {
  Check "read" "GET" $r $null $adminTok | Out-Null
}

# ── WRITE flows ──────────────────────────────────────────────────────────────
Write-Host "`n--- write flows ---"

# Contact create -> read -> update -> delete
$c = Check "write" "POST" "/contacts" @{ firstName="Smoke"; lastName="Test"; email="smoke.test@acmecorp.com"; type="lead"; phone="+15550001111" } $tok 201
$contactId = $null
if ($c) { try { $contactId = ($c | ConvertFrom-Json).data.id } catch {} }
if ($contactId) {
  Check "write" "GET"  "/contacts/$contactId" $null $tok | Out-Null
  Check "write" "PATCH" "/contacts/$contactId" @{ firstName="SmokeUpdated" } $tok | Out-Null
  Check "write" "DELETE" "/contacts/$contactId" $null $tok | Out-Null
}

# Project create -> tasks
$p = Check "write" "POST" "/projects" @{ name="Smoke Project"; description="smoke"; status="planning"; priority="medium" } $tok 201
$projId = $null
if ($p) { try { $projId = ($p | ConvertFrom-Json).data.id } catch {} }
if ($projId) {
  Check "write" "GET" "/projects/$projId" $null $tok | Out-Null
  Check "write" "POST" "/projects/tasks" @{ projectId=$projId; title="Smoke Task"; status="todo" } $tok 201 | Out-Null
}

# Invoice create
$inv = Check "write" "POST" "/invoices" @{ contactId=$contactId; items=@(@{ description="Smoke line"; quantity=2; unitPrice=50 }); currency="USD" } $tok 201

# Product + warehouse + stock adjust
$wh = Check "write" "POST" "/inventory/warehouses" @{ name="Smoke WH"; code="SMKWH" } $tok 201
$whId = $null; if ($wh) { try { $whId = ($wh | ConvertFrom-Json).data.id } catch {} }
$pr = Check "write" "POST" "/inventory/products" @{ name="Smoke Product"; sku="SMK-001"; price=19.99; cost=10 } $tok 201
$prodId = $null; if ($pr) { try { $prodId = ($pr | ConvertFrom-Json).data.id } catch {} }
if ($prodId -and $whId) {
  Check "write" "POST" "/inventory/stock/adjust" @{ productId=$prodId; warehouseId=$whId; quantity=10; reason="smoke test"; type="adjustment" } $tok | Out-Null
}

# Booking
$res = Check "write" "POST" "/bookings/resources" @{ name="Smoke Room"; type="room"; capacity=4 } $tok 201
$resId = $null; if ($res) { try { $resId = ($res | ConvertFrom-Json).data.id } catch {} }
if ($resId) {
  Check "write" "POST" "/bookings" @{ resourceId=$resId; customerName="Smoke Guest"; customerEmail="smoke.test@acmecorp.com"; startTime="2026-11-01T10:00:00Z"; endTime="2026-11-01T11:00:00Z" } $tok 201 | Out-Null
}

# Accounting: balanced journal entry
$je = Check "write" "POST" "/accounting/journal-entries" @{
  entryDate="2026-10-20"; description="Smoke entry"; reference="SMK-1"
  lines=@(@{ accountId="00000000-0000-0000-0000-000000000001"; debit=100; credit=0; description="debit" },
          @{ accountId="00000000-0000-0000-0000-000000000002"; debit=0; credit=100; description="credit" })
} $tok 201

# Workflow
$wf = Check "write" "POST" "/workflows" @{ name="Smoke Workflow"; description="smoke"; trigger=@{ type="manual" }; steps=@() } $tok 201

# Communication thread
$th = Check "write" "POST" "/communication/threads" @{ name="Smoke Thread"; participantIds=@() } $tok 201

# Department
Check "write" "POST" "/departments" @{ name="Smoke Dept"; code="SMKDEPT" } $tok 201 | Out-Null

Write-Host "`n=== PASS: $pass   FAIL: $fail ===" -ForegroundColor Cyan
