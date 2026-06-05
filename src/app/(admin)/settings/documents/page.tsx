"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Save,
  Check,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  Redo2,
  Code,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Eye,
  Edit3,
  ChevronDown,
} from "lucide-react";

interface AppDocument {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

// ─── Zengin Metin Editörü ────────────────────────────────────
function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef?.focus();
    // Sync content
    if (editorRef) {
      onChange(editorRef.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef) {
      onChange(editorRef.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt("Bağlantı URL'si girin:", "https://");
    if (url) {
      execCmd("createLink", url);
    }
  };

  const toolbarGroups = [
    {
      items: [
        { icon: Bold, cmd: "bold", title: "Kalın (Ctrl+B)" },
        { icon: Italic, cmd: "italic", title: "İtalik (Ctrl+I)" },
        { icon: Code, cmd: "strikeThrough", title: "Üstü Çizili" },
      ],
    },
    {
      items: [
        { icon: Heading2, cmd: "formatBlock", val: "h2", title: "Başlık (H2)" },
        { icon: Type, cmd: "formatBlock", val: "h3", title: "Alt Başlık (H3)" },
        { icon: List, cmd: "insertUnorderedList", title: "Madde Listesi" },
        { icon: ListOrdered, cmd: "insertOrderedList", title: "Numaralı Liste" },
      ],
    },
    {
      items: [
        { icon: AlignLeft, cmd: "justifyLeft", title: "Sola Hizala" },
        { icon: AlignCenter, cmd: "justifyCenter", title: "Ortala" },
        { icon: AlignRight, cmd: "justifyRight", title: "Sağa Hizala" },
      ],
    },
    {
      items: [
        { icon: LinkIcon, cmd: "link", title: "Bağlantı Ekle" },
        { icon: Undo2, cmd: "undo", title: "Geri Al" },
        { icon: Redo2, cmd: "redo", title: "İleri Al" },
      ],
    },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-1 px-3 py-2"
        style={{
          background: "var(--bg-muted)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {toolbarGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && (
              <div
                className="w-px h-5 mx-1"
                style={{ background: "var(--border)" }}
              />
            )}
            {group.items.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.cmd + (tool.val || "")}
                  type="button"
                  title={tool.title}
                  onClick={() => {
                    if (tool.cmd === "link") {
                      insertLink();
                    } else if (tool.val) {
                      execCmd(tool.cmd, tool.val);
                    } else {
                      execCmd(tool.cmd);
                    }
                  }}
                  className="p-1.5 rounded-lg transition-all hover:scale-105"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: showPreview ? "var(--primary)" : "transparent",
              color: showPreview ? "white" : "var(--text-muted)",
              border: showPreview ? "none" : "1px solid var(--border)",
            }}
          >
            {showPreview ? (
              <><Edit3 className="w-3 h-3" /> Düzenle</>
            ) : (
              <><Eye className="w-3 h-3" /> Önizle</>
            )}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="p-5 min-h-[400px] prose prose-sm max-w-none rich-text-preview"
          style={{ background: "var(--bg-card)", color: "var(--text)" }}
          dangerouslySetInnerHTML={{ __html: value || '<p style="color: var(--text-muted);">İçerik henüz eklenmedi...</p>' }}
        />
      ) : (
        <div
          ref={(el) => {
            if (el && !editorRef) {
              el.innerHTML = value || "";
              setEditorRef(el);
            }
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="p-5 min-h-[400px] outline-none text-sm leading-relaxed rich-text-editor"
          style={{
            background: "var(--bg-card)",
            color: "var(--text)",
          }}
          data-placeholder="Metni buraya yazın veya yapıştırın..."
        />
      )}
    </div>
  );
}

// ─── Sayfa Bileşeni ──────────────────────────────────────────
export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<AppDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/documents");
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
        if (!selectedDoc && data.documents.length > 0) {
          selectDocument(data.documents[0]);
        }
      }
    } catch (e) {
      console.error("Belgeler yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const selectDocument = (doc: AppDocument) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setDropdownOpen(false);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDoc.id,
          title: editTitle,
          content: editContent,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Refresh documents
        const data = await res.json();
        setDocuments((prev) =>
          prev.map((d) => (d.id === data.document.id ? data.document : d))
        );
        setSelectedDoc(data.document);
      }
    } catch (e) {
      console.error("Belge kaydedilemedi:", e);
    } finally {
      setSaving(false);
    }
  };

  const getDocIcon = (slug: string) => {
    switch (slug) {
      case "privacy-policy":
        return "🔒";
      case "terms-of-service":
        return "📜";
      case "mesafeli-satis-sozlesmesi":
        return "🛒";
      case "kvkk":
        return "🛡️";
      default:
        return "📄";
    }
  };

  const getDocLabel = (slug: string) => {
    switch (slug) {
      case "privacy-policy":
        return "Gizlilik Politikası";
      case "terms-of-service":
        return "Kullanıcı Sözleşmesi";
      case "mesafeli-satis-sozlesmesi":
        return "Mesafeli Satış Sözleşmesi";
      case "kvkk":
        return "KVKK Aydınlatma Metni";
      default:
        return slug;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--text)" }}
          >
            <FileText
              className="w-6 h-6"
              style={{ color: "var(--primary)" }}
            />
            Yasal Metinler
          </h2>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Gizlilik politikası ve kullanıcı sözleşmesi içeriklerini yönetin
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Document Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <span>{selectedDoc ? getDocIcon(selectedDoc.slug) : "📄"}</span>
              <span>{selectedDoc ? getDocLabel(selectedDoc.slug) : "Belge Seç"}</span>
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-64 rounded-xl overflow-hidden shadow-xl z-50 animate-scale-in"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => selectDocument(doc)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all"
                    style={{
                      background:
                        selectedDoc?.id === doc.id
                          ? "var(--bg-active)"
                          : "transparent",
                      color:
                        selectedDoc?.id === doc.id
                          ? "var(--primary)"
                          : "var(--text)",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDoc?.id !== doc.id) {
                        e.currentTarget.style.background = "var(--bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDoc?.id !== doc.id) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span className="text-lg">{getDocIcon(doc.slug)}</span>
                    <div>
                      <p className="font-medium">{getDocLabel(doc.slug)}</p>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {doc.content
                          ? `${doc.content.replace(/<[^>]*>/g, "").slice(0, 40)}...`
                          : "İçerik henüz eklenmedi"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !selectedDoc}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" /> Kaydedildi!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Kaydet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-2 gap-3">
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => selectDocument(doc)}
            className="card p-4 text-left transition-all hover:scale-[1.01]"
            style={{
              borderColor:
                selectedDoc?.id === doc.id
                  ? "var(--primary)"
                  : "var(--border)",
              borderWidth: selectedDoc?.id === doc.id ? "2px" : "1px",
              boxShadow:
                selectedDoc?.id === doc.id
                  ? "0 0 20px rgba(66, 153, 225, 0.15)"
                  : "none",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{
                  background:
                    selectedDoc?.id === doc.id
                      ? "var(--primary)"
                      : "var(--bg-muted)",
                }}
              >
                {getDocIcon(doc.slug)}
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {getDocLabel(doc.slug)}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {doc.content
                    ? `${doc.content.replace(/<[^>]*>/g, "").length} karakter`
                    : "Henüz içerik yok"}
                  {doc.updatedAt &&
                    ` · ${new Date(doc.updatedAt).toLocaleDateString("tr-TR")}`}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Editor Section */}
      {selectedDoc && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getDocIcon(selectedDoc.slug)}</span>
            <div className="flex-1">
              <label
                className="text-xs font-semibold block mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Belge Başlığı
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-bold px-3 py-2 rounded-lg"
                style={{
                  background: "var(--bg-muted)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              />
            </div>
          </div>

          <label
            className="text-xs font-semibold block"
            style={{ color: "var(--text-muted)" }}
          >
            İçerik (Zengin Metin)
          </label>
          <RichTextEditor
            key={selectedDoc.id}
            value={editContent}
            onChange={setEditContent}
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Public API:{" "}
              <code
                className="px-2 py-0.5 rounded text-[10px]"
                style={{
                  background: "var(--bg-muted)",
                  color: "var(--primary)",
                }}
              >
                GET /api/public/documents/{selectedDoc.slug}
              </code>
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" /> Kaydedildi!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Değişiklikleri Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Style for rich text editor */}
      <style jsx global>{`
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted);
          pointer-events: none;
        }
        .rich-text-editor h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
        }
        .rich-text-editor h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.8em 0 0.4em;
        }
        .rich-text-editor p {
          margin: 0.5em 0;
        }
        .rich-text-editor ul,
        .rich-text-editor ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        .rich-text-editor li {
          margin: 0.25em 0;
        }
        .rich-text-editor a {
          color: var(--primary);
          text-decoration: underline;
        }
        .rich-text-preview h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
        }
        .rich-text-preview h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.8em 0 0.4em;
        }
        .rich-text-preview p {
          margin: 0.5em 0;
        }
        .rich-text-preview ul,
        .rich-text-preview ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        .rich-text-preview li {
          margin: 0.25em 0;
        }
        .rich-text-preview a {
          color: var(--primary);
          text-decoration: underline;
        }
        .rich-text-preview strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
