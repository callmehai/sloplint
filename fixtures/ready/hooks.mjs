// --setup module for fixtures/ready: nothing before load; after load, click the tab the hash names.
export default async () => {}

export async function ready({ page, url }) {
  const tab = decodeURIComponent(new URL(url).hash.match(/^#tab=(.+)$/)?.[1] ?? '')
  if (tab) await page.getByRole('tab', { name: tab }).click()
}
