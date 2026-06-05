import STKSidebar from "@/components/layout/STKSidebar";
import STKHeader from "@/components/layout/STKHeader";

export default function STKPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#FAFBFE" }}>
      <STKSidebar />
      <div className="ml-[280px] transition-all duration-500">
        <STKHeader />
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
