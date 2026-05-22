import { LibraryTopicPage } from "@/components/library/library-topic-page";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LibraryTopicRoute({ params }: Props) {
  const { slug } = await params;
  return <LibraryTopicPage slug={slug} />;
}
