import { getCurrentUser } from "@/actions/auth";
import { listRepos } from "@/actions/repos";
import SetupForm from "@/app/_components/SetupForm";
import { Header } from "@/app/_components/Header";
import { GeneratePage } from "@/app/_components/Generate";
import type { Project } from "@/types";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) return <SetupForm />;

  let projects: Project[] = [];
  const result = await listRepos();
  if (result.success) {
    projects = result.data;
  } else {
    console.error("[page] Failed to load repositories:", result.error);
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-bg">
      <Header userName={user.name} />
      <GeneratePage projects={projects} provider={user.provider} />
    </div>
  );
}
