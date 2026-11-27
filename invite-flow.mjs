// URL state identifies a trip only. Never derive the sign-in email from a URL.
export function readInviteTrip(input, depth = 0) {
  if (depth > 3) return null;
  let url;
  try { url = new URL(input); } catch { return null; }
  const trip = url.searchParams.get('trip');
  if (trip && /^[A-Za-z0-9]{20}$/.test(trip)) return trip;
  for (const key of ['continueUrl','link']) {
    const nested = readInviteTrip(url.searchParams.get(key),depth + 1);
    if (nested) return nested;
  }
  return null;
}
export function inviteError(code) {
  return ({
    'auth/invalid-email':'Enter the exact email address that received this invitation. Check the address inside the email message.',
    'auth/invalid-credential':'The email address or invitation link does not match. Use the address that received this email and the newest link, or choose password sign-in below.',
    'auth/invalid-action-code':'This link is invalid, expired or already used. Request a fresh sign-in email below, or use password sign-in.',
    'auth/expired-action-code':'This invitation link has expired. Request a fresh sign-in email below.',
    'auth/missing-email':'Enter the email address that received the invitation.',
    'auth/user-disabled':'This account is disabled. Contact the trip organizer.',
    'auth/network-request-failed':'Firebase could not be reached. Check your connection and retry. Your form is still here.',
    'auth/web-storage-unsupported':'This browser cannot keep a sign-in session. Open this link in your regular browser and allow site storage.',
    'auth/too-many-requests':'Firebase has limited email requests. Wait before retrying, or use password sign-in.',
    'auth/quota-exceeded':'The free email quota was reached. Use password sign-in or ask the organizer for the copyable website invite link.',
    'invite/not-found':'This account has no pending invitation for this trip. Sign in with the address your organizer invited, or ask them for a new invitation.',
    'invite/already-claimed':'This invitation has already been joined by a different account. Ask your organizer to check the member list.'
  })[code];
}
export function validCheckpoint(value, tripId, uid, now = Date.now()) {
  return Boolean(value && value.tripId === tripId && value.uid === uid && Number.isFinite(value.at)
    && value.at <= now && now - value.at < 3600000);
}
