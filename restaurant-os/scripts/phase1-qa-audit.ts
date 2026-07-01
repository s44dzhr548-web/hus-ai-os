/**
 * Phase 1 QA audit — full platform feature verification.
 * Usage: npx tsx scripts/phase1-qa-audit.ts [baseUrl]
 */
const BASE = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

interface Result {
  area: string;
  name: string;
  ok: boolean;
  detail?: string;
}

const results: Result[] = [];

function record(area: string, name: string, ok: boolean, detail?: string) {
  results.push({ area, name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

async function login(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body,
    redirect: "manual",
  });

  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  if (!sessionCookie) throw new Error(`Login failed HTTP ${loginRes.status}`);
  return sessionCookie;
}

function authHeaders(cookie: string, contentType = "application/json") {
  return { Cookie: cookie, "Content-Type": contentType } as Record<string, string>;
}

// Minimal 1x1 PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const FAKE_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x6d, 0x70, 0x34, 0x31,
]);

const FAKE_MOV = Buffer.from([
  0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
  0x6d, 0x70, 0x34, 0x31,
]);

const FAKE_WEBM = Buffer.from([
  0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x86, 0x81, 0x01,
]);

async function uploadFile(
  cookie: string,
  file: Blob,
  filename: string,
  type: "image" | "video"
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const form = new FormData();
  form.append("file", file, filename);
  form.append("type", type);
  const r = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await json(r);
  return { ok: r.ok && !!data.url, url: data.url, error: data.error };
}

async function saveCategoryMedia(
  cookie: string,
  id: string,
  mediaType: "IMAGE" | "VIDEO",
  url: string,
  kind: "image" | "video"
) {
  const body =
    kind === "video"
      ? { id, mediaType: "VIDEO", videoUrl: url, previewUrl: url, layout: "VIDEO_FIRST" }
      : { id, mediaType: "IMAGE", imageUrl: url, previewUrl: url, layout: "IMAGE_FIRST" };
  const r = await fetch(`${BASE}/api/menu/categories`, {
    method: "PUT",
    headers: authHeaders(cookie),
    body: JSON.stringify(body),
  });
  const data = await json(r);
  return { ok: r.ok, data };
}

async function saveProductMedia(
  cookie: string,
  categoryId: string,
  mediaType: "IMAGE" | "VIDEO",
  url: string,
  kind: "image" | "video",
  itemId?: string
) {
  const media =
    kind === "video"
      ? { mediaType: "VIDEO", videoUrl: url, previewUrl: url }
      : { mediaType: "IMAGE", imageUrl: url, previewUrl: url };
  const payload = itemId
    ? { id: itemId, ...media }
    : { categoryId, nameAr: `منتج ${kind} QA`, price: 10, ...media };
  const r = await fetch(`${BASE}/api/menu/items`, {
    method: itemId ? "PUT" : "POST",
    headers: authHeaders(cookie),
    body: JSON.stringify(payload),
  });
  const data = await json(r);
  return { ok: r.ok, data };
}

async function main() {
  console.log(`=== Menu OS Phase 1 QA Audit ===`);
  console.log(`Target: ${BASE}\n`);

  // --- Public pages ---
  for (const [area, path] of [
    ["Pages", "/"],
    ["Pages", "/login"],
    ["Pages", "/dashboard/platform"],
    ["Pages", "/dashboard/branding"],
    ["Pages", "/dashboard/kitchen"],
    ["Pages", "/dashboard/tables"],
    ["Pages", "/dashboard/menu/categories"],
  ] as const) {
    try {
      const r = await fetch(`${BASE}${path}`, { redirect: "manual" });
      const ok = r.status === 200 || r.status === 307 || r.status === 308;
      record(area, `GET ${path}`, ok, `HTTP ${r.status}`);
    } catch (e) {
      record(area, `GET ${path}`, false, String(e));
    }
  }

  // --- Platform admin: create restaurant ---
  let adminCookie = "";
  try {
    adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    record("Owner Account", "Platform admin login", true);
  } catch (e) {
    record("Owner Account", "Platform admin login", false, String(e));
  }

  let platformRestaurantId = "";
  let platformOwnerEmail = "";
  let platformOwnerPassword = "";
  if (adminCookie) {
    try {
      const email = `qa_phase1_${Date.now()}@menuos.sa`;
      const r = await fetch(`${BASE}/api/platform`, {
        method: "POST",
        headers: authHeaders(adminCookie),
        body: JSON.stringify({
          restaurantName: "QA Phase1 Restaurant",
          restaurantNameAr: "مطعم المرحلة الأولى",
          ownerName: "QA Owner",
          ownerEmail: email,
          phone: "+966501234567",
          plan: "PRO",
          trialDays: 30,
        }),
      });
      const data = await json(r);
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      platformRestaurantId = data.restaurantId;
      platformOwnerEmail = data.ownerEmail;
      platformOwnerPassword = data.tempPassword;
      record("Create Restaurant", "Platform POST /api/platform", true, `verified=${data.loginVerified}, id=${data.restaurantId?.slice(0, 8)}`);
      record("Owner Account", "Auto-create owner", !!data.ownerEmail && !!data.tempPassword, data.ownerEmail);
      record("Owner Account", "Login verified on create", data.loginVerified === true, data.role || "OWNER");
      record("Branches", "Default branch created", !!data.branchId, data.branchId?.slice(0, 8));
    } catch (e) {
      record("Create Restaurant", "Platform POST /api/platform", false, String(e));
    }

    try {
      const r = await fetch(`${BASE}/api/platform`, { headers: authHeaders(adminCookie) });
      const data = await json(r);
      const found = data.restaurants?.some((x: { id: string }) => x.id === platformRestaurantId);
      record("Create Restaurant", "Restaurant in platform list", !!found, `${data.restaurants?.length ?? 0} total`);
    } catch (e) {
      record("Create Restaurant", "Restaurant in platform list", false, String(e));
    }
  }

  // --- Owner flow ---
  let ownerCookie = "";
  if (platformOwnerEmail && platformOwnerPassword) {
    try {
      ownerCookie = await login(platformOwnerEmail, platformOwnerPassword);
      record("Owner Account", "New owner login", true, platformOwnerEmail);
    } catch (e) {
      record("Owner Account", "New owner login", false, String(e));
    }

    // Owner management
    if (adminCookie && platformRestaurantId) {
      try {
        const r = await fetch(`${BASE}/api/platform/restaurants/${platformRestaurantId}`, {
          headers: authHeaders(adminCookie),
        });
        const details = await json(r);
        record(
          "Owner Account",
          "Owner details API",
          r.ok && !!details.links?.menuUrl && details.owner?.role === "OWNER",
          details.links?.qrUrl?.slice(0, 40)
        );
      } catch (e) {
        record("Owner Account", "Owner details API", false, String(e));
      }

      try {
        const r = await fetch(`${BASE}/api/platform/restaurants/${platformRestaurantId}/impersonate`, {
          method: "POST",
          headers: authHeaders(adminCookie),
        });
        const data = await json(r);
        record("Owner Account", "Impersonate token", r.ok && !!data.token);
      } catch (e) {
        record("Owner Account", "Impersonate token", false, String(e));
      }
      try {
        const r = await fetch(`${BASE}/api/platform/verify-owner`, {
          method: "POST",
          headers: authHeaders(adminCookie),
          body: JSON.stringify({
            email: platformOwnerEmail,
            password: platformOwnerPassword,
          }),
        });
        const data = await json(r);
        record(
          "Owner Account",
          "Verify owner credentials API",
          r.ok && data.ok && data.role === "OWNER",
          data.restaurantName
        );
      } catch (e) {
        record("Owner Account", "Verify owner credentials API", false, String(e));
      }

      // Reset password and verify new password works
      try {
        const resetRes = await fetch(
          `${BASE}/api/platform/restaurants/${platformRestaurantId}/reset-password`,
          { method: "POST", headers: authHeaders(adminCookie) }
        );
        const resetData = await json(resetRes);
        if (!resetRes.ok || !resetData.tempPassword) throw new Error(resetData.error || "reset failed");

        const verifyRes = await fetch(`${BASE}/api/platform/verify-owner`, {
          method: "POST",
          headers: authHeaders(adminCookie),
          body: JSON.stringify({
            email: platformOwnerEmail,
            password: resetData.tempPassword,
          }),
        });
        const verifyData = await json(verifyRes);
        record(
          "Owner Account",
          "Reset password works",
          verifyRes.ok && verifyData.ok,
          "new password verified"
        );

        // Re-login with reset password for remaining owner tests
        ownerCookie = await login(platformOwnerEmail, resetData.tempPassword);
        platformOwnerPassword = resetData.tempPassword;
        record("Owner Account", "Login after reset password", true, platformOwnerEmail);
      } catch (e) {
        record("Owner Account", "Reset password works", false, String(e));
      }
    }

    if (ownerCookie) {
      try {
        const sess = await fetch(`${BASE}/api/auth/session`, {
          headers: { Cookie: ownerCookie },
        }).then((r) => r.json());
        record(
          "Owner Account",
          "Owner dashboard session",
          !!sess?.user?.restaurantId && sess?.user?.role === "OWNER",
          sess?.user?.restaurantName
        );
      } catch (e) {
        record("Owner Account", "Owner dashboard session", false, String(e));
      }
    }
  }

  let branchId = "";
  let categoryId = "";
  let tableId = "";
  if (ownerCookie) {
    // Branches
    try {
      const r = await fetch(`${BASE}/api/branches`, { headers: authHeaders(ownerCookie) });
      const data = await json(r);
      if (!r.ok || !Array.isArray(data) || data.length === 0) throw new Error("No branches");
      branchId = data[0].id;
      record("Branches", "List branches", true, `${data.length} branch(es)`);
    } catch (e) {
      record("Branches", "List branches", false, String(e));
    }

    try {
      const r = await fetch(`${BASE}/api/branches`, {
        method: "POST",
        headers: authHeaders(ownerCookie),
        body: JSON.stringify({ nameAr: "فرع ثانوي", nameEn: "Second Branch", city: "جدة" }),
      });
      const data = await json(r);
      record("Branches", "Create branch", r.ok, r.ok ? data.id?.slice(0, 8) : data.error);
    } catch (e) {
      record("Branches", "Create branch", false, String(e));
    }

    // Menu sections
    try {
      const r = await fetch(`${BASE}/api/menu/categories`, {
        method: "POST",
        headers: authHeaders(ownerCookie),
        body: JSON.stringify({ nameAr: "قسم QA", nameEn: "QA Section" }),
      });
      const data = await json(r);
      if (!r.ok) throw new Error(data.error);
      categoryId = data.id;
      record("Menu", "Create main section", true, categoryId.slice(0, 8));
    } catch (e) {
      record("Menu", "Create main section", false, String(e));
    }

    let subCategoryId = "";
    if (categoryId) {
      try {
        const r = await fetch(`${BASE}/api/menu/categories`, {
          method: "POST",
          headers: authHeaders(ownerCookie),
          body: JSON.stringify({
            nameAr: "قسم فرعي QA",
            nameEn: "QA Subsection",
            parentId: categoryId,
          }),
        });
        const data = await json(r);
        if (!r.ok) throw new Error(data.error);
        subCategoryId = data.id;
        record("Menu", "Create sub-section", true, subCategoryId.slice(0, 8));
      } catch (e) {
        record("Menu", "Create sub-section", false, String(e));
      }
    }

    if (categoryId) {
      try {
        const r = await fetch(`${BASE}/api/menu/categories`, {
          method: "PUT",
          headers: authHeaders(ownerCookie),
          body: JSON.stringify({
            id: categoryId,
            color: "#e11d48",
            icon: "🍕",
            layout: "GRID",
          }),
        });
        const data = await json(r);
        record(
          "Menu",
          "Customize section (color/layout)",
          r.ok && data.layout === "GRID" && data.color === "#e11d48",
          data.layout
        );
      } catch (e) {
        record("Menu", "Customize section", false, String(e));
      }
    }

    let uploadedImageUrl = "";
    let uploadedVideoUrl = "";

    // Branding
    try {
      const r = await fetch(`${BASE}/api/restaurants/branding`, {
        method: "PUT",
        headers: authHeaders(ownerCookie),
        body: JSON.stringify({
          primaryColor: "#1d4ed8",
          secondaryColor: "#1e3a8a",
          backgroundColor: "#eff6ff",
          buttonColor: "#2563eb",
          textColor: "#1e293b",
          categoryColor: "#dc2626",
        }),
      });
      const data = await json(r);
      record(
        "Branding",
        "Save branding colors",
        r.ok && data.primaryColor === "#1d4ed8" && data.categoryColor === "#dc2626",
        data.primaryColor
      );
    } catch (e) {
      record("Branding", "Save branding colors", false, String(e));
    }

    // Image upload
    try {
      const form = new FormData();
      form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "qa-test.png");
      form.append("type", "image");
      const r = await fetch(`${BASE}/api/upload`, {
        method: "POST",
        headers: { Cookie: ownerCookie },
        body: form,
      });
      const data = await json(r);
      if (!r.ok || !data.url) throw new Error(data.error || `HTTP ${r.status}`);
      uploadedImageUrl = data.url;
      record("Image Upload", "POST /api/upload (image)", true, data.url.slice(0, 60));

      // Apply logo via branding
      const br = await fetch(`${BASE}/api/restaurants/branding`, {
        method: "PUT",
        headers: authHeaders(ownerCookie),
        body: JSON.stringify({ logoUrl: data.url }),
      });
      record("Branding", "Logo from upload", br.ok);
    } catch (e) {
      record("Image Upload", "POST /api/upload (image)", false, String(e));
    }

    // Video upload
    try {
      const cfg = await fetch(`${BASE}/api/upload/config`).then((r) => r.json());
      record(
        "Video Upload",
        "Upload mode",
        true,
        cfg.directBlobUpload
          ? "blob-direct (iPhone + desktop)"
          : "form-fallback — add Vercel Blob or R2 for videos >4MB"
      );

      const fakeMp4 = FAKE_MP4;
      const form = new FormData();
      form.append("file", new Blob([fakeMp4], { type: "video/mp4" }), "qa-test.mp4");
      form.append("type", "video");
      const r = await fetch(`${BASE}/api/upload`, {
        method: "POST",
        headers: { Cookie: ownerCookie },
        body: form,
      });
      const data = await json(r);
      uploadedVideoUrl = r.ok ? data.url : "";
      record(
        "Video Upload",
        "POST /api/upload (video)",
        r.ok && !!data.url,
        r.ok ? data.url.slice(0, 70) : data.error || `HTTP ${r.status}`
      );

      if (uploadedVideoUrl) {
        const probe = await fetch(uploadedVideoUrl, { method: "GET" });
        const ct = probe.headers.get("content-type") || "";
        record(
          "Video Upload",
          "Public video URL playable",
          probe.ok && ct.includes("video"),
          `${probe.status} ${ct.split(";")[0]}`
        );
      }
    } catch (e) {
      record("Video Upload", "POST /api/upload (video)", false, String(e));
    }

    let matrixProductId = "";

    // Unified media matrix — image + mp4 + mov + webm on all section types
    if (ownerCookie && categoryId && subCategoryId) {
      const matrix: {
        label: string;
        file: Blob;
        filename: string;
        type: "image" | "video";
        target: "section" | "subsection" | "product";
      }[] = [
        {
          label: "image→main section",
          file: new Blob([TINY_PNG], { type: "image/png" }),
          filename: "section.png",
          type: "image",
          target: "section",
        },
        {
          label: "mp4→main section",
          file: new Blob([FAKE_MP4], { type: "video/mp4" }),
          filename: "section.mp4",
          type: "video",
          target: "section",
        },
        {
          label: "mov→subsection (iPhone)",
          file: new Blob([FAKE_MOV], { type: "video/quicktime" }),
          filename: "IMG_1234.MOV",
          type: "video",
          target: "subsection",
        },
        {
          label: "webm→subsection",
          file: new Blob([FAKE_WEBM], { type: "video/webm" }),
          filename: "section.webm",
          type: "video",
          target: "subsection",
        },
        {
          label: "image→product",
          file: new Blob([TINY_PNG], { type: "image/png" }),
          filename: "product.png",
          type: "image",
          target: "product",
        },
        {
          label: "mp4→product",
          file: new Blob([FAKE_MP4], { type: "video/mp4" }),
          filename: "product.mp4",
          type: "video",
          target: "product",
        },
      ];

      for (const row of matrix) {
        try {
          const up = await uploadFile(ownerCookie, row.file, row.filename, row.type);
          if (!up.ok || !up.url) {
            record("Media Matrix", row.label, false, up.error || "upload failed");
            continue;
          }

          let saved = false;
          if (row.target === "section") {
            const res = await saveCategoryMedia(
              ownerCookie,
              categoryId,
              row.type === "video" ? "VIDEO" : "IMAGE",
              up.url,
              row.type
            );
            saved =
              res.ok &&
              res.data.mediaType === (row.type === "video" ? "VIDEO" : "IMAGE") &&
              (row.type === "video" ? res.data.videoUrl === up.url : res.data.imageUrl === up.url);
          } else if (row.target === "subsection") {
            const res = await saveCategoryMedia(
              ownerCookie,
              subCategoryId,
              row.type === "video" ? "VIDEO" : "IMAGE",
              up.url,
              row.type
            );
            saved =
              res.ok &&
              res.data.mediaType === (row.type === "video" ? "VIDEO" : "IMAGE") &&
              !!res.data.previewUrl;
          } else {
            const res = await saveProductMedia(
              ownerCookie,
              categoryId,
              row.type === "video" ? "VIDEO" : "IMAGE",
              up.url,
              row.type,
              matrixProductId || undefined
            );
            if (!matrixProductId && res.ok) matrixProductId = res.data.id;
            saved =
              res.ok &&
              res.data.mediaType === (row.type === "video" ? "VIDEO" : "IMAGE") &&
              !!res.data.previewUrl;
          }

          record("Media Matrix", `${row.label} save+reload`, saved, up.url.slice(0, 50));
        } catch (e) {
          record("Media Matrix", row.label, false, String(e));
        }
      }

      // Gallery upload (image + video)
      try {
        const imgUp = await uploadFile(
          ownerCookie,
          new Blob([TINY_PNG], { type: "image/png" }),
          "gallery.png",
          "image"
        );
        const vidUp = await uploadFile(
          ownerCookie,
          new Blob([FAKE_WEBM], { type: "video/webm" }),
          "gallery.webm",
          "video"
        );
        if (matrixProductId && imgUp.url && vidUp.url) {
          const r = await fetch(`${BASE}/api/menu/items`, {
            method: "PUT",
            headers: authHeaders(ownerCookie),
            body: JSON.stringify({
              id: matrixProductId,
              galleryUrls: [imgUp.url, vidUp.url],
            }),
          });
          const data = await json(r);
          const gallery = Array.isArray(data.galleryUrls) ? data.galleryUrls : [];
          record(
            "Media Matrix",
            "gallery image+video save",
            r.ok && gallery.length === 2,
            `${gallery.length} items`
          );
        }
      } catch (e) {
        record("Media Matrix", "gallery image+video save", false, String(e));
      }
    }

    // Category section video customization
    if (categoryId && uploadedVideoUrl) {
      try {
        const r = await fetch(`${BASE}/api/menu/categories`, {
          method: "PUT",
          headers: authHeaders(ownerCookie),
          body: JSON.stringify({
            id: categoryId,
            videoUrl: uploadedVideoUrl,
            mediaType: "VIDEO",
            layout: "VIDEO_FIRST",
          }),
        });
        const data = await json(r);
        record(
          "Menu Customization",
          "Section video media save",
          r.ok && data.mediaType === "VIDEO" && data.videoUrl === uploadedVideoUrl,
          data.mediaType
        );
      } catch (e) {
        record("Menu Customization", "Section video media save", false, String(e));
      }
    }

    // Tables + QR
    if (branchId) {
      try {
        const r = await fetch(`${BASE}/api/tables`, {
          method: "POST",
          headers: authHeaders(ownerCookie),
          body: JSON.stringify({ branchId, number: 99, label: "QA Table" }),
        });
        const data = await json(r);
        if (!r.ok) throw new Error(data.error);
        tableId = data.id;
        record("Tables", "Create table", true, `#${data.number}`);
      } catch (e) {
        record("Tables", "Create table", false, String(e));
      }
    }

    if (tableId) {
      try {
        const r = await fetch(`${BASE}/api/qr?tableId=${tableId}`, { headers: authHeaders(ownerCookie) });
        const data = await json(r);
        const validUrl =
          !!data.qrDataUrl &&
          (data.menuUrl?.includes("/table/") || data.menuUrl?.includes("/menu/"));
        record("QR Codes", "Generate QR", validUrl, data.menuUrl);
      } catch (e) {
        record("QR Codes", "Generate QR", false, String(e));
      }

      // Menu API branding fields
      try {
        const r = await fetch(`${BASE}/api/public/menu/${tableId}`);
        const data = await json(r);
        const hasBranding =
          data.restaurant?.primaryColor === "#1d4ed8" &&
          data.restaurant?.categoryColor === "#dc2626";
        record("Branding", "Customer menu API branding", hasBranding, data.restaurant?.primaryColor);
        record("Menu", "Customer menu section layout", !!data.categories?.[0]?.layout, data.categories?.[0]?.layout);
        const section = data.categories?.find((c: { id: string }) => c.id === categoryId);
        record(
          "Menu Customization",
          "Customer menu section video",
          section?.mediaType === "VIDEO" && !!section?.videoUrl,
          section?.mediaType || "n/a"
        );
      } catch (e) {
        record("Branding", "Customer menu API", false, String(e));
      }

      // Orders + Kitchen — use matrix video product when available
      if (categoryId) {
        try {
          let checkoutItemId = matrixProductId;

          if (!checkoutItemId) {
            const itemRes = await fetch(`${BASE}/api/menu/items`, {
              method: "POST",
              headers: authHeaders(ownerCookie),
              body: JSON.stringify({
                categoryId,
                nameAr: "منتج QA",
                price: 25,
                isAvailable: true,
                mediaType: uploadedVideoUrl ? "VIDEO" : "IMAGE",
                imageUrl: uploadedVideoUrl ? undefined : uploadedImageUrl || undefined,
                videoUrl: uploadedVideoUrl || undefined,
                previewUrl: uploadedVideoUrl || uploadedImageUrl || undefined,
              }),
            });
            const item = await json(itemRes);
            if (!itemRes.ok) throw new Error(item.error);
            checkoutItemId = item.id;
          }

          const menuCheck = await fetch(`${BASE}/api/public/menu/${tableId}`);
          const menuData = await json(menuCheck);
          const menuItem = menuData.categories
            ?.flatMap((c: { items: { id: string }[]; children: { items: { id: string }[] }[] }) => [
              ...c.items,
              ...c.children.flatMap((s) => s.items),
            ])
            ?.find((i: { id: string }) => i.id === checkoutItemId);
          record(
            "Menu",
            "Product mediaType on customer menu",
            menuItem?.mediaType === "VIDEO" && !!menuItem?.videoUrl,
            menuItem?.mediaType || "n/a"
          );

          const checkout = await fetch(`${BASE}/api/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tableId,
              items: [{ menuItemId: checkoutItemId, quantity: 1 }],
              method: "MADA",
              customerName: "QA Customer",
              customerPhone: "0502222222",
            }),
          });
          const order = await json(checkout);
          if (!checkout.ok) throw new Error(order.error);
          record("Orders", "Checkout creates order", true, `#${order.orderNumber}`);

          const kitchen = await fetch(`${BASE}/api/orders?status=NEW`, {
            headers: authHeaders(ownerCookie),
          });
          const orders = await json(kitchen);
          const hasOrder = Array.isArray(orders) && orders.some((o: { id: string }) => o.id === order.orderId);
          record("Kitchen Screen", "Kitchen API lists NEW orders", hasOrder, `${orders?.length ?? 0} NEW`);

          const update = await fetch(`${BASE}/api/orders`, {
            method: "PUT",
            headers: authHeaders(ownerCookie),
            body: JSON.stringify({ id: order.orderId, status: "PREPARING" }),
          });
          record("Kitchen Screen", "Kitchen status update", update.ok, "NEW → PREPARING");
        } catch (e) {
          record("Orders", "Checkout flow", false, String(e));
        }
      }
    }
  }

  // Slug API branding sync check (demo)
  try {
    const r = await fetch(`${BASE}/api/public/menu/slug/menu-os-demo/menu-os-demo-t1`);
    const data = await json(r);
    const hasFields = !!data.restaurant?.primaryColor && !!data.categories?.[0]?.layout;
    record("Branding", "Slug menu API branding fields", hasFields, hasFields ? "synced" : "missing on prod");
  } catch (e) {
    record("Branding", "Slug menu API", false, String(e));
  }

  // Summary by area
  const areas = [...new Set(results.map((r) => r.area))];
  console.log("\n=== Summary by area ===");
  for (const area of areas) {
    const areaResults = results.filter((r) => r.area === area);
    const passed = areaResults.filter((r) => r.ok).length;
    console.log(`${area}: ${passed}/${areaResults.length}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const pct = Math.round((passed / total) * 100);
  console.log(`\n=== Phase 1 QA: ${passed}/${total} (${pct}%) ===`);

  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
