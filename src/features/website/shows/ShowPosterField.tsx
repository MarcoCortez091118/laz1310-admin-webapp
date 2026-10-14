import { WebsiteArtworkField } from "../../media/WebsiteArtworkField";

export function ShowPosterField({ url, onChange, title }: {
  url: string; onChange: (url: string) => void; title: string;
}) {
  return <WebsiteArtworkField folder="shows" url={url} onChange={onChange}
    title={title || "LA Z Website Show"} />;
}
