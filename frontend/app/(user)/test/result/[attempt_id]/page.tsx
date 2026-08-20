import AttemptResultClient from "./AttemptResultClient";

type PageProps = {
  params: { attempt_id: string };
  searchParams: {
    paper_id?: string;
    subject_name?: string;
    subject_code?: string;
    year?: string;
  };
};

export default function AttemptResultPage({ params, searchParams }: PageProps) {
  return <AttemptResultClient attemptId={params.attempt_id} paperMeta={searchParams} />;
}
