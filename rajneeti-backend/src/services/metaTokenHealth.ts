/**
 * How long the Instagram token has left, asked before anything is published.
 *
 * The setup guide used to recommend a Meta System User token, which never
 * expires. It turns out that route requires a verified business portfolio —
 * and verifying a business purely to avoid a refresh is a bad trade for a
 * one-person channel. So the token is a long-lived one, and long-lived means
 * sixty days.
 *
 * Sixty days is fine. Sixty days that nobody is counting is not: the standard
 * way a Meta integration dies is that the token lapses, posting stops, nothing
 * throws anything a human sees, and it is noticed a fortnight later by
 * accident. That failure is invisible precisely because it looks like "no new
 * posts", which is also what a quiet week looks like.
 *
 * So the publish job asks Meta directly, before it does any work, and refuses
 * to run quietly on a token that is about to lapse.
 */

export interface TokenHealth {
    valid: boolean;
    /** Days remaining, or null when the token genuinely never expires. */
    daysLeft: number | null;
    scopes: string[];
    detail: string;
}

/** Below this, a run fails rather than warns — there is still time to act. */
export const RENEW_WITHIN_DAYS = 14;

/**
 * Asks Meta about a token, using the token itself as the inspector.
 *
 * `debug_token` normally wants an app token, but a long-lived user token can
 * inspect itself, which keeps this to one secret instead of also needing the
 * app id and secret in CI.
 */
export async function checkTokenHealth(token: string): Promise<TokenHealth> {
    const url =
        `https://graph.facebook.com/v21.0/debug_token` +
        `?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const body: any = await res.json().catch(() => ({}));

    if (!res.ok || body?.error) {
        return {
            valid: false,
            daysLeft: null,
            scopes: [],
            detail: body?.error?.message ?? `debug_token returned ${res.status}`,
        };
    }

    const d = body.data ?? {};
    if (d.is_valid === false) {
        return { valid: false, daysLeft: null, scopes: d.scopes ?? [], detail: d.error?.message ?? 'token is not valid' };
    }

    // expires_at of 0 means it does not expire — true for a page token derived
    // from a long-lived user token, and for system user tokens.
    const expiresAt = Number(d.expires_at ?? 0);
    if (!expiresAt) {
        return { valid: true, daysLeft: null, scopes: d.scopes ?? [], detail: 'does not expire' };
    }

    const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / 86_400_000);
    return {
        valid: true,
        daysLeft,
        scopes: d.scopes ?? [],
        detail: `expires ${new Date(expiresAt * 1000).toISOString().slice(0, 10)}`,
    };
}

/**
 * The permissions publishing actually needs. Checked alongside expiry because
 * the other way this dies is a token minted with the wrong boxes ticked, which
 * fails at the publish call with a message that names none of them.
 */
export const REQUIRED_SCOPES = ['instagram_basic', 'instagram_content_publish', 'pages_show_list'];

/** Throws when publishing should not proceed. Returns a line worth logging otherwise. */
export function assertPublishable(health: TokenHealth): string {
    if (!health.valid) {
        throw new Error(
            `[meta] The Instagram token is not valid: ${health.detail}\n` +
                '  Generate a new long-lived token and update IG_TOKEN__MONEY — see docs/instagram-setup.md step 4.',
        );
    }

    const missing = REQUIRED_SCOPES.filter((s) => health.scopes.length && !health.scopes.includes(s));
    if (missing.length) {
        throw new Error(
            `[meta] The token is missing ${missing.join(', ')}, so publishing would fail with an error naming none of them.\n` +
                '  Re-generate it with those boxes ticked — docs/instagram-setup.md step 4.',
        );
    }

    if (health.daysLeft === null) return '[meta] Token valid, does not expire.';

    if (health.daysLeft <= 0) {
        throw new Error(`[meta] The Instagram token expired ${-health.daysLeft} day(s) ago. Renew it before publishing.`);
    }
    if (health.daysLeft <= RENEW_WITHIN_DAYS) {
        // Deliberately fatal rather than a warning. A warning in a log nobody
        // reads is how the token lapses in the first place, and stopping now
        // costs one skipped posting day against weeks of silent nothing.
        throw new Error(
            `[meta] The Instagram token expires in ${health.daysLeft} day(s) — renewing now, while posting still works.\n` +
                '  Two minutes: docs/instagram-setup.md step 4, then update IG_TOKEN__MONEY.',
        );
    }
    return `[meta] Token valid, ${health.daysLeft} day(s) left (${health.detail}).`;
}
