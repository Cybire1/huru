import { HuruSurfaceFrame } from "@/components/huru-surface-frame";
import { HuruRequestDetailPanel } from "@/components/huru-request-detail-panel";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  return (
    <HuruSurfaceFrame
      navLinks={[
        { href: "/", label: "Home" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/docs", label: "Docs" },
      ]}
    >
      <HuruRequestDetailPanel requestId={requestId} />
    </HuruSurfaceFrame>
  );
}
