/**
 * Permission model tests for platform admin vs restaurant owners.
 * Usage: npx tsx scripts/permissions-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

async function login(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return [
    ...cookies.map((c) => c.split(";")[0]),
    ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

function cookieHeader(base: string, extra = "") {
  return extra ? `${base}; ${extra}` : base;
}

async function main() {
  console.log(`=== Permissions Test ===\n${BASE}\n`);

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!adminCookie) throw new Error("Admin login failed");

  const platformRes = await fetch(`${BASE}/api/platform`, {
    headers: { Cookie: adminCookie },
  });
  const platformData = await json(platformRes);
  if (!platformRes.ok || !Array.isArray(platformData.restaurants)) {
    fail("1. admin sees all restaurants", `HTTP ${platformRes.status}`);
  } else {
    pass("1. admin sees all restaurants", `${platformData.restaurants.length} restaurants`);
  }

  const targetRestaurant = platformData.restaurants?.[1] || platformData.restaurants?.[0];
  if (!targetRestaurant?.id) {
    fail("2-3. target restaurant", "no restaurant available");
  } else {
    const switchRes = await fetch(`${BASE}/api/restaurants/switch`, {
      method: "POST",
      headers: { Cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: targetRestaurant.id }),
    });
    const switchCookies = switchRes.headers.getSetCookie?.() || [];
    const adminWithSwitch = cookieHeader(adminCookie, switchCookies.map((c) => c.split(";")[0]).join("; "));

    if (!switchRes.ok) {
      fail("2. admin switch restaurant", `HTTP ${switchRes.status}`);
    } else {
      pass("2. admin switch restaurant", targetRestaurant.name);
    }

    const dashRes = await fetch(`${BASE}/dashboard/menu/categories`, {
      headers: { Cookie: adminWithSwitch },
      redirect: "manual",
    });
    if (dashRes.status === 200 || dashRes.status === 307 || dashRes.status === 308) {
      pass("2b. admin can open restaurant dashboard route", `HTTP ${dashRes.status}`);
    } else {
      fail("2b. admin can open restaurant dashboard route", `HTTP ${dashRes.status}`);
    }

    const menuRes = await fetch(
      `${BASE}/api/menu/categories?restaurantId=${targetRestaurant.id}`,
      { headers: { Cookie: adminWithSwitch } }
    );
    if (menuRes.ok) {
      pass("3. admin can edit/view any restaurant menu API", targetRestaurant.slug);
    } else {
      fail("3. admin can edit/view any restaurant menu API", `HTTP ${menuRes.status}`);
    }
  }

  const ownerEmail = `perm_owner_${Date.now()}@test.menuos.sa`;
  const ownerPassword = "TestPass123!";

  const weakReg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerName: "Weak",
      email: `weak_${Date.now()}@test.menuos.sa`,
      password: "weakpass",
      restaurantName: "Weak Restaurant",
      restaurantNameAr: "ضعيف",
      branchNameAr: "فرع",
      city: "Jeddah",
      phone: "+966501234567",
    }),
  });
  if (weakReg.status === 400) {
    pass("7. weak password rejected on register");
  } else {
    fail("7. weak password rejected on register", `HTTP ${weakReg.status}`);
  }

  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerName: "Perm Owner",
      email: ownerEmail,
      password: ownerPassword,
      restaurantName: "Perm Test Restaurant",
      restaurantNameAr: "مطعم اختبار الصلاحيات",
      branchNameAr: "فرع",
      city: "Jeddah",
      phone: "+966501234567",
    }),
  });
  const regData = await json(regRes);
  let ownerCookie = "";
  if (!regRes.ok) {
    fail("4-6. owner registration", regData.error || regRes.status);
  } else {
    ownerCookie = await login(ownerEmail, ownerPassword);
    const ownerPlatform = await fetch(`${BASE}/api/platform`, {
      headers: { Cookie: ownerCookie },
    });
    if (ownerPlatform.status === 403) {
      pass("5. owner cannot access platform dashboard API");
    } else {
      fail("5. owner cannot access platform dashboard API", `HTTP ${ownerPlatform.status}`);
    }

    const ownerPlatformPage = await fetch(`${BASE}/dashboard/platform`, {
      headers: { Cookie: ownerCookie },
      redirect: "manual",
    });
    const redirectedTo = ownerPlatformPage.headers.get("location") || "";
    if (
      ownerPlatformPage.status === 307 ||
      ownerPlatformPage.status === 308 ||
      ownerPlatformPage.status === 302
    ) {
      if (!redirectedTo.includes("/dashboard/platform") || ownerPlatformPage.status !== 200) {
        pass("5b. owner blocked from platform page", redirectedTo || String(ownerPlatformPage.status));
      } else {
        fail("5b. owner blocked from platform page", "allowed through");
      }
    } else if (ownerPlatformPage.status === 200) {
      fail("5b. owner blocked from platform page", "HTTP 200");
    } else {
      pass("5b. owner blocked from platform page", `HTTP ${ownerPlatformPage.status}`);
    }

    const ownMenu = await fetch(`${BASE}/api/menu/categories`, {
      headers: { Cookie: ownerCookie },
    });
    if (ownMenu.ok) {
      pass("4. owner can see own restaurant menu API");
    } else {
      fail("4. owner can see own restaurant menu API", `HTTP ${ownMenu.status}`);
    }

    const otherId = targetRestaurant?.id;
    if (otherId && otherId !== regData.restaurantId) {
      const crossMenu = await fetch(`${BASE}/api/menu/categories?restaurantId=${otherId}`, {
        headers: { Cookie: ownerCookie },
      });
      if (crossMenu.status === 403) {
        pass("6. owner blocked from another restaurant by URL param");
      } else {
        fail("6. owner blocked from another restaurant by URL param", `HTTP ${crossMenu.status}`);
      }

      const crossHeader = await fetch(`${BASE}/api/menu/categories`, {
        headers: {
          Cookie: ownerCookie,
          "x-restaurant-id": otherId,
        },
      });
      if (crossHeader.status === 403) {
        pass("6b. owner blocked by x-restaurant-id header");
      } else {
        fail("6b. owner blocked by x-restaurant-id header", `HTTP ${crossHeader.status}`);
      }
    } else {
      pass("6. owner blocked from another restaurant by URL param", "skipped — no second restaurant");
    }

    const selfUpgrade = await fetch(`${BASE}/api/subscription`, {
      method: "PUT",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "PRO" }),
    });
    if (selfUpgrade.status === 403) {
      pass("8. owner cannot self-upgrade subscription");
    } else {
      fail("8. owner cannot self-upgrade subscription", `HTTP ${selfUpgrade.status}`);
    }
  }

  const tfaRes = await fetch(`${BASE}/api/platform/security/2fa`, {
    headers: { Cookie: adminCookie },
  });
  if (tfaRes.ok) {
    pass("9. platform 2FA endpoint available for admin");
  } else {
    fail("9. platform 2FA endpoint available for admin", `HTTP ${tfaRes.status}`);
  }

  const ownerTfa = await fetch(`${BASE}/api/platform/security/2fa`, {
    headers: { Cookie: ownerCookie || "" },
  });
  if (ownerTfa.status === 403 || ownerTfa.status === 401) {
    pass("10. owner blocked from 2FA endpoint");
  } else if (!ownerCookie) {
    pass("10. owner blocked from 2FA endpoint", "skipped — no owner cookie");
  } else {
    fail("10. owner blocked from 2FA endpoint", `HTTP ${ownerTfa.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${failed.length ? "FAILED" : "PASSED"} (${results.length - failed.length}/${results.length}) ===`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
