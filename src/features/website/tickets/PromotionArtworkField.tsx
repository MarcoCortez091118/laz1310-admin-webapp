import { WebsiteArtworkField } from "../../media/WebsiteArtworkField";

export function PromotionArtworkField({ url, onChange, title }: {
  url: string; onChange: (url: string) => void; title: string;
}) {
  return <WebsiteArtworkField folder="promotions" url={url} onChange={onChange}
    title={title || "LA Z Website Promotion"} />;
}
