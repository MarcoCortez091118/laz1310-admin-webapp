import { ProgramsPage } from "./ProgramsPage";
import { StationBootstrap } from "./StationBootstrap";
import { useDraftQuery } from "../content/queries";

export function ProgramsWorkspace() {
  const draft = useDraftQuery();
  const stations = draft.data?.data.catalog?.stations ?? [];
  const etag = draft.data?.etag;

  if (!draft.data || draft.error || draft.isPending || !etag || stations.length > 0) {
    return <ProgramsPage />;
  }

  return (
    <StationBootstrap
      etag={etag}
      onReady={async () => {
        await draft.refetch();
      }}
    />
  );
}
