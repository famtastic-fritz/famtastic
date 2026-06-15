#!/usr/bin/env python3
"""
GoDaddy Reseller Data Extraction — Direct Playwright v2
Fixed: use domcontentloaded instead of networkidle, longer timeouts,
graceful 2FA handling, more robust selectors.
"""

import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright

# --- Config ---
EXPORT_DIR = Path.home() / "famtastic" / "data" / "godaddy-export"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

GODADDY_LOGIN_URL = "https://sso.godaddy.com/v1/account/authorize?realm=idp&path=%2Fproducts&app=mya"
RESELLER_URL = "https://reseller.godaddy.com"

GODADDY_USER = "nineoo"
GODADDY_PASS = subprocess.check_output(
    ["security", "find-generic-password", "-s", "nineoo", "-w"],
    stderr=subprocess.DEVNULL
).decode().strip()

SCREENSHOT_DIR = EXPORT_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)

# Clean out old JSON from previous run
for old in EXPORT_DIR.glob("*.json"):
    old.unlink(missing_ok=True)


def save_result(name: str, data):
    filepath = EXPORT_DIR / f"{name}.json"
    payload = {
        "extracted_at": datetime.now().isoformat(),
        "source": f"reseller_{name}",
        "method": "playwright_direct_v2",
        "data": data,
    }
    with open(filepath, "w") as f:
        json.dump(payload, f, indent=2, default=str, ensure_ascii=False)
    size = filepath.stat().st_size
    print(f"  📁 {filepath.name}: {size:,} bytes")
    return filepath


async def screenshot(page, name):
    path = SCREENSHOT_DIR / f"{name}.png"
    try:
        await page.screenshot(path=str(path), full_page=True)
        print(f"  📸 {path.name}")
    except Exception as e:
        print(f"  ⚠️ Screenshot failed: {e}")
    return path


async def goto_wait(page, url, name="page"):
    """Navigate with robust waiting."""
    print(f"  🌐 Navigating to {url[:80]}...")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(3000)  # Let JS render
        return True
    except Exception as e:
        print(f"  ⚠️ Navigation issue: {e}")
        # Try just load event
        try:
            await page.goto(url, wait_until="load", timeout=30000)
            await page.wait_for_timeout(3000)
            return True
        except Exception as e2:
            print(f"  ❌ Navigation failed: {e2}")
            await screenshot(page, f"{name}-nav-failed")
            return False


async def login(page):
    """Step 1: Log into GoDaddy SSO."""
    print("\n🔐 STEP 1: Logging into GoDaddy...")
    
    ok = await goto_wait(page, GODADDY_LOGIN_URL, "login")
    if not ok:
        save_result("01-login-state", {"status": "failed", "error": "navigation_timeout"})
        return False
    
    await screenshot(page, "01-login-page")
    
    # Check current state — are we already logged in?
    page_text = (await page.inner_text("body")).lower()
    if "my products" in page_text or "dashboard" in page_text or "reseller" in page_text:
        print("  ✅ Already logged in!")
        save_result("01-login-state", {"status": "already_logged_in", "url": page.url})
        return True
    
    # Fill username — try multiple selectors
    filled_username = False
    for sel in ['input[name="username"]', 'input#username', 'input[type="email"]', 
                'input[name="email"]', 'input[data-testid="usernameInput"]',
                'input[autocomplete="username"]', 'input[autocomplete="email"]']:
        try:
            el = page.locator(sel).first
            if await el.is_visible(timeout=3000):
                await el.fill(GODADDY_USER)
                print(f"  ✅ Filled username via {sel}")
                filled_username = True
                break
        except Exception:
            continue
    
    if not filled_username:
        # Try any visible text input
        inputs = await page.query_selector_all('input[type="text"], input[type="email"], input:not([type])')
        for inp in inputs:
            try:
                if await inp.is_visible():
                    await inp.fill(GODADDY_USER)
                    print("  ✅ Filled username via fallback")
                    filled_username = True
                    break
            except Exception:
                continue
    
    # Some GoDaddy flows have username on one page, then a "Next" button
    next_btn = page.locator('button:has-text("Next"), button:has-text("Continue"), input[type="submit"]')
    try:
        if await next_btn.first.is_visible(timeout=2000):
            await next_btn.first.click()
            await page.wait_for_timeout(2000)
            print("  ✅ Clicked Next after username")
    except Exception:
        pass  # Single-page form, continue
    
    # Fill password
    filled_password = False
    for sel in ['input[name="password"]', 'input#password', 'input[type="password"]']:
        try:
            el = page.locator(sel).first
            if await el.is_visible(timeout=3000):
                await el.fill(GODADDY_PASS)
                print(f"  ✅ Filled password via {sel}")
                filled_password = True
                break
        except Exception:
            continue
    
    await screenshot(page, "02-credentials-filled")
    
    # Click Sign In
    for sel in ['button[type="submit"]', 'button:has-text("Sign In")', 
                'button[data-testid="signInButton"]', '#signInBtn',
                'input[type="submit"]', 'button.btn-primary']:
        try:
            el = page.locator(sel).first
            if await el.is_visible(timeout=3000):
                await el.click()
                print(f"  ✅ Clicked sign in via {sel}")
                break
        except Exception:
            continue
    
    # Wait for navigation
    await page.wait_for_timeout(5000)
    
    # Check for 2FA / CAPTCHA
    await screenshot(page, "03-post-login")
    page_text = (await page.inner_text("body")).lower()
    
    if any(w in page_text for w in ["verification", "two-factor", "2fa", "enter the code", "sms code", "authenticator"]):
        print("\n  ⚠️  ========================================")
        print("  ⚠️  2FA DETECTED — manual intervention needed!")
        print("  ⚠️  Please complete 2FA in the browser window.")
        print("  ⚠️  ========================================\n")
        # Wait up to 2 minutes for user to complete 2FA
        for i in range(24):  # 24 x 5s = 120s
            await page.wait_for_timeout(5000)
            current_text = (await page.inner_text("body")).lower()
            current_url = page.url
            if "my products" in current_text or "dashboard" in current_text or "account" in current_text:
                if "verification" not in current_text and "2fa" not in current_text:
                    print("  ✅ 2FA completed! Logged in.")
                    break
            if "sso" not in current_url:
                print("  ✅ Redirected away from SSO — login likely complete.")
                break
        await screenshot(page, "04-after-2fa")
    
    elif any(w in page_text for w in ["captcha", "recaptcha", "prove you're human"]):
        print("\n  ⚠️  ========================================")
        print("  ⚠️  CAPTCHA DETECTED — manual intervention needed!")
        print("  ⚠️  Please solve the CAPTCHA in the browser window.")
        print("  ⚠️  ========================================\n")
        for i in range(12):  # 12 x 5s = 60s
            await page.wait_for_timeout(5000)
            current_text = (await page.inner_text("body")).lower()
            if "captcha" not in current_text and "recaptcha" not in current_text:
                print("  ✅ CAPTCHA solved!")
                break
    
    # Final state
    current_url = page.url
    page_text = (await page.inner_text("body")).lower()
    logged_in = "products" in page_text or "dashboard" in page_text or "account" in page_text or "sso" not in current_url
    
    await screenshot(page, "05-login-final")
    save_result("01-login-state", {
        "status": "logged_in" if logged_in else "uncertain",
        "url": current_url,
        "title": await page.title(),
        "page_text_preview": page_text[:500],
    })
    return logged_in or "sso" not in current_url  # If not on SSO page, probably logged in


async def extract_section(page, step_num, name, urls, nav_selectors, nav_text_keywords):
    """Generic section extractor — tries direct URLs then nav clicks."""
    print(f"\n📊 STEP {step_num}: Extracting {name}...")
    
    # Try direct URLs first
    for url in urls:
        ok = await goto_wait(page, url, f"step{step_num}-{name}")
        if ok:
            body_text = (await page.inner_text("body")).lower()
            if any(w in body_text for w in nav_text_keywords):
                print(f"  ✅ Found {name} data at {url}")
                break
    else:
        # Try nav clicks from wherever we are
        for sel in nav_selectors:
            try:
                el = page.locator(sel).first
                if await el.is_visible(timeout=3000):
                    await el.click()
                    await page.wait_for_timeout(3000)
                    print(f"  ✅ Clicked nav: {sel}")
                    break
            except Exception:
                continue
    
    await screenshot(page, f"{step_num:02d}-{name}")
    
    # Extract all data
    tables = await page.query_selector_all("table")
    table_data = []
    for i, table in enumerate(tables):
        try:
            text = (await table.inner_text())[:5000]
            rows = await table.query_selector_all("tr")
            table_data.append({"table_index": i, "row_count": len(rows), "text": text})
        except Exception:
            pass
    
    # Get form fields
    form_fields = []
    for selector in ["input", "select", "textarea"]:
        els = await page.query_selector_all(selector)
        for el in els:
            try:
                field = {
                    "tag": await el.evaluate("el => el.tagName.toLowerCase()"),
                    "type": await el.get_attribute("type") or "",
                    "name": await el.get_attribute("name") or "",
                    "id": await el.get_attribute("id") or "",
                    "value": await el.evaluate("el => el.value || ''") or "",
                    "placeholder": await el.get_attribute("placeholder") or "",
                }
                if field["name"] or field["id"]:
                    form_fields.append(field)
            except Exception:
                pass
    
    # Checkboxes / toggles (for enabled/disabled products)
    toggles = []
    for sel in ['input[type="checkbox"]', '[role="switch"]', '.toggle', '.on-off-switch']:
        els = await page.query_selector_all(sel)
        for el in els:
            try:
                toggles.append({
                    "id": await el.get_attribute("id") or "",
                    "name": await el.get_attribute("name") or "",
                    "aria_label": await el.get_attribute("aria-label") or "",
                    "checked": await el.is_checked(),
                })
            except Exception:
                pass
    
    page_text = ""
    try:
        page_text = (await page.inner_text("body"))
    except Exception:
        pass
    
    # Try data export buttons
    export_buttons = []
    for sel in ['button:has-text("Export")', 'a:has-text("Export")', 
                'button:has-text("Download")', 'a:has-text("CSV")',
                'button:has-text("Download CSV")']:
        try:
            count = await page.locator(sel).count()
            if count > 0:
                export_buttons.append(sel)
        except Exception:
            pass
    
    data = {
        "url": page.url,
        "title": await page.title(),
        "tables": table_data,
        "form_fields": form_fields[:50],  # Cap at 50
        "toggles": toggles,
        "export_buttons": export_buttons,
        "page_text_preview": page_text[:10000] if page_text else "",
    }
    
    save_result(f"{step_num:02d}-{name}", data)
    return True


async def run():
    print("=" * 60)
    print("🚀 GoDaddy Reseller Data Extraction — Playwright Direct v2")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            channel="chrome",
        )
        
        context = await browser.new_context(
            viewport={"width": 1400, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        )
        
        page = await context.new_page()
        
        try:
            # STEP 1: Login
            logged_in = await login(page)
            if not logged_in:
                print("  ⚠️ Login uncertain — continuing anyway, may hit auth walls")
            
            # STEP 2: Reseller Dashboard
            await extract_section(page, 2, "dashboard",
                urls=[RESELLER_URL],
                nav_selectors=['a:has-text("Dashboard")', 'a:has-text("Home")'],
                nav_text_keywords=["dashboard", "reseller", "overview", "welcome"]
            )
            
            # STEP 3: Customers
            await extract_section(page, 3, "customers",
                urls=[f"{RESELLER_URL}/customers", f"{RESELLER_URL}/reports/customers"],
                nav_selectors=['a:has-text("Customer")', 'a:has-text("Customers")', 'a:has-text("Sub-accounts")'],
                nav_text_keywords=["customer", "shopper", "sub-account", "account"]
            )
            
            # STEP 4: Orders/Revenue
            await extract_section(page, 4, "orders",
                urls=[f"{RESELLER_URL}/reports/orders", f"{RESELLER_URL}/reports/revenue",
                      f"{RESELLER_URL}/reports/commissions", f"{RESELLER_URL}/financials"],
                nav_selectors=['a:has-text("Orders")', 'a:has-text("Revenue")', 'a:has-text("Commissions")', 'a:has-text("Financials")'],
                nav_text_keywords=["order", "revenue", "commission", "earning", "payout"]
            )
            
            # STEP 5: Products/Pricing
            await extract_section(page, 5, "products-pricing",
                urls=[f"{RESELLER_URL}/products", f"{RESELLER_URL}/settings/pricing",
                      f"{RESELLER_URL}/storefront/products", f"{RESELLER_URL}/manage/products"],
                nav_selectors=['a:has-text("Products")', 'a:has-text("Pricing")', 'a:has-text("Catalog")'],
                nav_text_keywords=["product", "pricing", "catalog", "wholesale", "retail", "enabled", "disabled"]
            )
            
            # STEP 6: Storefront Config
            await extract_section(page, 6, "storefront-config",
                urls=[f"{RESELLER_URL}/settings/storefront", f"{RESELLER_URL}/storefront/settings",
                      f"{RESELLER_URL}/settings/branding", f"{RESELLER_URL}/settings/navigation"],
                nav_selectors=['a:has-text("Storefront")', 'a:has-text("Branding")', 'a:has-text("Navigation")'],
                nav_text_keywords=["storefront", "branding", "navigation", "appearance", "display"]
            )
            
            # STEP 7: Credits/Balance
            await extract_section(page, 7, "credits-balance",
                urls=[f"{RESELLER_URL}/reports/credits", f"{RESELLER_URL}/account/balance",
                      f"{RESELLER_URL}/financials/summary"],
                nav_selectors=['a:has-text("Credits")', 'a:has-text("Balance")', 'a:has-text("Financials")'],
                nav_text_keywords=["credit", "balance", "commission", "payout", "earning"]
            )
            
            # Summary
            print("\n" + "=" * 60)
            print("🎉 EXTRACTION COMPLETE!")
            print("=" * 60)
            print(f"\n📁 Output: {EXPORT_DIR}")
            json_files = sorted(EXPORT_DIR.glob("*.json"))
            for f in json_files:
                print(f"   {f.name}: {f.stat().st_size:,} bytes")
            png_files = sorted(SCREENSHOT_DIR.glob("*.png"))
            print(f"\n📸 Screenshots: {SCREENSHOT_DIR}")
            for f in png_files:
                print(f"   {f.name}")
            print(f"\n✅ {len(json_files)} JSON files + {len(png_files)} screenshots")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await screenshot(page, "error-final")
            save_result("99-error", {"error": str(e), "url": page.url})
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(run())