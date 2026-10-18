export function isArticleVerified(review) {
  const kind = review?.verificationKind ?? 'industrial';
  if (kind === 'software') return review?.applicationVerified === true;
  if (kind === 'industrial') {
    const authorAttestedHardware =
      review?.hardwareVerified === true &&
      review?.verificationSource === 'author-attestation' &&
      Array.isArray(review?.verifiedHardware) &&
      review.verifiedHardware.length > 0 &&
      review.verifiedHardware.every(
        (item) => typeof item === 'string' && item.trim(),
      ) &&
      /^\d{4}-\d{2}-\d{2}$/.test(review?.verificationDate ?? '');
    return authorAttestedHardware || review?.simulatorVerified === true;
  }
  return false;
}

export function publicationHolds(hiddenSlugs, policy, ledger) {
  if (typeof policy?.requireVerification !== 'boolean')
    throw new Error('文章公開政策缺少 requireVerification');
  if (
    typeof policy.reason !== 'string' ||
    !policy.reason.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(policy.effectiveDate ?? '')
  )
    throw new Error('文章公開政策缺少理由或生效日期');

  const holds = new Set(hiddenSlugs);
  if (!policy.requireVerification) return holds;

  for (const [slug, review] of Object.entries(ledger.articles ?? {}))
    if (review?.status === 'reviewed-local' && !isArticleVerified(review))
      holds.add(slug);
  return holds;
}
