const fs = require('fs');
const file = '/Users/sedatsahin/Desktop/KamulogWebYonetim/src/app/(admin)/content/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add BECAYIS_POPUP_KEYS
content = content.replace(
  /const STK_POPUP_KEYS = {[\s\S]*?};\n/,
  `$&
const BECAYIS_POPUP_KEYS = {
  active: "BECAYIS_POPUP_ACTIVE",
  title: "BECAYIS_POPUP_TITLE",
  body: "BECAYIS_POPUP_BODY",
  imageUrl: "BECAYIS_POPUP_IMAGE_URL",
  ctaText: "BECAYIS_POPUP_CTA_TEXT",
  ctaUrl: "BECAYIS_POPUP_CTA_URL",
  showCount: "BECAYIS_POPUP_SHOW_COUNT",
};
`
);

// 2. Add State
content = content.replace(
  /  const \[stkUploading, setStkUploading\] = useState\(false\);\n/,
  `$&
  // ─── Becayis Popup State ───────────────────────────────────────
  const [becayisPopupActive, setBecayisPopupActive] = useState(false);
  const [becayisPopupTitle, setBecayisPopupTitle] = useState("");
  const [becayisPopupBody, setBecayisPopupBody] = useState("");
  const [becayisPopupImageUrl, setBecayisPopupImageUrl] = useState("");
  const [becayisPopupCtaText, setBecayisPopupCtaText] = useState("İncele");
  const [becayisPopupCtaUrl, setBecayisPopupCtaUrl] = useState("");
  const [becayisPopupShowCount, setBecayisPopupShowCount] = useState(1);
  const becayisFileInputRef = useRef<HTMLInputElement>(null);
  const [becayisUploading, setBecayisUploading] = useState(false);
`
);

// 3. Add loadSettings
content = content.replace(
  /      setStkPopupShowCount\(parseInt\(map\[STK_POPUP_KEYS\.showCount\] \|\| "1", 10\) \|\| 1\);\n/,
  `$&
      // Becayis Popup
      setBecayisPopupActive(map[BECAYIS_POPUP_KEYS.active] === "true");
      setBecayisPopupTitle(map[BECAYIS_POPUP_KEYS.title] || "");
      setBecayisPopupBody(map[BECAYIS_POPUP_KEYS.body] || "");
      setBecayisPopupImageUrl(map[BECAYIS_POPUP_KEYS.imageUrl] || "");
      setBecayisPopupCtaText(map[BECAYIS_POPUP_KEYS.ctaText] || "İncele");
      setBecayisPopupCtaUrl(map[BECAYIS_POPUP_KEYS.ctaUrl] || "");
      setBecayisPopupShowCount(parseInt(map[BECAYIS_POPUP_KEYS.showCount] || "1", 10) || 1);
`
);

// 4. Add handleSave
content = content.replace(
  /        { key: STK_POPUP_KEYS\.showCount, value: String\(stkPopupShowCount\) },\n/,
  `$&        { key: BECAYIS_POPUP_KEYS.active, value: String(becayisPopupActive) },
        { key: BECAYIS_POPUP_KEYS.title, value: becayisPopupTitle },
        { key: BECAYIS_POPUP_KEYS.body, value: becayisPopupBody },
        { key: BECAYIS_POPUP_KEYS.imageUrl, value: becayisPopupImageUrl },
        { key: BECAYIS_POPUP_KEYS.ctaText, value: becayisPopupCtaText },
        { key: BECAYIS_POPUP_KEYS.ctaUrl, value: becayisPopupCtaUrl },
        { key: BECAYIS_POPUP_KEYS.showCount, value: String(becayisPopupShowCount) },
`
);

// 5. Add handleBecayisUpload
content = content.replace(
  /  const handleStkUpload = async \([\s\S]*?};\n/,
  `$&
  const handleBecayisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBecayisUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setBecayisPopupImageUrl(data.url);
    } catch (e) {
      console.error("Upload hatası:", e);
    } finally {
      setBecayisUploading(false);
    }
  };
`
);

// 6. Add UI Card
const stkCardRegex = /\{\/\* ═══════════════════════════════════════════════════════\n\s*🛡️ STK \(Dernekler & Sendikalar\) Özel Pop-up\n\s*═══════════════════════════════════════════════════════ \*\/\}[\s\S]*?<\/div>\n      <\/div>\n    <\/div>\n  \);\n}/;

let uiMatch = content.match(stkCardRegex);
if(uiMatch) {
  let becayisCard = uiMatch[0].replace(/STK/g, 'Becayiş').replace(/stk/g, 'becayis').replace(/Stk/g, 'Becayis').replace(/Dernekler & Sendikalar/g, 'Becayiş');
  
  content = content.replace(uiMatch[0], uiMatch[0].replace(/<\/div>\n      <\/div>\n    <\/div>\n  \);\n}/, `</div>\n      </div>\n\n      ` + becayisCard + `\n`));
  // Wait, replacing the end of the file correctly.
  
  // Let's just append becayisCard right before the last </div>
  content = content.replace(uiMatch[0], uiMatch[0] + "\n\n" + becayisCard.replace(/<\/div>\n      <\/div>\n    <\/div>\n  \);\n}/, '</div>\n      </div>'));
} else {
  console.log("Could not match UI");
}

fs.writeFileSync(file, content);
console.log('patched');
