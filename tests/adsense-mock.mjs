export const ADSENSE_URL =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8014147345117745';
/** Verify installation without creating ad impressions during automated tests. */
export async function mockAdsense(page) {
  await page.route(
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js*',
    async (route) => {
      if (route.request().url() !== ADSENSE_URL)
        throw new Error('Unexpected AdSense publisher');
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* AdSense mocked for automated verification. */',
      });
    },
  );
}
