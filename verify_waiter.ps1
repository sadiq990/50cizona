$ErrorActionPreference = "Stop"

try {
    # 1. Login as Waiter
    $loginUrl = "http://localhost:3000/api/auth/login"
    $body = @{ username = "ofisant"; password = "1234" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $body -ContentType "application/json" -SessionVariable session
    
    if ($response.success) {
        Write-Host "✅ Login Successful"
    } else {
        Write-Error "Login Failed"
    }

    # 2. Try to Access Reports (Should Succeed)
    try {
        $reportUrl = "http://localhost:3000/api/reports/daily"
        $reportData = Invoke-RestMethod -Uri $reportUrl -Method Get -WebSession $session
        if ($reportData.hourly -or $reportData.daily) {
             Write-Host "✅ Waiter can access reports"
        } else {
             Write-Error "Report data empty or invalid format"
        }
    } catch {
        Write-Error "❌ Waiter FAILED to access reports (Status: $($_.Exception.Response.StatusCode))"
    }

    # 3. Try to Create Product (Should Fail - Admin Only)
    try {
        $prodUrl = "http://localhost:3000/api/products"
        $prodBody = @{ name = "Hacker Burger"; price = 0; category = "main" } | ConvertTo-Json
        Invoke-RestMethod -Uri $prodUrl -Method Post -Body $prodBody -ContentType "application/json" -WebSession $session
        Write-Error "❌ Waiter WAS ABLE to create a product (Security Failure!)"
    } catch {
        $status = $_.Exception.Response.StatusCode
        if ($status -eq "Unauthorized" -or $status -eq "Forbidden" -or $status -eq 401 -or $status -eq 403) {
            Write-Host "✅ Waiter blocked from creating products (Status: $status)"
        } else {
            Write-Error "❌ Unexpected error during product creation test: $_"
        }
    }

} catch {
    Write-Error "Test Script Failed: $_"
}
