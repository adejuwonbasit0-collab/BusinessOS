$ErrorActionPreference = 'Continue'
$BASE = "http://localhost:4000/api/v1"
$pass = 0; $fail = 0

function Login($email, $password) {
  $b = @{ email=$email; password=$password } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $b -ContentType "application/json" -TimeoutSec 20
  return $r.data.tokens.accessToken
}
function Hit($method, $path, $body, $token) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  try {
    if ($null -ne $body) {
      $r = Invoke-WebRequest -Uri "$BASE$path" -Method $method -Headers $h -Body ($body | ConvertTo-Json -Depth 12) -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
      return @{ ok=$true; status=$r.StatusCode; body=$r.Content }
    } else {
      $r = Invoke-WebRequest -Uri "$BASE$path" -Method $method -Headers $h -TimeoutSec 30 -UseBasicParsing
      return @{ ok=$true; status=$r.StatusCode; body=$r.Content }
    }
  } catch {
    $code = 0; try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $msg = $_.ErrorDetails.Message; if (-not $msg) { $msg = $_.Exception.Message }
    if ($msg.Length -gt 400) { $msg = $msg.Substring(0,400) }
    return @{ ok=$false; status=$code; body=$msg }
  }
}
function Check($method, $path, $body, $token, $expect = 200) {
  $r = Hit $method $path $body $token
  if ($r.ok -and $r.status -eq $expect) {
    $script:pass++; Write-Host ("PASS {0,-4} {1,-6} {2}" -f $r.status, $method, $path) -ForegroundColor DarkGreen; return $r.body
  } else {
    $script:fail++; Write-Host ("FAIL {0,-4} {1,-6} {2}  :: {3}" -f $r.status, $method, $path, $r.body) -ForegroundColor Red; return $null
  }
}
function J($s) { try { return ($s | ConvertFrom-Json).data } catch { return $null } }

$tok = Login "james@acmecorp.com" "Demo@acme123"
$adminTok = Login "admin@nexos.app" "Admin@nexos123"

Write-Host "--- contacts CRUD ---"
$c = Check "POST" "/contacts" @{ firstName="Smoke"; lastName="Test"; email="smoke.test@acmecorp.com"; type="lead"; phone="+15550001111"; company="Acme" } $tok 201
$cid = $null; if ($c) { $d = J $c; if ($d) { $cid = $d.id } }
if ($cid) {
  Check "GET" "/contacts/$cid" $null $tok | Out-Null
  Check "PATCH" "/contacts/$cid" @{ firstName="SmokeUpdated"; status="qualified" } $tok | Out-Null
  Check "DELETE" "/contacts/$cid" $null $tok | Out-Null
} else { Write-Host "   (contact id not created)" -ForegroundColor Yellow }

Write-Host "--- projects + tasks + milestones ---"
$p = Check "POST" "/projects" @{ name="Smoke Project"; description="smoke"; status="planning"; priority="medium" } $tok 201
$pid_ = $null; if ($p) { $d = J $p; if ($d) { $pid_ = $d.id } }
if ($pid_) {
  Check "GET" "/projects/$pid_" $null $tok | Out-Null
  Check "POST" "/projects/tasks" @{ projectId=$pid_; title="Smoke Task"; status="todo"; priority="medium" } $tok 201 | Out-Null
  Check "POST" "/projects/milestones" @{ projectId=$pid_; name="Smoke Milestone"; dueDate="2026-12-01" } $tok 201 | Out-Null
  Check "PATCH" "/projects/$pid_/status" @{ status="active" } $tok | Out-Null
}

Write-Host "--- invoices ---"
$inv = Check "POST" "/invoices" @{ contactId=$cid; items=@(@{ description="Smoke line"; quantity=2; unitPrice=50 }); currency="USD" } $tok 201

Write-Host "--- inventory ---"
$wh = Check "POST" "/inventory/warehouses" @{ name="Smoke WH"; code="SMKWH" } $tok 201
$whId = $null; if ($wh) { $d = J $wh; if ($d) { $whId = $d.id } }
$pr = Check "POST" "/inventory/products" @{ name="Smoke Product"; sku="SMK-001"; price=19.99; cost=10 } $tok 201
$prodId = $null; if ($pr) { $d = J $pr; if ($d) { $prodId = $d.id } }
if ($prodId -and $whId) {
  Check "POST" "/inventory/stock/adjust" @{ productId=$prodId; warehouseId=$whId; quantity=10; reason="smoke test"; type="adjustment" } $tok | Out-Null
}
$sup = Check "POST" "/inventory/suppliers" @{ name="Smoke Supplier"; email="supplier@smoke.test"; phone="+15552223333" } $tok 201
$cat = Check "POST" "/inventory/categories" @{ name="Smoke Category"; description="smoke" } $tok 201

Write-Host "--- bookings ---"
$res = Check "POST" "/bookings/resources" @{ name="Smoke Room"; type="room"; capacity=4 } $tok 201
$resId = $null; if ($res) { $d = J $res; if ($d) { $resId = $d.id } }
if ($resId) {
  $b = Check "POST" "/bookings" @{ resourceId=$resId; customerName="Smoke Guest"; customerEmail="smoke.test@acmecorp.com"; startTime="2026-11-01T10:00:00Z"; endTime="2026-11-01T11:00:00Z" } $tok 201
  if ($b) { $d = J $b; if ($d -and $d.id) { Check "PATCH" "/bookings/$($d.id)/status" @{ status="confirmed" } $tok | Out-Null } }
}

Write-Host "--- accounting (double-entry) ---"
$accs = Check "GET" "/accounting/accounts" $null $tok
$a1 = $null; $a2 = $null
if ($accs) { $list = $accs | ConvertFrom-Json; $items = $list.data; if ($items -is [array] -and $items.Count -ge 2) { $a1 = $items[0].id; $a2 = $items[1].id } }
if ($a1 -and $a2) {
  Check "POST" "/accounting/journal-entries" @{ entryDate="2026-10-20"; description="Smoke entry"; reference="SMK-1"; lines=@(@{ accountId=$a1; debit=100; credit=0; description="dr" }, @{ accountId=$a2; debit=0; credit=100; description="cr" }) } $tok 201 | Out-Null
} else { Write-Host "   (could not resolve two chart-of-account ids)" -ForegroundColor Yellow }
Check "POST" "/accounting/budgets" @{ name="Smoke Budget"; fiscalYear=2026; budgetedAmount=1000; actualAmount=0 } $tok 201 | Out-Null
Check "POST" "/accounting/tax-rates" @{ name="Smoke VAT"; rate=20; isDefault=$false } $tok 201 | Out-Null

Write-Host "--- workflows / communication / org ---"
Check "POST" "/workflows" @{ name="Smoke Workflow"; description="smoke"; trigger=@{ type="manual" }; steps=@() } $tok 201 | Out-Null
Check "POST" "/communication/threads" @{ name="Smoke Thread"; participantIds=@() } $tok 201 | Out-Null
Check "POST" "/departments" @{ name="Smoke Dept"; code="SMKDEPT" } $tok 201 | Out-Null
Check "POST" "/branches" @{ name="Smoke Branch"; code="SMKBR"; address="1 Test St" } $tok 201 | Out-Null

Write-Host "--- documents / sales / hr ---"
Check "POST" "/documents" @{ name="Smoke Doc"; type="contract"; content="body" } $tok 201 | Out-Null
Check "POST" "/sales/orders" @{ items=@(@{ productId=$prodId; quantity=1; unitPrice=19.99 }); customerName="Smoke Buyer" } $tok 201 | Out-Null
Check "POST" "/hr/leave-types" @{ name="Smoke Leave"; daysPerYear=20; requiresApproval=$true } $tok 201 | Out-Null
Check "POST" "/hr/recruitment/openings" @{ title="Smoke Role"; department="Engineering"; location="Remote" } $tok 201 | Out-Null

Write-Host "--- industries / admin ---"
Check "GET" "/admin/stats" $null $adminTok | Out-Null
Check "GET" "/admin/tenants" $null $adminTok | Out-Null
Check "GET" "/marketplace" $null $tok | Out-Null
Check "GET" "/integrations/catalog" $null $tok | Out-Null
Check "GET" "/white-label" $null $tok | Out-Null

Write-Host "`n=== PASS: $pass   FAIL: $fail ===" -ForegroundColor Cyan
