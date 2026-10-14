import { WebsiteArtworkField } from "../../media/WebsiteArtworkField";

export function WebsiteBannerMediaControls({
  onChoose, description, currentUrl = "",
}: {
  onChoose: (url: string) => void;
  description: string;
  currentUrl?: string;
}) {
  return <WebsiteArtworkField folder="banners" url={currentUrl}
    onChange={onChoose} title={description} />;
}
