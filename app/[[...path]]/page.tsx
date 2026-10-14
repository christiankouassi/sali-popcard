import PopCardApp from "@/components/App";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  return <PopCardApp path={"/" + path.join("/")} />;
}
