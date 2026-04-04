import { getCurrentUser } from "@/actions/auth";
import { listRepos as listGitLabRepos } from "@/actions/gitlab";
import { listRepos as listGitHubRepos } from "@/actions/github";
import SetupForm from "@/app/_components/SetupForm";
import { Header } from "@/app/_components/Header";
import { GeneratePage } from "@/app/_components/Generate";
import type { Project } from "@/lib/types";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) return <SetupForm />;

  let projects: Project[] = [];
  const listRepos = user.provider === "github" ? listGitHubRepos : listGitLabRepos;
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
