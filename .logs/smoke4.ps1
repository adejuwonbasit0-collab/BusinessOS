$ErrorActionPreference = 'Continue'
$BASE = "http://localhost:4000/api/v1"
$pass = 0; $fail = 0
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

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
    }
    $r = Invoke-WebRequest -Uri "$BASE$path" -Method $method -Headers $h -TimeoutSec 30 -UseBasicParsing
    return @{ ok=$true; status=$r.StatusCode; body=$r.Content }
  } catch {
    $code = 0; try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $msg = $_.ErrorDetails.Message; if (-not $msg) { $msg = $_.Exception.Message }
    if ($msg.Length -gt 300) { $msg = $msg.Substring(0,300) }
    return @{ ok=$false; status=$code; body=$msg }
  }
}
# Check <method> <path> <body> <token> [expectedStatus]
function Check($method, $path, $body, $token, $expect = 200) {
  $r = Hit $method $path $body $token
  if ($r.status -eq $expect) {
    $script:pass++; Write-Host ("PASS {0,-4} {1,-6} {2}" -f $r.status, $method, $path) -ForegroundColor DarkGreen; return $r.body
  }
  $script:fail++; Write-Host ("FAIL {0,-4} {1,-6} {2}  :: {3}" -f $r.status, $method, $path, $r.body) -ForegroundColor Red; return $null
}
# Pull an id out of a response whose shape is { data: { <entity>: { id } } }
function Id($json, $entity) {
  if (-not $json) { return $null }
  try {
    $d = ($json | ConvertFrom-Json).data
    if ($entity -and $d.$entity) { return $d.$entity.id }
    if ($d.id) { return $d.id }
    return $null
  } catch { return $null }
}
function List($json, $entity) {
  if (-not $json) { return @() }
  try { $d = ($json | ConvertFrom-Json).data; if ($entity) { return @($d.$entity) }; return @($d) } catch { return @() }
}

$tok = Login "james@acmecorp.com" "Demo@acme123"
$adminTok = Login "admin@nexos.app" "Admin@nexos123"

Write-Host "`n=== contacts CRUD ===" -ForegroundColor Cyan
$email = "smoke.$stamp@acmecorp.com"
$c = Check "POST" "/contacts" @{ firstName="Smoke"; lastName="Test"; email=$email; type="lead"; phone="+15550001111"; companyName="Acme" } $tok 201
$cid = Id $c "contact"
if ($cid) {
  Check "GET" "/contacts/$cid" $null $tok | Out-Null
  Check "PATCH" "/contacts/$cid" @{ firstName="SmokeUpdated"; status="active" } $tok | Out-Null
  Check "DELETE" "/contacts/$cid" $null $tok | Out-Null
} else { Write-Host "  (no contact id)" -ForegroundColor Yellow }

Write-Host "`n=== invoice with description-as-name alias ===" -ForegroundColor Cyan
$inv = Check "POST" "/invoices" @{ contactId=$cid; items=@(@{ description="Consulting hours"; quantity=3; unitPrice=125 }); currency="USD" } $tok 201
$iid = Id $inv "invoice"
if ($iid) {
  $full = Check "GET" "/invoices/$iid" $null $tok
  $items = List $full "items"
  Write-Host ("   line item name = '{0}'  total = {1}" -f $items[0].name, $items[0].total) -ForegroundColor DarkGray
  if ($items[0].name -eq "Consulting hours") { Write-Host "   -> description alias mapped to name OK" -ForegroundColor DarkGreen }
  else { Write-Host "   -> MISMATCH" -ForegroundColor Red; $script:fail++ }
  Check "POST" "/invoices/$iid/mark-paid" @{ amount=375; method="bank_transfer" } $tok | Out-Null
  $paid = Check "GET" "/invoices/$iid" $null $tok
  Write-Host ("   invoice status now = {0}, amount_due = {1}" -f ($paid|ConvertFrom-Json).data.invoice.status, ($paid|ConvertFrom-Json).data.invoice.amount_due) -ForegroundColor DarkGray
}

Write-Host "`n=== branch with plain-string address (jsonb coercion) ===" -ForegroundColor Cyan
$br = Check "POST" "/branches" @{ name="Smoke Branch"; code="SMKBR$stamp"; address="1 Test Street"; phone="+15551112222" } $tok 201
if ($br) {
  $b = ($br | ConvertFrom-Json).data.branch
  Write-Host ("   address stored = {0}" -f ($b.address | ConvertTo-Json -Compress)) -ForegroundColor DarkGray
  Check "PATCH" "/branches/$($b.id)" @{ address="2 New Street" } $tok | Out-Null
  Check "DELETE" "/branches/$($b.id)" $null $tok | Out-Null
}

Write-Host "`n=== projects / tasks / milestones ===" -ForegroundColor Cyan
$p = Check "POST" "/projects" @{ name="Smoke Project"; description="smoke"; status="planning"; priority="medium"; budget=1000 } $tok 201
$pid_ = Id $p "project"
if ($pid_) {
  Check "GET" "/projects/$pid_" $null $tok | Out-Null
  Check "POST" "/projects/tasks" @{ projectId=$pid_; title="Smoke Task"; status="todo"; priority="medium" } $tok 201 | Out-Null
  Check "POST" "/projects/milestones" @{ projectId=$pid_; name="Smoke Milestone"; dueDate="2026-12-01" } $tok 201 | Out-Null
  Check "PATCH" "/projects/$pid_/status" @{ status="active" } $tok | Out-Null
}

Write-Host "`n=== inventory ===" -ForegroundColor Cyan
$wh  = Check "POST" "/inventory/warehouses" @{ name="Smoke WH"; code="SMKWH$stamp" } $tok 201
$wh2 = Check "POST" "/inventory/warehouses" @{ name="Smoke WH2"; code="SMKW2$stamp" } $tok 201
$whId  = Id $wh "warehouse"
$whId2 = Id $wh2 "warehouse"
$pr = Check "POST" "/inventory/products" @{ name="Smoke Product"; sku="SMK-$stamp"; price=19.99; cost=10 } $tok 201
$prodId = Id $pr "product"
Check "POST" "/inventory/categories" @{ name="Smoke Category $stamp" } $tok 201 | Out-Null
Check "POST" "/inventory/suppliers" @{ name="Smoke Supplier"; email="s$stamp@smoke.test"; address="42 Supplier Rd" } $tok 201 | Out-Null
$sups = List (Check "GET" "/inventory/suppliers" $null $tok) "suppliers"
$supId = if ($sups.Count -gt 0) { $sups[0].id } else { $null }
if ($prodId -and $whId) {
  Check "POST" "/inventory/stock/adjust" @{ warehouseId=$whId; productId=$prodId; quantity=25; movementType="adjustment" } $tok | Out-Null
}
if ($whId -and $whId2 -and $prodId) {
  Check "POST" "/inventory/transfers" @{ fromWarehouseId=$whId; toWarehouseId=$whId2; items=@(@{ productId=$prodId; quantity=5 }) } $tok 201 | Out-Null
}
$po = Check "POST" "/inventory/purchase-orders" @{ supplierId=$supId; warehouseId=$whId; items=@(@{ productId=$prodId; quantity=3; unitCost=8 }) } $tok 201

Write-Host "`n=== sales orders / quotations / refunds ===" -ForegroundColor Cyan
$so = Check "POST" "/sales/orders" @{ items=@(@{ productId=$prodId; description="Widget"; quantity=2; unitPrice=19.99 }); contactName="Smoke Buyer" } $tok 201
$oid = Id $so "order"
if ($oid) {
  Check "POST" "/sales/orders/$oid/confirm" @{} $tok | Out-Null
  Check "POST" "/sales/orders/$oid/payment" @{ amount=39.98; method="card" } $tok | Out-Null
}
$qt = Check "POST" "/sales/quotations" @{ items=@(@{ description="Quoted work"; quantity=1; unitPrice=500 }) } $tok 201
$qtid = Id $qt "quotation"
if ($qtid) { Check "POST" "/sales/quotations/$qtid/convert" @{} $tok | Out-Null }
if ($oid) { Check "POST" "/sales/refunds" @{ orderId=$oid; amount=10; reason="smoke" } $tok 201 | Out-Null }

Write-Host "`n=== bookings ===" -ForegroundColor Cyan
$res = Check "POST" "/bookings/resources" @{ name="Smoke Room"; type="room"; capacity=4; metadata="Room 3B" } $tok 201
$resId = Id $res "resource"
if ($resId) {
  $b = Check "POST" "/bookings" @{ resourceId=$resId; title="Smoke Booking"; startAt="2026-11-01T10:00:00Z"; endAt="2026-11-01T11:00:00Z" } $tok 201
  $bid = Id $b "booking"
  if ($bid) { Check "PATCH" "/bookings/$bid/status" @{ status="confirmed" } $tok | Out-Null }
}

Write-Host "`n=== accounting ===" -ForegroundColor Cyan
$accs = Check "GET" "/accounting/accounts" $null $tok
$alist = List $accs "accounts"
Write-Host ("   chart of accounts: {0} entries" -f $alist.Count) -ForegroundColor DarkGray
if ($alist.Count -ge 2) {
  Check "POST" "/accounting/journal-entries" @{ entryDate="2026-10-20"; description="Smoke entry"; lines=@(@{ accountId=$alist[0].id; debit=100; credit=0; memo="dr" }, @{ accountId=$alist[1].id; debit=0; credit=100; memo="cr" }) } $tok 201 | Out-Null
  Check "POST" "/accounting/journal-entries" @{ entryDate="2026-10-20"; lines=@(@{ accountId=$alist[0].id; debit=100; credit=0 }) } $tok 400 | Out-Null
}
Check "POST" "/accounting/accounts" @{ code="9$stamp"; name="Smoke Account"; type="expense" } $tok 201 | Out-Null
Check "POST" "/accounting/budgets" @{ name="Smoke Budget"; fiscalYear=2026; allocatedAmount=1000 } $tok 201 | Out-Null
Check "POST" "/accounting/tax-rates" @{ name="Smoke VAT"; rate=20 } $tok 201 | Out-Null

Write-Host "`n=== hr ===" -ForegroundColor Cyan
Check "POST" "/hr/leave-types" @{ name="Smoke Leave $stamp"; defaultDaysPerYear=20 } $tok 201 | Out-Null
$lt = Check "GET" "/hr/leave-types" $null $tok
$lts = List $lt "leaveTypes"
$ltId = if ($lts.Count -gt 0) { $lts[0].id } else { $null }
if ($ltId) {
  Check "POST" "/hr/leave-requests" @{ leaveTypeId=$ltId; startDate="2026-12-01"; endDate="2026-12-05"; reason="smoke" } $tok 201 | Out-Null
  Check "POST" "/hr/leave-requests" @{ leaveTypeId=$ltId; startDate="2026-12-05"; endDate="2026-12-01" } $tok 400 | Out-Null
}
$pr = Check "POST" "/hr/payroll/runs" @{ periodLabel="Smoke $stamp"; periodStart="2026-10-01"; periodEnd="2026-10-31" } $tok 201
if ($pr) {
  $run = ($pr | ConvertFrom-Json).data.run
  Write-Host ("   payroll run total_gross = {0}, total_net = {1}" -f $run.total_gross, $run.total_net) -ForegroundColor DarkGray
}
Check "POST" "/hr/recruitment/openings" @{ title="Smoke Role $stamp"; department="Engineering" } $tok 201 | Out-Null
$op = Check "GET" "/hr/recruitment/openings" $null $tok
$ops = List $op "openings"
if ($ops.Count -gt 0) {
  Check "POST" "/hr/recruitment/candidates" @{ jobOpeningId=$ops[0].id; firstName="Jane"; lastName="Doe" } $tok 201 | Out-Null
}

Write-Host "`n=== org / documents / workflows / industries ===" -ForegroundColor Cyan
Check "POST" "/departments" @{ name="Smoke Dept $stamp"; code="SMKD$stamp" } $tok 201 | Out-Null
Check "POST" "/roles" @{ name="Smoke Role $stamp"; description="smoke" } $tok 201 | Out-Null
$doc = Check "POST" "/documents" @{ title="Smoke Doc $stamp"; type="contract" } $tok 201
$did = Id $doc "document"
if ($did) {
  Check "POST" "/documents/$did/request-signature" @{ signerName="Jane Doe"; signerEmail="jane@smoke.test" } $tok 201 | Out-Null
  Check "POST" "/documents/approvals" @{ resourceType="document"; resourceId=$did } $tok 201 | Out-Null
}
Check "POST" "/communication/threads" @{ name="Smoke Thread $stamp" } $tok 201 | Out-Null
Check "POST" "/workflows" @{ name="Smoke Workflow $stamp"; triggerType="manual"; steps=@() } $tok 201 | Out-Null
Check "POST" "/industries/select" @{ industryKey="hotel" } $tok | Out-Null
Check "POST" "/industries/custom" @{ name="Smoke Industry $stamp"; enabledModules=@("crm") } $tok 201 | Out-Null

Write-Host "`n=== admin ===" -ForegroundColor Cyan
Check "GET" "/admin/stats" $null $adminTok | Out-Null
Check "GET" "/admin/tenants" $null $adminTok | Out-Null

Write-Host "`n=== PASS: $pass   FAIL: $fail ===" -ForegroundColor Cyan
