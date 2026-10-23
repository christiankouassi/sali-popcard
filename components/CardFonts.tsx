import { fontCSS } from "@/lib/client-fonts.mjs";
export default function CardFonts({
  data,
  values,
}: {
  data?: any;
  values?: string[];
}) {
  return (
    <style>
      {fontCSS(
        values || [data?.fontTitle, data?.fontBody].filter(Boolean),
        data?.customFonts || [],
      )}
    </style>
  );
}
