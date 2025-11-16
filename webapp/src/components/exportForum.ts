export function exportForumAsJSON(forumId: string, threads: any[]) {
  const data = {
    forumId,
    exportedAt: new Date().toISOString(),
    threads
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forum-${forumId}.json`;
  a.click();
}